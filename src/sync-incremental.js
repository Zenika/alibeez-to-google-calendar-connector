import * as fs from "fs";
import * as http from "http";
import { parseBodyAsJson } from "./http-client.js";
import { exchangeRefreshTokenForAccessToken } from "./google-oauth-client.js";
import { queryLeaves } from "./alibeez-actions.js";
import {
  fetchAccessToken,
  fetchRefreshToken,
  saveAccessToken,
} from "./persistence.js";
import { pushToGoogleCalendar } from "./push.js";

const { LATEST_UPDATE_DATE_FILE_PATH } = process.env;
if (!LATEST_UPDATE_DATE_FILE_PATH) {
  throw new Error(
    `environment variable LATEST_UPDATE_DATE_FILE_PATH: expected non-empty string but found '${LATEST_UPDATE_DATE_FILE_PATH}'`
  );
}

export async function syncIncremental() {
  console.log("Starting incremental synchronization");
  const now = new Date().toISOString();
  let latestUpdateDate;
  try {
    latestUpdateDate = (
      await fs.promises.readFile(LATEST_UPDATE_DATE_FILE_PATH)
    )
      .toString()
      .trim();
  } catch (err) {
    console.warn(
      `WARN: Cannot read latest update date, defaulting to current time`,
      err
    );
    latestUpdateDate = now;
  }
  let updatedLeaves;
  try {
    updatedLeaves = await queryLeaves([
      `updateDate>=${latestUpdateDate.slice(0, -1)}`,
    ]);
  } catch (err) {
    if (err instanceof http.IncomingMessage) {
      err = await parseBodyAsJson(err);
    }
    console.error(`ERROR: Cannot query leaves from Alibeez, aborting`, err);
    return;
  }
  for (const leave of updatedLeaves.result) {
    let accessToken;
    try {
      accessToken = await fetchOrRenewAccessToken(leave.userUuid);
    } catch (err) {
      if (err instanceof http.IncomingMessage) {
        err = await parseBodyAsJson(err);
      }
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
      if (err instanceof http.IncomingMessage) {
        err = await parseBodyAsJson(err);
      }
      console.error(
        `ERROR: Cannot push leave '${leave.uuid}' of user '${leave.userUuid}' to Google Calendar, skipping`,
        err
      );
      continue;
    }
  }
  try {
    await fs.promises.writeFile(LATEST_UPDATE_DATE_FILE_PATH, now);
  } catch (err) {
    console.error(
      `ERROR: Cannot update latest update date, next update will be partially redundant`
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
  const timeRemaining = expiresAt - currentTime;
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
