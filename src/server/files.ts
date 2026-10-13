import "server-only";
import fs from "node:fs";
import path from "node:path";
import { db, DATA_DIR, id } from "./db";
import * as computer from "./computer";
import type { Attachment } from "@/lib/types";

// Files that move between the user and a dot. The canonical copy lives in .data/files/<id>
// (for previews and downloads); a working copy goes into the dot's computer so it can use it.

const DIR = path.join(DATA_DIR, "files");
export const MAX_UPLOAD = 25 * 1024 * 1024;
// Total storage across all uploads; prevents unbounded disk fill from the upload route.
const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;

type Row = { id: string; dot_id: string; name: string; mime: string; size: number; source: string; box_path: string | null; created_at: number };

const safeName = (name: string) => name.replace(/[\\/:*?"<>|\x00-\x1f]+/g, "_").replace(/^\.+/, "").slice(0, 120) || "file";

export function guessMime(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return (
    {
      ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
      ".pdf": "application/pdf", ".txt": "text/plain", ".md": "text/markdown", ".csv": "text/csv", ".json": "application/json",
      ".html": "text/html", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".zip": "application/zip",
      ".py": "text/x-python", ".js": "text/javascript", ".ts": "text/plain",
    } as Record<string, string>
  )[ext] ?? "application/octet-stream";
}

function save(dotId: string, name: string, mime: string, data: Buffer, source: "user" | "dot", boxPath: string | null, userId: string): Attachment {
  try {
    fs.mkdirSync(DIR, { recursive: true });
  } catch {}
  const fileId = id("file");
  fs.writeFileSync(path.join(DIR, fileId), data);
  db()
    .prepare("INSERT INTO files (id, dot_id, name, mime, size, source, box_path, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(fileId, dotId, name, mime, data.length, source, boxPath, userId, Date.now());
  return { id: fileId, name, mime, size: data.length };
}

/** The user attached a file: store it and put a copy in the dot's workspace under uploads/. */
export async function upload(dotId: string, name: string, mime: string, data: Buffer, userId: string): Promise<Attachment & { boxPath: string }> {
  const clean = safeName(name);
  if (data.length > MAX_UPLOAD) throw new Error("That file is too large (over 25 MB).");
  const total = (db().prepare("SELECT COALESCE(SUM(size), 0) AS n FROM files WHERE user_id = ?").get(userId) as { n: number }).n;
  if (total + data.length > MAX_TOTAL_BYTES) throw new Error("File storage is full (2 GB limit). Delete old files first.");
  const boxPath = await computer.writeFile(dotId, `uploads/${clean}`, data);
  return { ...save(dotId, clean, mime || guessMime(clean), data, "user", boxPath, userId), boxPath };
}

/** The dot shares a file from its computer with the user. */
export async function shareFromComputer(dotId: string, p: string, userId: string): Promise<Attachment> {
  const data = await computer.readFile(dotId, p);
  if (data.length > MAX_UPLOAD * 4) throw new Error("That file is too large to share (over 100 MB).");
  const name = safeName(path.basename(p));
  return save(dotId, name, guessMime(name), data, "dot", p, userId);
}

/** Store a generated file directly (PDF, DOCX, text) without needing a sandbox workspace. */
export function saveFileDirectly(dotId: string, name: string, mime: string, data: Buffer, userId: string): Attachment {
  const clean = safeName(name);
  return save(dotId, clean, mime || guessMime(clean), data, "dot", null, userId);
}

export function get(fileId: string): (Attachment & { dotId: string; boxPath: string | null; data: () => Buffer }) | null {
  const r = db().prepare("SELECT * FROM files WHERE id = ?").get(fileId) as Row | undefined;
  if (!r) return null;
  return {
    id: r.id, name: r.name, mime: r.mime, size: r.size, dotId: r.dot_id, boxPath: r.box_path,
    data: () => fs.readFileSync(path.join(DIR, r.id)),
  };
}

export function boxPathOf(fileId: string): string | null {
  return get(fileId)?.boxPath ?? null;
}
