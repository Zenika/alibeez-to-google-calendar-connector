const fs = require("fs");
const http = require("http");
const https = require("https");
const querystring = require("querystring");
const crypto = require("crypto");
const url = require("url");

const port = Number(process.env.PORT) || 8080;

const inFlightAuth = new Set();

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/oauth/authorize") {
    const state = crypto.randomBytes(4).readUInt32LE();
    const query = querystring.stringify({
      client_id: process.env.GOOGLE_OAUTH2_CLIENT_ID,
      redirect_uri: process.env.GOOGLE_OAUTH2_CLIENT_REDIRECT_URI,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: [
        "openid",
        "email",
        "https://www.googleapis.com/auth/calendar.events",
      ].join(" "),
      state,
    });
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
    res.writeHead(302, { Location: oauthUrl });
    res.end();
    inFlightAuth.add(state);
  } else if (req.method === "GET" && req.url.startsWith("/oauth/callback")) {
    const { code, state } = querystring.parse(
      url.parse(req.url).search.slice(1)
    );
    if (!inFlightAuth.has(Number(state))) {
      res.writeHead(401);
      res.end();
      return;
    }
    inFlightAuth.delete(state);
    const postData = querystring.stringify({
      client_id: process.env.GOOGLE_OAUTH2_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH2_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_OAUTH2_CLIENT_REDIRECT_URI,
      grant_type: "authorization_code",
      code,
    });

    const googkeTokenRequest = https.request(
      `https://oauth2.googleapis.com/token?${postData}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      async (googleTokenResponse) => {
        if (googleTokenResponse.statusCode !== 200) {
          console.error(
            "could not exchange code for token, Google returned HTTP error",
            googleTokenResponse.statusCode
          );
          res.writeHead(500);
          res.end();
          return;
        }
        let body = "";
        for await (const chunk of googleTokenResponse) {
          body += chunk.toString();
        }
        const {
          id_token: idToken,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
        } = JSON.parse(body);
        const claims = JSON.parse(
          Buffer.from(idToken.split(".")[1], "base64").toString()
        );
        if (
          claims.aud !== process.env.GOOGLE_OAUTH2_CLIENT_ID ||
          claims.hd !== process.env.GOOGLE_OAUTH2_CLIENT_HD
        ) {
          console.warn(
            "could not validate id token, audience or domain mismatch:",
            claims.aud,
            claims.hd
          );
          res.writeHead(401);
          res.end();
          return;
        }

        const query = querystring.stringify({
          key: process.env.ALIBEEZ_KEY,
          fields: ["uuid", "username"].join(","),
          filter: [`username==${claims.email}`],
        });

        https.get(
          `https://dev2-infra.my.alibeez.com/api/query/users?${query}`,
          async (alibeezUserResponse) => {
            if (alibeezUserResponse.statusCode !== 200) {
              console.error(
                `ERROR: Alibeez responded with status`,
                alibeezUserResponse.statusCode
              );
              return;
            }
            let alibeezUserResponseBody = "";
            for await (chunk of alibeezUserResponse) {
              alibeezUserResponseBody += chunk.toString("utf8");
            }
            const { result } = JSON.parse(alibeezUserResponseBody);
            const alibeezId = result[0].uuid;
            await fs.promises.mkdir("users", { recursive: true });
            await fs.promises.writeFile(
              `users/${alibeezId}.json`,
              JSON.stringify({
                email: claims.email,
                alibeezId,
                googleId: claims.sub,
                accessTokenExpiration: new Date(
                  Date.now() + expiresIn * 1000
                ).toISOString(),
                accessToken,
                refreshToken,
              })
            );
            res.writeHead(200);
            res.end();
          }
        );
      }
    );
    googkeTokenRequest.on("error", (err) => {
      console.error(
        `could not exchange code for token, request failed: ${err.message}`
      );
    });
    googkeTokenRequest.write(postData);
    googkeTokenRequest.end();
  } else {
    console.error(404, req.method, req.url);
    res.writeHead(404);
    res.end();
  }
});

server.listen(port);
