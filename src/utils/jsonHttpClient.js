import * as http from "http";
import { httpRequest } from "./httpClient.js";
import { parseAsText } from "./streams.js";

/**
 *
 * @param {URL | string} url
 * @param {http.RequestOptions=} options
 * @param {unknown=} body
 * @returns {Promise<unknown | null>}
 */
export async function jsonExchangeHttpRequest(url, options = {}, body) {
  const effectiveOptions = {
    ...options,
    headers: { ...options.headers, "Content-Type": "application/json" },
  };
  return await jsonProducingHttpRequest(
    url,
    effectiveOptions,
    body && JSON.stringify(body)
  );
}

export async function jsonProducingHttpRequest(url, options = {}, body) {
  const response = await httpRequest(url, options, body);
  if (response.statusCode === 204) {
    return null;
  }
  const responseText = await parseAsText(response);
  try {
    return JSON.parse(responseText);
  } catch (err) {
    throw Object.assign(new Error(`Cannot parse response body as JSON`), {
      url: url.toString(),
      method: options.method,
      contentType: response.headers["content-type"],
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      body: responseText,
      jsonErrorMessage: err.message,
    });
  }
}
