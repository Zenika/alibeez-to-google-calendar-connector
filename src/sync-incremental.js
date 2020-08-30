import * as fs from "fs";
import * as http from "http";
import { exchangeRefreshTokenForAccessToken } from "./google-oauth-client.js";
import { queryLeaves } from "./alibeez-actions.js";
import {
  fetchAccessToken,
  fetchRefreshToken,
  saveAccessToken,
} from "./persistence.js";
import { pushToGoogleCalendar } from "./push.js";

const { LAST_CRON_FILE_PATH } = process.env;
if (!LAST_CRON_FILE_PATH) {
  throw new Error(
    `environment variable LAST_CRON_FILE_PATH: expected non-empty string but found '${LAST_CRON_FILE_PATH}'`
  );
}

export async function syncIncremental() {
  try {
    const lastCronTime = await getLastCronTime(LAST_CRON_FILE_PATH);
    const cronStartTimeString = new Date().toISOString();
    const changesSinceLastCron = await queryLeaves([
      `updateDate>=${computeDateStringForAlibeez(
        lastCronTime || cronStartTimeString
      )}`,
    ]);
    for (const leave of changesSinceLastCron.result) {
      try {
        const accessToken = await fetchOrRenewAccessToken(leave.userUuid);
        if (!accessToken) {
          continue;
        }
        await pushToGoogleCalendar(leave, accessToken);
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
}

async function fetchOrRenewAccessToken(userId) {
  const accessTokenInfo = await fetchAccessToken(userId);
  if (!accessTokenInfo) {
    return null;
  }
  const currentTime = new Date().getTime();
  const expiresAt = new Date(accessTokenInfo.expiresAt).getTime();
  const timeRemaining = currentTime - expiresAt;
  if (timeRemaining >= 60 * 1000 /* 1 minute */) {
    return accessTokenInfo.token;
  }
  const refreshToken = await fetchRefreshToken(userId);
  const { access_token, expires_in } = await exchangeRefreshTokenForAccessToken(
    refreshToken
  );
  await saveAccessToken(userId, {
    token: access_token,
    expiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
  });
  return access_token;
}

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
