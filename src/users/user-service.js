import fs from "fs";

export const userService = {
  upsert: async (user) => {
    await fs.promises.mkdir(`data/users/${user.alibeezId}`, { recursive: true });

    await fs.promises.writeFile(
      `data/users/${user.alibeezId}/info.json`,
      JSON.stringify({
        email: user.email,
        alibeezId: user.alibeezId,
        googleId: user.googleId,
        refreshToken: user.refreshToken
      })
    );

    await fs.promises.writeFile(
      `data/users/${user.alibeezId}/token.json`,
      JSON.stringify({
        accessTokenExpiration: user.accessTokenExpiration,
        accessToken: user.accessToken,
      })
    );
    return user;
  },

  updateUserToken: async (alibeezId, token) => {
    await fs.promises.writeFile(
      `data/users/${alibeezId}/token.json`,
      JSON.stringify({
        accessTokenExpiration: token.accessTokenExpiration,
        accessToken: token.accessToken
      })
    );
    return token;
  },

  getRefreshTokenFromAlibeezId: (alibeezId) => {
    return userService.getUserInfoFromAlibeezId(alibeezId).refreshToken;
  },

  getUserInfoFromAlibeezId: (alibeezId) => {
    return JSON.parse(fs.readFileSync(`data/users/${alibeezId}/info.json`));
  },

  getUserTokenFromAlibeezId: (alibeezId) => {
    return JSON.parse(fs.readFileSync(`data/users/${alibeezId}/token.json`));
  }
}


