export function parseJwtClaims(jwt) {
  return JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString());
}
