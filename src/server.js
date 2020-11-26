import * as http from "http";
import { generateAuthUrl } from "./googleOauthClient.js";
import { generateRandomState } from "./utils/state.js";
import { syncIncremental } from "./syncIncremental.js";
import { syncInit } from "./syncInit.js";
import { setupUser } from "./setupUser.js";
import { serveHtmlFile } from "./utils/serveHtmlFile.js";
import { parseRequestUrl } from "./utils/parseRequestUrl.js";
import { getSessionCookie, setSessionCookie } from "./sessionCookie.js";
import { parseAsText } from "./utils/streams.js";
import * as querystring from "querystring";
import {
  fetchAccessToken,
  fetchUserInfo,
  saveUserInfo,
} from "./persistence.js";

const { ADMIN_SECRET, UNSECURE } = process.env;

if (UNSECURE === "true") {
  console.warn(
    `WARN: UNSECURE is set to 'true'! Admin endpoints have no security. This is only OK if the server is not reachable from the internet.`
  );
}

if (!ADMIN_SECRET && UNSECURE !== "true") {
  throw new Error(
    `environment variable ADMIN_SECRET: expected non-empty string but found '${ADMIN_SECRET}' (you may disable this error by setting UNSECURE to 'true')`
  );
}

export function createServer() {
  const inFlightStates = new Set();
  return http.createServer(async (req, res) => {
    if (req.url === "/") {
      await serveHtmlFile(res, "src/pages/home.html");
    } else if (req.url === "/oauth/authorize") {
      await oauthAuthorizeHandler(req, res, inFlightStates);
    } else if (req.url.startsWith("/oauth/callback")) {
      await oauthCallbackHandler(req, res, inFlightStates);
    } else if (req.method === "GET" && req.url === "/settings") {
      await getSettingsHandler(req, res);
    } else if (req.method === "POST" && req.url === "/settings") {
      await postSettingsHandler(req, res);
    } else if (req.url === "/success") {
      await successPageHandler(req, res);
    } else if (req.url.startsWith("/sync/init")) {
      await syncInitHandler(req, res);
    } else if (req.url.startsWith("/sync/incremental")) {
      await syncIncrementalHandler(req, res);
    } else {
      res.writeHead(404).end();
    }
  });
}

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function oauthAuthorizeHandler(req, res, inFlightStates) {
  try {
    const scopes = [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ];
    const state = generateRandomState();
    inFlightStates.add(state);
    const oauthUrl = generateAuthUrl(scopes, state);
    res.writeHead(302, { Location: oauthUrl }).end();
  } catch (err) {
    console.error(`ERROR: Cannot handle OAuth authorization`, err);
    res.writeHead(500).end();
  }
}

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function oauthCallbackHandler(req, res, inFlightStates) {
  try {
    const requestUrl = parseRequestUrl(req.url);
    const state = Number(requestUrl.searchParams.get("state"));
    const error = requestUrl.searchParams.get("error");
    const code = requestUrl.searchParams.get("code");
    if (!inFlightStates.has(state)) {
      res.writeHead(401).end();
      return;
    }
    inFlightStates.delete(state);
    if (error) {
      res.writeHead(401).end();
      return;
    }
    const user = await setupUser(code);
    if (!user) {
      res.writeHead(401).end();
      return;
    }
    setSessionCookie(res, user.alibeezId);
    // disable cache because this is an effectful operation, even though it is
    // run on a GET
    res.setHeader("Cache-Control", "no-store; max-age=0;");
    res.writeHead(303, { Location: "/settings" });
    res.end();
  } catch (err) {
    console.error(`ERROR: Cannot handle OAuth callback`, err);
    res.writeHead(500).end();
  }
}

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function getSettingsHandler(req, res) {
  const alibeezUserId = getSessionCookie(req);
  if (alibeezUserId) {
    await serveHtmlFile(res, "src/pages/settings.html");
  } else {
    res.writeHead(303, { Location: "/" }).end();
  }
}

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function postSettingsHandler(req, res) {
  const alibeezUserId = getSessionCookie(req);
  if (!alibeezUserId) {
    return res.writeHead(401).end();
  }
  const { attendees: attendeesInput } = querystring.parse(
    await parseAsText(req)
  );
  const attendees = (typeof attendeesInput === "string"
    ? attendeesInput
    : attendeesInput[0]
  )
    .split(",")
    .map((attendee) => attendee.trim());
  const userInfo = await fetchUserInfo(alibeezUserId);
  await saveUserInfo(alibeezUserId, { ...userInfo, attendees });
  res.writeHead(303, { Location: "/sync/init" }).end();
}

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function successPageHandler(req, res) {
  const alibeezUserId = getSessionCookie(req);
  if (alibeezUserId) {
    await serveHtmlFile(res, "src/pages/success.html");
  } else {
    res.writeHead(303, { Location: "/" }).end();
  }
}

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function syncInitHandler(req, res) {
  const alibeezUserId = getSessionCookie(req);
  if (!alibeezUserId) {
    res.writeHead(303, { Location: "/" }).end();
  }
  const { token } = await fetchAccessToken(alibeezUserId);
  await syncInit(alibeezUserId, token);
  res.writeHead(303, { Location: "/success" }).end();
}

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function syncIncrementalHandler(req, res) {
  if (!isAdminRequest(req)) {
    res.writeHead(401).end();
  }
  try {
    await syncIncremental();
    res.writeHead(200).end();
  } catch (err) {
    console.error(`ERROR: Cannot handle incremental sync`, err);
    res.writeHead(500).end();
  }
}

function isAdminRequest(req) {
  return (
    UNSECURE === "true" ||
    req.headers.authorization === `Bearer ${ADMIN_SECRET}`
  );
}
