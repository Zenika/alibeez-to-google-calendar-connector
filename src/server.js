import * as http from "http";
import { generateAuthUrl } from "./google-oauth-client.js";
import { generateRandomState } from "./utils/state.js";
import { parseQuery } from "./utils/http.js";
import { synchronize } from "./synchronize.js";
import { sync } from "./init-sync.js";
import { setupUser } from "./setup-user.js";

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
        await sync(user.alibeezId, user.accessToken);
        res.writeHead(201);
        res.end();
      } catch (err) {
        res.writeHead(500);
        res.end();
      }
    } else if (req.method === "GET" && req.url.startsWith("/synchronize")) {
      synchronize();
      res.writeHead(200).end();
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}
