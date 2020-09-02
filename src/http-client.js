import * as http from "http";
import * as https from "https";

/**
 * @typedef {{ url: string | URL, body?: string } & https.RequestOptions} HttpClientOptions
 */

/**
 *
 * @param {HttpClientOptions} options
 * @returns {Promise<http.IncomingMessage>}
 */
export function request(options) {
  const { url, body, ...nativeOptions } = options;
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
    const req = https.request(url, effectiveOptions, async (response) => {
      if (response.statusCode < 400) {
        resolve(response);
      } else {
        reject(await HttpClientError.of(options, response));
      }
    });
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
  if (!hasJsonBody(response)) {
    console.warn(
      `WARN: Parsing body as JSON but Content-Type is '${response.headers["content-type"]}'`
    );
  }
  const text = await parseBodyAsText(response);
  return JSON.parse(text);
}

export function hasJsonBody(response) {
  return (response.headers["content-type"] || "").includes("json");
}

export async function parseBodyAsText(response) {
  let body = "";
  for await (const chunk of response) {
    body += chunk.toString();
  }
  return body;
}

export class HttpClientError extends Error {
  /**
   *
   * @param {HttpClientOptions} requestOptions
   * @param {http.IncomingMessage} response
   */
  static async of(requestOptions, response) {
    const responseBody = await parseBodyAsText(response);
    return new HttpClientError(requestOptions, {
      statusCode: response.statusCode,
      headers: response.headers,
      body: responseBody,
    });
  }

  /**
   *
   * @param {HttpClientOptions} requestOptions
   * @param {{ statusCode: number, headers: http.IncomingHttpHeaders, body: string }} response
   */
  constructor(requestOptions, response) {
    super("External HTTP service responded with error status code");
    this.requestOptions = requestOptions;
    this.response = response;
  }

  get statusCode() {
    return this.response.statusCode;
  }
}
