import * as http from "http";
import { generateAuthUrl } from "./google-oauth-client.js";
import { generateRandomState } from "./utils/state.js";
import { parseQuery } from "./utils/http.js";
import { syncIncremental } from "./sync-incremental.js";
import { syncInit } from "./sync-init.js";
import { setupUser } from "./setup-user.js";
import { parseBodyAsJson } from "./http-client.js";

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
    if (req.method === "GET" && req.url === "/") {
      homePage(req, res);
    } else if (req.method === "GET" && req.url === "/oauth/authorize") {
      oauthAuthorizeHandler(req, res, inFlightStates);
    } else if (req.method === "GET" && req.url.startsWith("/oauth/callback")) {
      await oauthCallbackHandler(req, res, inFlightStates);
      // TODO: split out /sync/init route when we have a cookie to authenticate
      // } else if (req.method === "GET" && req.url.startsWith("/sync/init")) {
    } else if (
      req.method === "GET" &&
      req.url.startsWith("/sync/incremental")
    ) {
      await syncIncrementalHandler(req, res);
    } else {
      res.writeHead(404).end();
    }
  });
}

function homePage(req, res) {
  res.writeHead(200);
  res.write(
    `<h1>I'm the Alibeez-to-Google-Calendar Connector</h1>
    <p>I will synchronize your leaves of absence from Alibeez to Google Calendar.</p>
    <p>
      More precisely, when you create a leave request in Alibeez, I will add a corresponding event in your primary calendar within the next hour.
      It doesn't wait for the leave request to be validated. Furthermore, if you cancel a leave in Alibeez, the event will be removed from your calendar.
    </p>
    <p>For this to work, I need your permission to access your calendar.</p>
    <a href="/oauth/authorize">Continue</a>`
  );
  res.end();
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
    const { code, state, error } = parseQuery(req.url);
    if (!inFlightStates.has(Number(state))) {
      res.writeHead(401).end();
      return;
    }
    inFlightStates.delete(Number(state));
    if (error) {
      res.writeHead(401).end();
      return;
    }
    const user = await setupUser(code);
    if (!user) {
      res.writeHead(401).end();
      return;
    }
    await syncInit(user.alibeezId, user.accessToken);
    res.writeHead(200);
    res.write(
      `<h1>I'm Alibeez-to-Google-Calendar Connector</h1>
      <p>Success! I've started to copy over your current and future leaves to your calendar. I will update your calendar every hour, on the hour.</p>`
    );
    res.end();
  } catch (err) {
    if (err instanceof http.IncomingMessage) {
      err = await parseBodyAsJson(err);
    }
    console.error(`ERROR: Cannot handle OAuth callback`, err);
    res.writeHead(500).end();
  }
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
