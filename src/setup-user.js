import { parseJwtClaims } from "./utils/jwt.js";
import { exchangeCodeForTokens, claimsMatch } from "./google-oauth-client.js";
import { getUserByUsername } from "./alibeez-client.js";
import { mapUser } from "./users/user-mapper.js";
import { userService } from "./users/user-service.js";

export async function setupUser(code) {
  const tokens = await exchangeCodeForTokens(code);
  const claims = parseJwtClaims(tokens.id_token);
  if (!claimsMatch(claims)) {
    return null;
  }
  const request = await getUserByUsername(claims.email);
  const alibeezId = request.result[0].uuid;
  const accessToken = tokens.access_token;
  const user = mapUser({
    ...claims,
    alibeezId: alibeezId,
    accessToken: accessToken,
    refreshToken: tokens.refresh_token,
  });
  return await userService.upsert(user);
}
