import * as http from "http";
import { createReadStream } from "fs";
import { promisify } from "util";
import { pipeline } from "stream";

const pipelineAsync = promisify(pipeline);

/**
 *
 * @param {http.ServerResponse} res
 * @param {string} htmlFilePath to the html file, relative to cwd
 */
export async function serveHtmlFile(res, htmlFilePath) {
  res.writeHead(200, { "Content-Type": "text/html" });
  await pipelineAsync(createReadStream(htmlFilePath), res);
  res.end();
}
