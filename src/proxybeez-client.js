import { parseBodyAsJson, request } from "./http-client.js";

const {
  PROXYBEEZ_QUERY_USER_BY_USERNAME_ENDPOINT,
  PROXYBEEZ_QUERY_LEAVES_BY_END_DATE_ENDPOINT,
  PROXYBEEZ_QUERY_LEAVES_BY_UPDATE_DATE_ENDPOINT,
  PROXYBEEZ_SECRET,
} = process.env;

if (!PROXYBEEZ_QUERY_USER_BY_USERNAME_ENDPOINT) {
  throw new Error(
    `environment variable PROXYBEEZ_QUERY_USER_BY_USERNAME_ENDPOINT: expected non-empty string but found '${PROXYBEEZ_QUERY_USER_BY_USERNAME_ENDPOINT}'`
  );
}

if (!PROXYBEEZ_QUERY_LEAVES_BY_END_DATE_ENDPOINT) {
  throw new Error(
    `environment variable PROXYBEEZ_QUERY_LEAVES_BY_END_DATE_ENDPOINT: expected non-empty string but found '${PROXYBEEZ_QUERY_LEAVES_BY_END_DATE_ENDPOINT}'`
  );
}

if (!PROXYBEEZ_QUERY_LEAVES_BY_UPDATE_DATE_ENDPOINT) {
  throw new Error(
    `environment variable PROXYBEEZ_QUERY_LEAVES_BY_UPDATE_DATE_ENDPOINT: expected non-empty string but found '${PROXYBEEZ_QUERY_LEAVES_BY_UPDATE_DATE_ENDPOINT}'`
  );
}

if (!PROXYBEEZ_SECRET) {
  throw new Error(
    `environment variable PROXYBEEZ_SECRET: expected non-empty string`
  );
}

export async function queryUserLeavesByEndTimeGreaterOrEqualTo(
  userUuid,
  endDate
) {
  return query(
    `${PROXYBEEZ_QUERY_LEAVES_BY_END_DATE_ENDPOINT}?userUuid=${userUuid}&endDate=${endDate}`
  );
}

export async function queryLeavesByUpdateTimeGreaterOrEqualTo(updateDate) {
  return query(
    `${PROXYBEEZ_QUERY_LEAVES_BY_UPDATE_DATE_ENDPOINT}?updateDate=${updateDate}`
  );
}

export async function getUserByUsername(username) {
  return query(
    `${PROXYBEEZ_QUERY_USER_BY_USERNAME_ENDPOINT}?username=${username}`
  );
}

async function query(endpointWithQueryParams) {
  const response = await request({
    url: endpointWithQueryParams,
    method: "GET",
    headers: { Authorization: `Bearer ${PROXYBEEZ_SECRET}` },
  });
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}
