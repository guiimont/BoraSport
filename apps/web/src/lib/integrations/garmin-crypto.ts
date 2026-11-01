import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyFor(userId: string) {
  const secret = process.env.GARMIN_CLIENT_SECRET;
  if (!secret) throw new Error("GARMIN_CLIENT_SECRET is not configured");
  return createHash("sha256").update(`${secret}:${userId}:borasport-garmin`).digest();
}

export function encryptGarminToken(value: string, userId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(userId), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptGarminToken(value: string, userId: string) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !encrypted) throw new Error("Invalid encrypted Garmin token");
  const decipher = createDecipheriv("aes-256-gcm", keyFor(userId), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
