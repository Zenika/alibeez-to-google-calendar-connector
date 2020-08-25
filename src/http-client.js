import https from "https";

export function request(url, options, body) {
  const effectiveOptions = body
    ? {
        ...options,
        headers: {
          ...options.headers,
          "Content-Length": Buffer.byteLength(body),
        },
      }
    : options;
  return new Promise((resolve, reject) => {
    const req = https.request(url, effectiveOptions, (res) => {
      resolve(res);
    });
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

export async function parseBodyAsJson(response) {
  let body = "";
  for await (const chunk of response) {
    body += chunk.toString();
  }
  return JSON.parse(body);
}
