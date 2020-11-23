import * as http from "http";
import { generateAuthUrl } from "./googleOauthClient.js";
import { generateRandomState } from "./utils/state.js";
import { syncIncremental } from "./syncIncremental.js";
import { syncInit } from "./syncInit.js";
import { setupUser } from "./setupUser.js";
import { serveHtmlFile } from "./utils/serveHtmlFile.js";
import { parseRequestUrl } from "./utils/parseRequestUrl.js";

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
      await serveHtmlFile(res, "src/pages/home.html");
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
    await syncInit(user.alibeezId, user.accessToken);
    res.writeHead(200);
    await serveHtmlFile(res, "src/pages/success.html");
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
