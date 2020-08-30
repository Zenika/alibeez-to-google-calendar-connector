import * as querystring from "querystring";
import { request, parseBodyAsJson } from "./http-client.js";

const {
  GOOGLE_OAUTH2_CLIENT_ID,
  GOOGLE_OAUTH2_CLIENT_SECRET,
  GOOGLE_OAUTH2_CLIENT_REDIRECT_URI,
  GOOGLE_OAUTH2_CLIENT_HD,
} = process.env;

if (!GOOGLE_OAUTH2_CLIENT_ID) {
  throw new Error(
    `environment variable GOOGLE_OAUTH2_CLIENT_ID: expected non-empty string but found '${GOOGLE_OAUTH2_CLIENT_ID}'`
  );
}

if (!GOOGLE_OAUTH2_CLIENT_SECRET) {
  throw new Error(
    `environment variable GOOGLE_OAUTH2_CLIENT_SECRET: expected non-empty string but found '${GOOGLE_OAUTH2_CLIENT_SECRET}'`
  );
}

if (!GOOGLE_OAUTH2_CLIENT_REDIRECT_URI) {
  throw new Error(
    `environment variable GOOGLE_OAUTH2_CLIENT_REDIRECT_URI: expected non-empty string but found '${GOOGLE_OAUTH2_CLIENT_REDIRECT_URI}'`
  );
}

if (!GOOGLE_OAUTH2_CLIENT_HD) {
  throw new Error(
    `environment variable GOOGLE_OAUTH2_CLIENT_HD: expected non-empty string but found '${GOOGLE_OAUTH2_CLIENT_HD}'`
  );
}

export function generateAuthUrl(scopes, state) {
  if (!state) {
    throw new TypeError(
      `argument 'state': expected non-empty string but found '${state}'`
    );
  }
  state = String(state);
  const query = querystring.stringify({
    client_id: GOOGLE_OAUTH2_CLIENT_ID,
    redirect_uri: GOOGLE_OAUTH2_CLIENT_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: scopes.join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
}

export function claimsMatch(claims) {
  return (
    claims.aud === GOOGLE_OAUTH2_CLIENT_ID ||
    claims.hd === GOOGLE_OAUTH2_CLIENT_HD
  );
}

export async function exchangeCodeForTokens(code) {
  const response = await request({
    url: `https://oauth2.googleapis.com/token`,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: querystring.stringify({
      client_id: GOOGLE_OAUTH2_CLIENT_ID,
      client_secret: GOOGLE_OAUTH2_CLIENT_SECRET,
      redirect_uri: GOOGLE_OAUTH2_CLIENT_REDIRECT_URI,
      grant_type: "authorization_code",
      code,
    }),
  });
  if (response.statusCode !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export async function exchangeRefreshTokenForAccessToken(refreshToken) {
  const response = await request({
    url: `https://oauth2.googleapis.com/token`,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: querystring.stringify({
      client_id: GOOGLE_OAUTH2_CLIENT_ID,
      client_secret: GOOGLE_OAUTH2_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (response.statusCode !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}
