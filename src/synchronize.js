/*
- Ask alibeez for changes since last cron
- for each change
  - verify the user authorized the app to make the changes
  - refresh the token if needed
  - make the changes
- store the datetime corresponding to the cron start
*/

import fs from "fs";
import { queryLeaves } from "./alibeez-client.js";

const LAST_CRON_FILE_PATH = process.env.LAST_CRON_FILE_PATH;
if (!LAST_CRON_FILE_PATH) {
  throw new Error("ERROR: Missing env variable LAST_CRON_FILE_PATH");
}

const queryLeavesMock = (fields,filters) => {
  const mockData = [{
    uuid: "25c5bfdc-50cc-435d-af15-0638a20d9322",
    userUuid: "89d50865-2497-401e-82f3-d362c3f5394c",
    updateDate: "08/26/2020",
    status: "APPROVED",
    startDate: "08/27/2020",
    startDayTime: "MORNING",
    endDay: "08/29/2020",
    endDayTime: "EVENING"
  }];
  return mockData
}

const getLastCronTime = async (filePath) => {
  if (!filePath) {
    throw new Error("No path provided for last cron time save file");
  }
  try {
    return (await fs.promises.readFile(filePath)).toString();
  } catch (err) {
    return; // in case no file was found return undefined ?
  }
};

export const synchronize = async () => {
  const lastCronTime = await getLastCronTime(LAST_CRON_FILE_PATH);
  const changesSinceLastCron = queryLeavesMock(
    [
      "uuid",
      "userUuid",
      "updateDate",
      "status",
      "startDay",
      "startDayTime",
      "endDay",
      "endDayTime",
    ],
    lastCronTime ? `updateDate>${lastCronTime}` : ""
  );

};
