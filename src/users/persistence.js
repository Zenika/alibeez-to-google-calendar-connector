import * as fs from "fs";

export const persistence = {
  upsert: async function upsert(user) {
    const {isValidUser, error} = persistence.validateUser(user);

    if (!isValidUser) {
      return error;
    }

    await fs.promises.mkdir("users", { recursive: true });
    await fs.promises.writeFile(
      `users/data/${user.alibeezId}.json`,
      JSON.stringify(user)
    );

    return true;
  },

  validateUser() {
    return {isValidUser: true};
    //todo
  }
}


