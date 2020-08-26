import fs from "fs";

export async function userUpsert(user) {
  await fs.promises.mkdir("src/users/data", { recursive: true });
  await fs.promises.writeFile(
    `src/users/data/${user.alibeezId}.json`,
    JSON.stringify(user)
  );
}


