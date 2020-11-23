import * as fs from "fs";
import { exchangeRefreshTokenForAccessToken } from "./googleOauthClient.js";
import {
  fetchAccessToken,
  fetchRefreshToken,
  saveAccessToken,
} from "./persistence.js";
import { pushToGoogleCalendar } from "./pushToGoogleCalendar.js";
import { queryLeavesUpdatedSince } from "./proxybeezClient.js";

const { LATEST_SYNC_DATE_FILE_PATH } = process.env;
if (!LATEST_SYNC_DATE_FILE_PATH) {
  throw new Error(
    `environment variable LATEST_SYNC_DATE_FILE_PATH: expected non-empty string but found '${LATEST_SYNC_DATE_FILE_PATH}'`
  );
}

export async function syncIncremental() {
  console.log("Starting incremental sync");
  const now = new Date().toISOString();
  let latestSyncDate;
  try {
    latestSyncDate = (await fs.promises.readFile(LATEST_SYNC_DATE_FILE_PATH))
      .toString()
      .trim();
  } catch (err) {
    console.warn(
      `WARN: Cannot read latest sync date, defaulting to current time`,
      err
    );
    latestSyncDate = now;
  }
  console.log(`Ready to pull leaves updated since '${latestSyncDate}'`);
  let updatedLeaves;
  try {
    updatedLeaves = await queryLeavesUpdatedSince(latestSyncDate.slice(0, -1));
  } catch (err) {
    console.error(`ERROR: Cannot query leaves from Alibeez, aborting`, err);
    return;
  }
  console.log(`Pulled '${updatedLeaves.length}' leaves from Alibeez`);
  for (const leave of updatedLeaves) {
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
    await fs.promises.writeFile(LATEST_SYNC_DATE_FILE_PATH, now);
  } catch (err) {
    console.error(
      `ERROR: Cannot update latest sync date, next sync will be partially redundant`
    );
  }
  console.log("Finishing incremental sync");
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
