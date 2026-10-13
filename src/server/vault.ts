import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DATA_DIR } from "./db";
import { insertPassword, sealedPasswordFor } from "./repo";

// Passwords are AES-256-GCM encrypted at rest. The master key lives in the macOS
// Keychain when available, otherwise in a 0600 file under .data/. Plaintext secrets
// are only ever decrypted to type them into a page — never returned to the model or UI.

const SERVICE = "soli-vault";
const g = globalThis as unknown as { __dotsVaultKey?: Buffer };

function masterKey(): Buffer {
  if (g.__dotsVaultKey) return g.__dotsVaultKey;
  let hex: string | null = null;
  if (process.platform === "darwin") {
    try {
      hex = execFileSync("security", ["find-generic-password", "-s", SERVICE, "-a", "master", "-w"], { stdio: ["ignore", "pipe", "ignore"] })
        .toString().trim();
    } catch {
      hex = crypto.randomBytes(32).toString("hex");
      try {
        execFileSync("security", ["add-generic-password", "-s", SERVICE, "-a", "master", "-w", hex, "-U"], { stdio: "ignore" });
      } catch {
        hex = null;
      }
    }
  }
  if (!hex) {
    const file = path.join(DATA_DIR, "vault.key");
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
    hex = fs.readFileSync(file, "utf8").trim();
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    // Corrupt/truncated key file or Keychain entry: rotate to a fresh key
    // (old secrets become unreadable, which unseal() reports per-row).
    const fresh = crypto.randomBytes(32);
    if (process.platform !== "darwin") {
      try {
        fs.writeFileSync(path.join(DATA_DIR, "vault.key"), fresh.toString("hex"), { mode: 0o600 });
      } catch {}
    }
    g.__dotsVaultKey = fresh;
    return fresh;
  }
  g.__dotsVaultKey = key;
  return g.__dotsVaultKey;
}

/** Encrypt any secret with the vault key (also used for Composio OAuth tokens). */
export function seal(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function unseal(sealed: string): string {
  const parts = sealed.split(".");
  if (parts.length !== 3) throw new Error("Invalid sealed value.");
  const [iv, tag, data] = parts.map((s) => Buffer.from(s, "base64"));
  if (iv.length !== 12 || tag.length !== 16 || data.length === 0) throw new Error("Invalid sealed value.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function tryUnseal(sealed: string): string | null {
  try {
    return unseal(sealed);
  } catch {
    return null;
  }
}

export function savePassword(site: string, username: string, password: string, userId: string) {
  return insertPassword(site.trim(), username.trim(), seal(password), userId);
}

export function credentialFor(site: string, userId: string): { site: string; username: string; password: string } | null {
  const row = sealedPasswordFor(site, userId);
  if (!row) return null;
  try {
    return { site: row.site, username: row.username, password: unseal(row.sealed) };
  } catch {
    return null;
  }
}
