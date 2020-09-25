import { parseJwtClaims } from "./utils/jwt.js";
import { exchangeCodeForTokens, claimsMatch } from "./google-oauth-client.js";
import {
  saveUserInfo,
  saveRefreshToken,
  saveAccessToken,
} from "./persistence.js";
import { getPrimaryCalendar } from "./google-calendar-actions.js";
import { queryUserByUsername } from "./proxybeez-client.js";

export async function setupUser(code) {
  const tokens = await exchangeCodeForTokens(code);
  const claims = parseJwtClaims(tokens.id_token);
  if (!claimsMatch(claims)) {
    return null;
  }
  const { timeZone } = await getPrimaryCalendar(tokens.access_token);
  const userResponse = await queryUserByUsername(claims.email);
  const alibeezId = userResponse.result[0].uuid;
  await saveUserInfo(alibeezId, {
    email: claims.email,
    alibeezId,
    googleId: claims.sub,
    timeZone,
  });
  await saveRefreshToken(alibeezId, tokens.refresh_token);
  await saveAccessToken(alibeezId, {
    token: tokens.access_token,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  });
  return { alibeezId, accessToken: tokens.access_token };
}
