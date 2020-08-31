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
  console.log("Starting incremental synchronization");
  const cronStartTimeString = new Date().toISOString();
  let lastCronTime;
  try {
    lastCronTime = await getLastCronTime(LAST_CRON_FILE_PATH);
  } catch (err) {
    console.warn(
      `WARN: Cannot read last cron time, defaulting to current time`,
      err
    );
    lastCronTime = cronStartTimeString;
  }
  let changesSinceLastCron;
  try {
    changesSinceLastCron = await queryLeaves([
      `updateDate>=${computeDateStringForAlibeez(lastCronTime)}`,
    ]);
  } catch (err) {
    console.error(`ERROR: Cannot query leaves from Alibeez, aborting`, err);
    return;
  }
  for (const leave of changesSinceLastCron.result) {
    let accessToken;
    try {
      accessToken = await fetchOrRenewAccessToken(leave.userUuid);
    } catch (err) {
      console.error(
        `ERROR: Cannot fetch or renew access token for user '${leave.userUuid}', skipping`,
        err
      );
      continue;
    }
    if (!accessToken) {
      continue;
    }
    try {
      await pushToGoogleCalendar(leave, accessToken);
    } catch (err) {
      console.error(
        `ERROR: Cannot push leave '${leave.uuid}' of user '${leave.userUuid}' to Google Calendar, skipping`,
        err
      );
      continue;
    }
  }
  try {
    await fs.promises.writeFile(LAST_CRON_FILE_PATH, cronStartTimeString);
  } catch (err) {
    console.error(
      `ERROR: Cannot update last cron time, next update will be partially redundant`
    );
  }
  console.log("Finishing incremental synchronization");
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
