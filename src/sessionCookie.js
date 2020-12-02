import * as http from "http";
import { randomBytes } from "crypto";

const UNSECURE = process.env.UNSECURE === "true";
const COOKIE_PREFIX = UNSECURE ? "" : "__Host-";
const COOKIE_NAME =
  COOKIE_PREFIX + "Alibeez-To-Google-Calendar-Connector-User-Id";
const COOKIE_MAX_AGE = 5 * 60;
const COOKIE_ATTRIBUTES = [
  "SameSite=Lax", // Lax required to allow redirects
  "Path=/",
  "HttpOnly",
  `Max-Age=${COOKIE_MAX_AGE}`,
  ...(UNSECURE ? [] : ["Secure"]),
];

const KNOWN_USERS = new Map();

/**
 *
 * @param {http.ServerResponse} res
 */
export function setSessionCookie(res, alibeezUserId) {
  const userId = randomBytes(36).toString("hex");
  KNOWN_USERS.set(userId, alibeezUserId);
  setTimeout(() => {
    KNOWN_USERS.delete(userId);
  }, COOKIE_MAX_AGE * 1000);
  const setCookie = `${COOKIE_NAME}=${userId}; ${COOKIE_ATTRIBUTES.join("; ")}`;
  res.setHeader("Set-Cookie", setCookie);
}

/**
 *
 * @param {http.IncomingMessage} req
 * @returns {string | undefined} alibeezUserId
 */
export function getSessionCookie(req) {
  const sessionCookie = req.headers["cookie"]
    ?.split(";")
    ?.map((cookie) => cookie.trim())
    ?.find((cookie) => cookie.startsWith(COOKIE_NAME + "="));
  const userId = sessionCookie?.substring(COOKIE_NAME.length + 1);
  return KNOWN_USERS.get(userId);
}
