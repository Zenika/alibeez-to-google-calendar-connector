import * as http from "http";
import { readFile } from "fs/promises";

/**
 *
 * @param {http.ServerResponse} res
 * @param {string} htmlFilePath path to the html file, relative to cwd
 * @param {number} status HTTP status to write to the response
 */
export async function renderView(res, htmlFilePath, params = {}, status = 200) {
  res.writeHead(status, { "Content-Type": "text/html" });
  const template = await readFile(htmlFilePath);
  const rendered = renderTemplate(template.toString(), params);
  res.write(rendered);
  res.end();
}

function renderTemplate(template, params) {
  return template.replace(/\${(.*?)}/g, (_, $1) => {
    if (!($1 in params)) {
      throw Object.assign(
        new TypeError(`Cannot render template: missing value for key '${$1}'`),
        { key: $1, params }
      );
    }
    return params[$1];
  });
}
