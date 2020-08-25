import { parse as parseQueryString } from "querystring";
import { parse as parseUrl } from "url";

export function parseQuery(url) {
  const { search } = parseUrl(url);
  const queryString = search.slice(1);
  return parseQueryString(queryString);
}
