import { parseJwtClaims } from "./utils/jwt.js";
import { exchangeCodeForTokens, claimsMatch } from "./google-oauth-client.js";
import { queryUsers } from "./alibeez-client.js";
import {
  saveUserInfo,
  saveRefreshToken,
  saveAccessToken,
} from "./users/user-service.js";

export async function setupUser(code) {
  const tokens = await exchangeCodeForTokens(code);
  const claims = parseJwtClaims(tokens.id_token);
  if (!claimsMatch(claims)) {
    return null;
  }
  const request = await queryUsers(
    ["uuid", "username"],
    [`username==${claims.email}`]
  );
  const alibeezId = request.result[0].uuid;
  await saveUserInfo(alibeezId, {
    email: claims.email,
    alibeezId,
    googleId: claims.sub,
  });
  await saveRefreshToken(alibeezId, tokens.refresh_token);
  await saveAccessToken(alibeezId, {
    token: tokens.access_token,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  });
}
