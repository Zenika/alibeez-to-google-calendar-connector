import * as http from "http";
import { generateAuthUrl } from "./google-oauth-client.js";
import { generateRandomState } from "./utils/state.js";
import { parseQuery } from "./utils/http.js";
import { syncIncremental } from "./sync-incremental.js";
import { syncInit } from "./sync-init.js";
import { setupUser } from "./setup-user.js";

const { ADMIN_SECRET, UNSECURE } = process.env;

if (!ADMIN_SECRET && UNSECURE !== "true") {
  throw new Error(
    `environment variable ADMIN_SECRET: expected non-empty string but found '${ADMIN_SECRET}' (you may disable this error by setting UNSECURE to 'true')`
  );
}

export function createServer() {
  const inFlightStates = new Set();
  return http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/oauth/authorize") {
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
    const { code, state } = parseQuery(req.url);
    if (!inFlightStates.has(Number(state))) {
      res.writeHead(401).end();
      return;
    }
    inFlightStates.delete(Number(state));
    const user = await setupUser(code);
    if (!user) {
      res.writeHead(401).end();
      return;
    }
    await syncInit(user.alibeezId, user.accessToken);
    res.writeHead(201).end();
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
