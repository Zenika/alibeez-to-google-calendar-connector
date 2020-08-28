import querystring from "querystring";
import { request, parseBodyAsJson } from "./http-client.js";

const { ALIBEEZ_API_ROOT_URL, ALIBEEZ_KEY } = process.env;

if (!ALIBEEZ_API_ROOT_URL) {
  throw new Error(
    `environment variable ALIBEEZ_API_ROOT_URL: expected non-empty string but found '${ALIBEEZ_API_ROOT_URL}'`
  );
}

if (!ALIBEEZ_KEY) {
  throw new Error(
    `environment variable ALIBEEZ_KEY: expected non-empty string but found '${ALIBEEZ_KEY}'`
  );
}

export async function queryLeaves(fields, filters) {
  const query =
    `key=${ALIBEEZ_KEY}`
    + `&fields=${fields.join(',')}`
    + filters.map(filter => `&filter=${encodeURIComponent(filter)}`).join('');

  const requestUrl = `${ALIBEEZ_API_ROOT_URL}/query/leaves/requests?${query}`;
  const requestOptions = {
    method: "GET",
  };
  const response = await request(requestUrl, requestOptions);
  if (response.statusCode !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export async function getUserIncomingVacations(userAlibeezId) {
  const fields = [
    "uuid",
    "userUuid",
    "updateDate",
    "status",
    "startDay",
    "startDayTime",
    "endDay",
    "endDayTime",
  ]
  const today = new Date().toISOString().split('T')[0];
  const filters = [`endDate>=${today}MORNING`, `userUuid==${userAlibeezId}`];
  return await queryLeaves(fields, filters);
}

export async function queryUsers(fields, filters) {
  const query = querystring.stringify({
    key: ALIBEEZ_KEY,
    fields: fields.join(","),
    filter: filters,
  });
  const requestUrl = `${ALIBEEZ_API_ROOT_URL}/query/users?${query}`;
  const requestOptions = {
    method: "GET",
  };
  const response = await request(requestUrl, requestOptions);
  if (response.statusCode !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export async function getUserByUsername(username) {
  return  queryUsers(
    ["uuid", "username"],
    [`username==${username}`]
  );
}
