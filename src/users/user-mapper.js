export function mapUser(data) {
  return {
    email: data.email,
    alibeezId: data.alibeezId,
    googleId: data.sub,
    accessTokenExpiration: new Date(data.exp * 1000).toISOString(),
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  }
}
