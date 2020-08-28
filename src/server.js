import * as http from "http";
import { generateAuthUrl } from "./google-oauth-client.js";
import { generateRandomState } from "./utils/state.js";
import { parseQuery } from "./utils/http.js";
import { syncIncremental } from "./sync-incremental.js";
import { syncInit } from "./sync-init.js";
import { setupUser } from "./setup-user.js";

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
      res.writeHead(404);
      res.end();
    }
  });
}

async function oauthAuthorizeHandler(req, res, inFlightStates) {
  const scopes = [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.events",
  ];
  const state = generateRandomState();
  const oauthUrl = generateAuthUrl(scopes, state);
  res.writeHead(302, { Location: oauthUrl });
  res.end();
  inFlightStates.add(state);
}

async function oauthCallbackHandler(req, res, inFlightStates) {
  try {
    const { code, state } = parseQuery(req.url);
    if (!inFlightStates.has(Number(state))) {
      res.writeHead(401);
      res.end();
      return;
    }
    inFlightStates.delete(Number(state));
    const user = await setupUser(code);
    if (!user) {
      res.writeHead(401);
      res.end();
    }
    await syncInit(user.alibeezId, user.accessToken);
    res.writeHead(201);
    res.end();
  } catch (err) {
    res.writeHead(500);
    res.end();
  }
}

async function syncIncrementalHandler(req, res) {
  try {
    await syncIncremental();
    res.writeHead(200).end();
  } catch (err) {
    res.writeHead(500);
    res.end();
  }
}
