import http from "http";
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  claimsMatch,
} from "./google-oauth-client";
import { generateRandomState } from "./utils/state";
import { parseQuery } from "./utils/http";
import { parseJwtClaims } from "./utils/jwt";
import { getUserByUsername } from "./alibeez-client";
import { mappUser } from "./users/user-mapper";
import { userPersistence } from "./user-persistence";

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

      const request = getUserByUsername(claims.email);
      if (request.statusCode !== 200) {
        res.writeHead(request.statusCode);
        res.end(request.message);
      }

      const user = mappUser(claims, request[0].uuid);
      await userPersistence.upsert(user);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}
