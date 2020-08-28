/*
- Ask alibeez for changes since last cron
- for each change
  - verify the user authorized the app to make the changes
  - refresh the token if needed
  - make the changes
- store the datetime corresponding to the cron start
*/

import fs from "fs";
import http from "http";
import { exchangeRefreshTokenForAccessToken } from "./google-oauth-client.js";
import { queryLeaves } from "./alibeez-client.js";
import { userService } from "./users/user-service.js";
import { pushToGoogleCalendar } from "./push.js";

const LAST_CRON_FILE_PATH = process.env.LAST_CRON_FILE_PATH;
if (!LAST_CRON_FILE_PATH) {
  throw new Error("ERROR: Missing env variable LAST_CRON_FILE_PATH");
}

const queryLeavesMock = (fields, filters) => {
  const mockData = [
    {
      uuid: "25c5bfdc-50cc-435d-af15-0638a20d9322",
      userUuid: "89d50865-2497-401e-82f3-d362c3f5394c",
      updateDate: "08/26/2020",
      status: "APPROVED",
      startDate: "08/27/2020",
      startDayTime: "MORNING",
      endDay: "08/29/2020",
      endDayTime: "EVENING",
    },
  ];
  return mockData;
};

const getLastCronTime = async (filePath) => {
  if (!filePath) {
    throw new Error("No path provided for last cron time save file");
  }
  try {
    return (await fs.promises.readFile(filePath)).toString().trim();
  } catch (err) {
    return; // in case no file was found return undefined ?
  }
};

const computeDateStringForAlibeez = (dateString) =>
  dateString.slice(0, dateString.length - 2);

export const synchronize = async () => {
  try {
    const lastCronTime = await getLastCronTime(LAST_CRON_FILE_PATH);
    const cronStartTime = new Date();
    const cronStartTimeString = cronStartTime.toISOString();
    const changesSinceLastCron = await queryLeaves(
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
      lastCronTime
        ? [`updateDate>${computeDateStringForAlibeez(lastCronTime)}`]
        : [`updateDate>${computeDateStringForAlibeez(cronStartTimeString)}`]
    );
    for (const leave of changesSinceLastCron.result) {
      try {
        const user = userService.getUserTokenFromAlibeezId(leave.userUuid);
        if (!user) {
          continue;
        }
        const currentDate = new Date();
        const expiration = new Date(user.accessTokenExpiration);
        if (currentDate.getTime() - expiration.getTime() < 60 * 1000) {
          const refreshToken = userService.getRefreshTokenFromAlibeezId(
            leave.userUuid
          );
          const {
            access_token,
            expires_in,
          } = await exchangeRefreshTokenForAccessToken(refreshToken);
          user.accessToken = access_token;
          user.accessTokenExpiration = new Date(
            Date.now() + expires_in * 1000
          ).toISOString();
          await userService.updateUserToken(leave.userUuid, user);
        }
        await pushToGoogleCalendar(leave, user.accessToken);
      } catch (err) {
        console.error(
          "Error while synchronizing: ",
          err instanceof http.IncomingMessage ? err.statusCode : err
        );
        let body;
        for await (const chunk of err) {
          body += chunk.toString();
        }
        console.error("body", body);
      }
    }
    await fs.promises.writeFile(LAST_CRON_FILE_PATH, cronStartTimeString);
  } catch (err) {
    console.error(
      "Error while synchronizing: ",
      err instanceof http.IncomingMessage ? err.statusCode : err
    );
    let body;
    for await (const chunk of err) {
      body += chunk.toString();
    }
    console.error("body", body);
  }
  console.log("synchronize finished");
};
