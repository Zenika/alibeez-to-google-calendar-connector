import * as querystring from "querystring";
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
  const query = querystring.stringify({
    key: ALIBEEZ_KEY,
    fields: fields.join(","),
    filter: filters,
  });
  const response = await request({
    url: `${ALIBEEZ_API_ROOT_URL}/query/leaves/requests?${query}`,
    method: "GET",
  });
  if (response.statusCode !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export async function queryUsers(fields, filters) {
  const query = querystring.stringify({
    key: ALIBEEZ_KEY,
    fields: fields.join(","),
    filter: filters,
  });
  const response = await request({
    url: `${ALIBEEZ_API_ROOT_URL}/query/users?${query}`,
    method: "GET",
  });
  if (response.statusCode !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}
