/**
 *
 * @param {string | URL} base
 * @param {string} pathname
 * @param {object} searchParams
 * @returns {URL}
 */
export function createUrl(base, pathname, searchParams) {
  const baseUrl = new URL(base.toString());
  const url = new URL(baseUrl.pathname + pathname, base);
  const urlSearchParams = new URLSearchParams(searchParams);
  for (const [key, value] of urlSearchParams.entries()) {
    url.searchParams.set(key, value);
  }
  return url;
}
