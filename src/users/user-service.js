import fs from "fs";

export const userService = {
  upsert: async (user) => {
    await fs.promises.mkdir(`data/users/${user.alibeezId}`, { recursive: true });

    await fs.promises.writeFile(
      `data/users/${user.alibeezId}/info.json`,
      JSON.stringify({
        email: user.email,
        alibeezId: user.alibeezId,
        googleId: user.googleId
      })
    );

    await fs.promises.writeFile(
      `data/users/${user.alibeezId}/token.json`,
      JSON.stringify({
        accessTokenExpiration: user.accessTokenExpiration,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken
      })
    );
  },

  updateUserToken: async (alibeezId, token) => {
    await fs.promises.writeFile(
      `data/users/${alibeezId}/token.json`,
      JSON.stringify({
        accessTokenExpiration: token.accessTokenExpiration,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken
      })
    );
  },

  getAllUsers: async () => {
    const userSet = new Set();
    const files = await fs.promises.readdir(`data/users`);

    files
      .forEach((alibeezId) => {
      const userInfo = userService.getUserInfoFromAlibeezId(alibeezId);
      const userToken = userService.getUserTokenFromAlibeezId(alibeezId);
      userSet.add({
        ...userInfo,
        ...userToken
      });
    });

    return [...userSet];
  },

  getUserInfoFromAlibeezId: (alibeezId) => {
    return JSON.parse(fs.readFileSync(`data/users/${alibeezId}/info.json`));
  },

  getUserTokenFromAlibeezId: (alibeezId) => {
    return JSON.parse(fs.readFileSync(`data/users/${alibeezId}/token.json`));
  }
}


