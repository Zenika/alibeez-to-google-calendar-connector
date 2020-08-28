import http from "http";
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  claimsMatch,
} from "./google-oauth-client.js";
import { generateRandomState } from "./utils/state.js";
import { parseQuery } from "./utils/http.js";
import { parseJwtClaims } from "./utils/jwt.js";
import { mapUser } from "./users/user-mapper.js";
import { userService } from "./users/user-service.js";
import { mapEventBody } from "./google-calendar-client.js";
import { upsert } from "./google-calendar-actions.js";
import {
  getUserByUsername,
  getUserIncomingVacations,
} from "./alibeez-client.js";

import { synchronize } from "./synchronize.js";

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

      const request = await getUserByUsername(claims.email);
      if (request.statusCode) {
        res.writeHead(request.statusCode || 500);
        res.end(request.message);
      }

      const alibeezId = request.result[0].uuid;
      const accessToken = tokens.access_token;

      const user = mapUser({
        ...claims,
        alibeezId: alibeezId,
        accessToken: accessToken,
        refreshToken: tokens.refresh_token,
      });

      await userService.upsert(user);
      try {
        const leaves = await getUserIncomingVacations(alibeezId);

        leaves.result.forEach((leave) =>
          upsert(
            "primary",
            `alibeev${leave.uuid}`,
            mapEventBody(leave),
            accessToken
          )
        );
      } catch (err) {
        console.error(
          "Error while initing: ",
          err instanceof http.IncomingMessage ? err.statusCode : err
        );
        let body;
        for await (const chunk of err) {
          body += chunk.toString();
        }
        console.error("body", body);
      }
      res.writeHead(201);
      res.end();
    } else if (req.method === "GET" && req.url.startsWith("/synchronize")) {
      synchronize();
      res.writeHead(200).end();
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}
