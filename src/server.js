import http from "http";
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  claimsMatch,
} from "./google-oauth-client";
import { generateRandomState } from "./utils/state";
import { parseQuery } from "./utils/http";
import { parseJwtClaims } from "./utils/jwt";

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
      if (!inFlightAuth.has(Number(state))) {
        res.writeHead(401);
        res.end();
        return;
      }
      inFlightAuth.delete(state);
      const tokens = await exchangeCodeForTokens(code);
      const claims = parseJwtClaims(tokens.id_tokens);
      if (!claimsMatch(claims)) {
        res.writeHead(401);
        res.end();
        return;
      }
    } else {
    }
  });
}
