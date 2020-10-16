import { parseBodyAsJson, request } from "./http-client.js";
import { createUrl } from "./utils/url.js";

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
    createUrl(PROXYBEEZ_API_ROOT_URL, "/userLeavesAfter", { userUuid, endDate })
  );
}

export async function queryLeavesUpdatedSince(updateDate) {
  return query(
    createUrl(PROXYBEEZ_API_ROOT_URL, "/leavesUpdatedSince", { updateDate })
  );
}

export async function queryUser(username) {
  return query(createUrl(PROXYBEEZ_API_ROOT_URL, "/user", { username }));
}

async function query(url) {
  const response = await request({
    url,
    method: "GET",
    headers: { Authorization: `Bearer ${PROXYBEEZ_KEY}` },
  });
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}
