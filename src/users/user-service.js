import * as fs from "fs";
import * as path from "path";

const { USER_DIR = "data/users" } = process.env;
const INFO_FILE_NAME = "info.json";
const REFRESH_TOKEN_FILE_NAME = "refresh_token.json";
const ACCESS_TOKEN_FILE_NAME = "access_token.json";

export async function saveUserInfo(id, info) {
  await fs.promises.mkdir(path.join(USER_DIR, id), {
    recursive: true,
  });
  await fs.promises.writeFile(
    path.join(USER_DIR, id, INFO_FILE_NAME),
    JSON.stringify({
      info,
      createdAt: new Date().toISOString(),
    })
  );
}

export async function fetchRefreshToken(id) {
  try {
    const content = await fs.promises.readFile(
      path.join(USER_DIR, id, REFRESH_TOKEN_FILE_NAME)
    );
    return JSON.parse(content.toString()).token;
  } catch (err) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function saveRefreshToken(id, token) {
  await fs.promises.mkdir(path.join(USER_DIR, id), {
    recursive: true,
  });
  await fs.promises.writeFile(
    path.join(USER_DIR, id, REFRESH_TOKEN_FILE_NAME),
    JSON.stringify({
      token,
      createdAt: new Date().toISOString(),
    })
  );
}

export async function fetchAccessToken(id) {
  try {
    const content = await fs.promises.readFile(
      path.join(USER_DIR, id, ACCESS_TOKEN_FILE_NAME)
    );
    return JSON.parse(content.toString()).accessTokenInfo;
  } catch (err) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function saveAccessToken(id, accessTokenInfo) {
  await fs.promises.mkdir(path.join(USER_DIR, id), {
    recursive: true,
  });
  await fs.promises.writeFile(
    path.join(USER_DIR, id, ACCESS_TOKEN_FILE_NAME),
    JSON.stringify({
      accessTokenInfo,
      updatedAt: new Date().toISOString(),
    })
  );
}
