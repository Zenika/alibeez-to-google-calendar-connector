import * as http from "http";
import { createReadStream } from "fs";
import { promisify } from "util";
import { pipeline } from "stream";

const pipelineAsync = promisify(pipeline);

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
export async function homePageHandler(req, res) {
  res.writeHead(200, { "Content-Type": "text/html" });
  await pipelineAsync(createReadStream("src/home.html"), res);
  res.end();
}
