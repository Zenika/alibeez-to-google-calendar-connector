import * as fs from "fs";

export async function userUpsert(user) {
  await fs.promises.mkdir("users", { recursive: true });
  await fs.promises.writeFile(
    `users/data/${user.alibeezId}.json`,
    JSON.stringify(user)
  );

  return true;
}


