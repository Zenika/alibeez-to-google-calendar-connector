import { randomBytes } from "crypto";

export function generateRandomState() {
  return randomBytes(4).readUInt32LE();
}
