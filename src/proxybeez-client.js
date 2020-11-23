import { jsonProducingHttpRequest } from "./utils/jsonHttpClient.js";
import { buildUrl } from "./utils/buildUrl.js";

/** @type {URL} */
let PROXYBEEZ_API_ROOT_URL;
try {
  PROXYBEEZ_API_ROOT_URL = new URL(process.env.PROXYBEEZ_API_ROOT_URL);
} catch (err) {
  throw new Error(
    `environment variable PROXYBEEZ_API_ROOT_URL: expected valid absolute URL but found '${PROXYBEEZ_API_ROOT_URL}'`
  );
}

const { PROXYBEEZ_KEY } = process.env;

if (!PROXYBEEZ_KEY) {
  throw new Error(
    `environment variable PROXYBEEZ_KEY: expected non-empty string`
  );
}

export async function queryUserLeavesAfter(userUuid, endDate) {
  return query(
    buildUrl(PROXYBEEZ_API_ROOT_URL, "/userLeavesAfter", { userUuid, endDate })
  );
}

export async function queryLeavesUpdatedSince(updateDate) {
  return query(
    buildUrl(PROXYBEEZ_API_ROOT_URL, "/leavesUpdatedSince", { updateDate })
  );
}

export async function queryUser(username) {
  return query(buildUrl(PROXYBEEZ_API_ROOT_URL, "/user", { username }));
}

async function query(url) {
  return await jsonProducingHttpRequest(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${PROXYBEEZ_KEY}` },
  });
}
