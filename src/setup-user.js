import { parseJwtClaims } from "./utils/jwt.js";
import { exchangeCodeForTokens, claimsMatch } from "./google-oauth-client.js";
import { getUserByUsername } from "./alibeez-client.js";
import { userService } from "./users/user-service.js";

export async function setupUser(code) {
  const tokens = await exchangeCodeForTokens(code);
  const claims = parseJwtClaims(tokens.id_token);
  if (!claimsMatch(claims)) {
    return null;
  }
  const request = await getUserByUsername(claims.email);
  const user = {
    email: claims.email,
    alibeezId: request.result[0].uuid,
    googleId: claims.sub,
    accessTokenExpiration: new Date(claims.exp * 1000).toISOString(),
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  };
  return await userService.upsert(user);
}
