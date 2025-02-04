import { NextApiRequest, NextApiResponse } from "next";
import { NiwaResponse, TransformedNiwaData } from "../../types/niwa";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = await getNiwaData();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).send(err);
  }
}

export const getNiwaData = async () => {
  const niwaKey = process.env.NIWA_API_KEY;
  const niwaSecret = process.env.NIWA_API_SECRET;
  const niwaURL = process.env.NIWA_API_URL;

  if (!niwaKey || !niwaSecret || !niwaURL) {
    throw new Error("Missing environment config data");
  }

  try {
    const niwaRes = await fetch(niwaURL + "?lat=-41.2924&long=174.7787", {
      headers: { "Content-Type": "application/json", "x-apikey": niwaKey },
    });

    if (niwaRes.status !== 200) {
      throw new Error("Bad request to niwa");
    }

    const data = (await niwaRes.json()) as NiwaResponse;

    const transformedData = transformNiwaData(data);

    return transformedData;
  } catch (err) {
    throw new Error(err as string);
  }
};

const transformNiwaData = (data: NiwaResponse): TransformedNiwaData[] => {
  const timeValuePairs = [] as TransformedNiwaData[];

  data.products[0].values.forEach((val) => {
    timeValuePairs.push({
      time: val.time,
      sunny: val.value,
      cloudy: 0,
    });
  });

  data.products[1].values.forEach((val, idx) => {
    timeValuePairs[idx].cloudy = val.value;
  });

  // convert the date to a friendly name for the graph
  timeValuePairs.forEach((val, idx) => {
    const time = timeValuePairs[idx].time;
    const date = new Date(time);
    // need this to be the NZ local time
    timeValuePairs[idx].time = convertTZToNz(date).toTimeString().split(" ")[0];
  });
  // only need the first 24 hours
  return timeValuePairs.slice(0, 96);
};

function convertTZToNz(date: string | Date): Date {
  return new Date(
    (typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {
      timeZone: "Pacific/Auckland",
    })
  );
}
