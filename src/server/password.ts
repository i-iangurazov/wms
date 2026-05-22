import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export async function hashPassword(password: string) {
  const normalized = password.trim();
  if (normalized.length < 10) {
    throw new Error("Password must be at least 10 characters.");
  }
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(normalized, salt, keyLength)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) {
    return false;
  }
  const [algorithm, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }
  const expected = Buffer.from(hash, "hex");
  const actual = (await scrypt(password.trim(), salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
