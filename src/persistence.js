import * as fs from "fs";
import * as path from "path";

const USER_DIR = path.resolve(process.env.USER_DIR || "data/users");
console.log(`Using user directory path:`, USER_DIR);

const INFO_FILE_NAME = "info.json";
const REFRESH_TOKEN_FILE_NAME = "refresh_token.json";
const ACCESS_TOKEN_FILE_NAME = "access_token.json";

export async function fetchUserInfo(id) {
  const content = await tryReadUserFile(id, INFO_FILE_NAME);
  return content?.info;
}

export async function saveUserInfo(id, info) {
  await writeUserFile(id, INFO_FILE_NAME, { info });
}

export async function fetchRefreshToken(id) {
  const content = await tryReadUserFile(id, REFRESH_TOKEN_FILE_NAME);
  return content?.token;
}

export async function saveRefreshToken(id, token) {
  await writeUserFile(id, REFRESH_TOKEN_FILE_NAME, { token });
}

export async function fetchAccessToken(id) {
  const content = await tryReadUserFile(id, ACCESS_TOKEN_FILE_NAME);
  return content?.accessTokenInfo;
}

export async function saveAccessToken(id, accessTokenInfo) {
  await writeUserFile(id, ACCESS_TOKEN_FILE_NAME, { accessTokenInfo });
}

/**
 *
 * @param {string} userId
 * @param {string} fileName
 * @returns {Promise<* | null>}
 */
async function tryReadUserFile(userId, fileName) {
  try {
    const content = await fs.promises.readFile(
      path.join(USER_DIR, userId, fileName)
    );
    return JSON.parse(content.toString());
  } catch (err) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/**
 *
 * @param {string} userId
 * @param {string} fileName
 * @param {*} content
 */
async function writeUserFile(userId, fileName, content) {
  await fs.promises.mkdir(path.join(USER_DIR, userId), {
    recursive: true,
  });
  await fs.promises.writeFile(
    path.join(USER_DIR, userId, fileName),
    JSON.stringify({
      ...content,
      writtenAt: new Date().toISOString(),
    })
  );
}
