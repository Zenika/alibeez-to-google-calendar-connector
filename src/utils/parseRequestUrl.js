/**
 *
 * @param {string} requestUrl
 * @returns {URL}
 */
export function parseRequestUrl(requestUrl) {
  // URL requires an absolute URL so we provide a dummy base.
  return new URL(requestUrl, "http://example.com");
}
