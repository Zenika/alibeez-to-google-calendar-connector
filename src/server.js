import * as http from "http";
import { generateAuthUrl } from "./googleOauthClient.js";
import { generateRandomState } from "./utils/state.js";
import { syncIncremental } from "./syncIncremental.js";
import { syncInit } from "./syncInit.js";
import { setupUser } from "./setupUser.js";
import { serveHtmlFile } from "./utils/serveHtmlFile.js";
import { parseRequestUrl } from "./utils/parseRequestUrl.js";
import { getSessionCookie, setSessionCookie } from "./sessionCookie.js";
import { fetchAccessToken } from "./persistence.js";
import { renderView } from "./utils/renderView.js";

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
    try {
      if (req.url === "/") {
        await serveHtmlFile(res, "src/pages/home.html");
      } else if (req.url === "/oauth/authorize") {
        await oauthAuthorizeHandler(req, res, inFlightStates);
      } else if (req.url.startsWith("/oauth/callback")) {
        await oauthCallbackHandler(req, res, inFlightStates);
      } else if (req.url === "/success") {
        await authenticatedOnly(successPageHandler)(req, res);
      } else if (req.url.startsWith("/sync/init")) {
        await authenticatedOnly(syncInitHandler)(req, res);
      } else if (req.url.startsWith("/sync/incremental")) {
        await adminOnly(syncIncrementalHandler)(req, res);
      } else {
        res.writeHead(404).end();
      }
    } catch (err) {
      console.error(err);
      res.writeHead(500).end();
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
      return await serveErrorPage(
        res,
        "This authentication attempt has expired! Please restart the authentication process."
      );
    }
    inFlightStates.delete(state);
    if (error) {
      return await serveErrorPage(res, "Google returnded an error! " + error);
    }
    const user = await setupUser(code);
    if (!user) {
      return await serveErrorPage(res, "JWT claims did not match!");
    }
    setSessionCookie(res, user.alibeezId);
    // disable cache because this is an effectful operation, even though it is
    // run on a GET
    res.setHeader("Cache-Control", "no-store; max-age=0;");
    res.writeHead(303, { Location: "/sync/init" });
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
async function successPageHandler(req, res) {
  await serveHtmlFile(res, "src/pages/success.html");
}

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {string} userId
 */
async function syncInitHandler(req, res, userId) {
  const { token } = await fetchAccessToken(userId);
  await syncInit(userId, token);
  res.writeHead(303, { Location: "/success" }).end();
}

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function syncIncrementalHandler(req, res) {
  try {
    await syncIncremental();
    res.writeHead(200).end();
  } catch (err) {
    console.error(`ERROR: Cannot handle incremental sync`, err);
    res.writeHead(500).end();
  }
}

/**
 * @param {http.ServerResponse} res
 * @param {string} errorMessage
 */
async function serveErrorPage(res, errorMessage) {
  return await renderView(res, "src/pages/error.html", { errorMessage }, 401);
}

/**
 * @param {(req: http.IncomingMessage, res: http.ServerResponse, userId: string) => void} handler
 * @returns {http.RequestListener}
 */
function authenticatedOnly(handler) {
  return async (req, res) => {
    const alibeezUserId = getSessionCookie(req);
    if (!alibeezUserId) {
      return await serveErrorPage(
        res,
        "No authentication cookie found! You could try to clear the cookies for this site and try again."
      );
    }
    return handler(req, res, alibeezUserId);
  };
}

/**
 * @param {http.RequestListener} handler
 * @returns {http.RequestListener}
 */
function adminOnly(handler) {
  return async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.writeHead(401).end();
    }
    return handler(req, res);
  };
}

/**
 * @param {http.IncomingMessage} req
 * @returns {boolean}
 */
function isAdminRequest(req) {
  return (
    UNSECURE === "true" ||
    req.headers.authorization === `Bearer ${ADMIN_SECRET}`
  );
}
