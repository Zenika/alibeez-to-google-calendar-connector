import * as http from "http";
import * as https from "https";

/**
 *
 * @param {{ url: string | URL, body?: string } & https.RequestOptions} options
 * @returns {Promise<http.IncomingMessage>}
 */
export function request({ url, body, ...nativeOptions }) {
  const effectiveOptions = body
    ? {
        ...nativeOptions,
        headers: {
          ...nativeOptions.headers,
          "Content-Length": Buffer.byteLength(body),
        },
      }
    : nativeOptions;
  return new Promise((resolve, reject) => {
    const req = https.request(url, effectiveOptions, resolve);
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

/**
 *
 * @param {http.IncomingMessage} response
 */
export async function parseBodyAsJson(response) {
  const contentType = response.headers["content-type"];
  if (!contentType.includes("json")) {
    console.warn(
      `WARN: Parsing body as JSON but Content-Type is '${contentType}'`
    );
  }
  let body = "";
  for await (const chunk of response) {
    body += chunk.toString();
  }
  return JSON.parse(body);
}
