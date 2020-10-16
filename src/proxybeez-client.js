import { parseBodyAsJson, request } from "./http-client.js";

const {
  PROXYBEEZ_API_ROOT_URL,
  PROXYBEEZ_KEY,
} = process.env;

if (!PROXYBEEZ_API_ROOT_URL) {
  throw new Error(
    `environment variable PROXYBEEZ_API_ROOT_URL: expected non-empty string but found '${PROXYBEEZ_API_ROOT_URL}'`
  );
}

if (!PROXYBEEZ_KEY) {
  throw new Error(
    `environment variable PROXYBEEZ_KEY: expected non-empty string`
  );
}

export async function queryUserLeavesAfter(
  userUuid,
  endDate
) {
  return query(
    `${PROXYBEEZ_API_ROOT_URL}/userLeavesAfter?userUuid=${userUuid}&endDate=${endDate}`
  );
}

export async function queryLeavesUpdatedSince(updateDate) {
  return query(
    `${PROXYBEEZ_API_ROOT_URL}/leavesUpdatedSince?updateDate=${updateDate}`
  );
}

export async function queryUser(username) {
  return query(
    `${PROXYBEEZ_API_ROOT_URL}/user?username=${username}`
  );
}

async function query(endpointWithQueryParams) {
  const response = await request({
    url: endpointWithQueryParams,
    method: "GET",
    headers: { Authorization: `Bearer ${PROXYBEEZ_KEY}` },
  });
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}
