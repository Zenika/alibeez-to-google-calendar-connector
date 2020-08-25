const fs = require("fs");
const readline = require("readline");
const http = require("http");
const https = require("https");
const querystring = require("querystring");

const output = fs.createWriteStream("fun2.txt", { flags: "a" });
const offset = Number(fs.readFileSync("offset.txt").toString().trim());

async function main() {
  const io = readline.createInterface({
    input: process.stdin,
  });
  try {
    let lineNumber = 0;
    for await (const line of io) {
      lineNumber++;
      if (lineNumber >= offset) {
        const item = JSON.parse(line);
        const [didPush, response] = await pushToGoogle(item);
        if (!didPush) {
          io.write(`ERROR: could not push to google`);
          if (response) {
            let body = "";
            for await (const chunk of response) {
              body += chunk.toString();
            }
            console.log(didPush, response.statusCode, body);
          } else {
            console.log(didPush);
          }
          throw new Error(`could not push to google`);
        }
        console.log(`item '${item.uuid}' pushed to google`);
        output.write(`pushed to google ${JSON.stringify(item)}\n`);
        await fs.promises.writeFile("offset.txt", lineNumber);
      }
    }
  } catch (err) {
    console.error(err);
    io.on("close", () => {
      // process.stdin.end(() => {
      console.log("STDIN END");
      console.log(process._getActiveHandles(), process._getActiveRequests());
      // });
    });
    io.close();
    output.close();
    output.end(() => {
      setTimeout(() => {
        console.log("OUTPUT END");
        console.log(process._getActiveHandles(), process._getActiveRequests());
      });
    });
  }
}

async function pushToGoogle(item) {
  const eventId = `alibeez_${item.uuid}`;
  const eventBody = craftEvent(item);
  const accessToken = await fetchAccessToken(item.userUuid);
  if (["PENDING", "APPROVED"].includes(item.status)) {
    const updateGoogleResponse = await updateGoogle(
      "primary",
      eventId,
      eventBody,
      accessToken
    );
    if (updateGoogleResponse.statusCode === 404) {
      const insertInGoogleResponse = await insertInGoogle(
        "primary",
        eventBody,
        accessToken
      );
      return [
        insertInGoogleResponse.statusCode === 200,
        insertInGoogleResponse,
      ];
    } else {
      return [updateGoogleResponse.statusCode === 200, updateGoogleResponse];
    }
  } else if (["CANCEL_PENDING", "CANCELED", "REJECTED"].includes(item.status)) {
    const deleteFromGoogleResponse = await deleteFromGoogle(
      "primary",
      eventId,
      accessToken
    );
    return [
      deleteFromGoogleResponse.statusCode === 200 ||
        deleteFromGoogleResponse.statusCode === 404,
      deleteFromGoogleResponse,
    ];
  } else {
    return [false];
  }
}

async function updateGoogle(calendarId, eventId, eventBody, accessToken) {
  const body = JSON.stringify(eventBody);
  const options = {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  };
  const res = await httpRequest(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    options,
    body
  );
  return res;
}

async function insertInGoogle(calendarId, eventBody, accessToken) {
  const body = JSON.stringify(eventBody);
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  };
  const res = await httpRequest(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    options,
    body
  );
  return res;
}

async function deleteFromGoogle(calendarId, eventId, eventBody, accessToken) {
  const res = await httpRequest(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
    JSON.stringify(eventBody)
  );
  return res;
}

async function fetchAccessToken(userAlibeezId) {
  const user = JSON.parse(
    (await fs.promises.readFile(`users/${userAlibeezId}.json`)).toString()
  );
  // if (new Date(user.accessTokenExpiration) > new Date()) {
  //   return user.accessToken;
  // }
  const postData = querystring.stringify({
    client_id: process.env.GOOGLE_OAUTH2_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH2_CLIENT_SECRET,
    refresh_token: user.refreshToken,
    grant_type: "refresh_token",
  });

  return new Promise((resolve, reject) => {
    const googkeTokenRequest = https.request(
      `https://oauth2.googleapis.com/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      async (googleTokenResponse) => {
        if (googleTokenResponse.statusCode !== 200) {
          let body = "";
          for await (const chunk of googleTokenResponse) {
            body += chunk.toString();
          }
          console.error(body);
          reject(
            new Error(
              `could not exchange code for token, Google returned HTTP error: ${googleTokenResponse.statusCode}`
            )
          );
        }
        let body = "";
        for await (const chunk of googleTokenResponse) {
          body += chunk.toString();
        }
        const { access_token: accessToken, expires_in: expiresIn } = JSON.parse(
          body
        );
        await fs.promises.writeFile(
          `users/${userAlibeezId}.json`,
          JSON.stringify({
            ...user,
            accessTokenExpiration: new Date(
              Date.now() + expiresIn * 1000
            ).toISOString(),
            accessToken,
          })
        );
        resolve(accessToken);
      }
    );
    googkeTokenRequest.on("error", (err) => {
      console.error(
        `could not exchange code for token, request failed: ${err.message}`
      );
    });
    googkeTokenRequest.write(postData);
    googkeTokenRequest.end();
  });
}

function craftEvent(item) {
  return {
    start: {
      dateTime: alibeezTimeToRealTime(
        item.startDay,
        item.startDayTime
      ).toISOString(),
      timeZone: "Europe/Paris",
    },
    end: {
      dateTime: alibeezTimeToRealTime(
        item.endDay,
        item.endDayTime
      ).toISOString(),
      timeZone: "Europe/Paris",
    },
    summary: "Congés (test, ignorer)",
  };
}

function alibeezTimeToRealTime(alibeezDate, alibeezTime) {
  if (alibeezTime === "MORNING") {
    const date = new Date(alibeezDate);
    date.setHours(9);
    return date;
  } else if (alibeezTime === "NOON") {
    const date = new Date(alibeezDate);
    date.setHours(13);
    return date;
  } else if (alibeezTime === "EVENING") {
    const date = new Date(alibeezDate);
    date.setHours(18);
    return date;
  }
  throw new Error(`invalid alibeez time: ${alibeezTime}`);
}

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      resolve(res);
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

if (require.main === module) {
  main();
}
