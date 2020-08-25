/**
 * This POC code, you may take inspiration but do NOT copy.
 */

const fs = require("fs");
const https = require("https");
const querystring = require("querystring");
const readline = require("readline");

async function main() {
  const lastUpdated = readLastUpdated();
  const filter = `updateDate>${lastUpdated}`;
  console.log(`pulling new data using ${filter}`);

  const query = querystring.stringify({
    key: process.env.ALIBEEZ_KEY,
    fields: [
      "uuid",
      "userUuid",
      "updateDate",
      "status",
      "startDay",
      "startDayTime",
      "endDay",
      "endDayTime",
    ].join(","),
    filter: [filter],
  });

  https.get(
    `https://dev2-infra.my.alibeez.com/api/query/leaves/requests?${query}`,
    async (res) => {
      if (res.statusCode !== 200) {
        console.error(`ERROR: Alibeez responded with status`, res.statusCode);
        return;
      }
      let responseBody = "";
      for await (chunk of res) {
        responseBody += chunk.toString("utf8");
      }
      const { result } = JSON.parse(responseBody);
      console.log("got", result.length, "items");
      result.sort((item1, item2) =>
        item1.updateDate.localeCompare(item2.updateDate)
      );
      const writer = fs.createWriteStream("fun.txt", { flags: "a" });
      for (const item of result) {
        writer.write(JSON.stringify(item) + "\n");
      }
      writer.close();
      if (result.length > 0) {
        writeLastUpdated(result[result.length - 1].updateDate);
      }
    }
  );
}

function readLastUpdated() {
  const fallback = new Date().toISOString().slice(0, -1);
  try {
    const content = fs.readFileSync("lastUpdated.txt").toString();
    if (!content.trim()) {
      return fallback;
    }
    return new Date(content).toISOString().slice(0, -1);
  } catch (err) {
    if (err.code === "ENOENT") {
      return fallback;
    }
    throw err;
  }
}

function writeLastUpdated(lastUpdated) {
  try {
    fs.writeFileSync("lastUpdated.txt", lastUpdated);
  } catch (err) {
    console.error(err, JSON.stringify(err));
    throw err;
  }
}

if (require.main === module) {
  main();
}
