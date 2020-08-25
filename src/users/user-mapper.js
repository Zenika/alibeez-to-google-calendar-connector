export function mapUser(claims, alibeezId) {
  return {
    email: claims.email,
    alibeezId: alibeezId,
    googleId: claims.sub,
    accessTokenExpiration: new Date(
      Date.now() + claims.expiresIn * 1000
    ).toISOString(),
    accessToken: claims.accessToken,
    refreshToken: claims.refreshToken,
  }
}
