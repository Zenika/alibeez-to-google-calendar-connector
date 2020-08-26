import http from "http";
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  claimsMatch,
} from "./google-oauth-client.js";
import { generateRandomState } from "./utils/state.js";
import { parseQuery } from "./utils/http.js";
import { parseJwtClaims } from "./utils/jwt.js";
import { getUserByUsername } from "./alibeez-client.js";
import { mapUser } from "./users/user-mapper.js";

export function createServer() {
  const inFlightStates = new Set();
  return http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/oauth/authorize") {
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
    } else if (req.method === "GET" && req.url.startsWith("/oauth/callback")) {
      const { code, state } = parseQuery(req.url);
      if (!inFlightStates.has(Number(state))) {
        res.writeHead(401);
        res.end();
        return;
      }
      inFlightStates.delete(Number(state));
      const tokens = await exchangeCodeForTokens(code);
      const claims = parseJwtClaims(tokens.id_token);
      if (!claimsMatch(claims)) {
        res.writeHead(401);
        res.end();
        return;
      }

      const request = getUserByUsername(claims.email);
      if (request.statusCode !== 200) {
        res.writeHead(request.statusCode || 500);
        res.end(request.message);
      }

      const user = mapUser(claims, request[0].uuid);
      await userUpsert(user);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}
