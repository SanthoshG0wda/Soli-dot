import "server-only";
import { execFile, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../db";
import { ownerOfDot } from "../repo";
import { assertDotId } from "../validate";

export const BOX_IMAGE = process.env.DOTS_BOX_IMAGE || "node:22-bookworm";
const MAX_OUTPUT = 12_000;
const UID_BASE = 20000;
const UID_RANGE = 30000;

let dockerChecked: { ok: boolean; at: number } | null = null;

export function dockerAvailable(): boolean {
  if (dockerChecked && Date.now() - dockerChecked.at < 30_000) return dockerChecked.ok;
  const r = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], { timeout: 5000 });
  dockerChecked = { ok: r.status === 0, at: Date.now() };
  return dockerChecked.ok;
}

export function workspaceDir(dotId: string): string {
  assertDotId(dotId);
  const dir = path.join(DATA_DIR, "dots", dotId, "workspace");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// One container per user, one Linux account per agent inside it:
//   container  soli-user-{userId}   shared by all of the user's dots
//   account    ag-{dot fragment}    deterministic per dot, fixed UID
// The agent's workspace is chown'ed to its UID (mode 700) so agents cannot
// reach each other's files through the shell. Browser profiles stay per-dot
// on the host (browser.ts), so each agent also keeps its own separate browser.
const userKey = (userId: string) => (userId || "legacy").replace(/[^a-z0-9_]/gi, "").slice(0, 32) || "legacy";
const containerName = (userId: string) => `soli-user-${userKey(userId)}`;
const agentName = (dotId: string) => `ag-${dotId.replace(/[^a-z0-9]/gi, "").slice(0, 24).toLowerCase()}`;

function baseUid(dotId: string): number {
  const h = createHash("sha256").update(dotId).digest();
  return UID_BASE + (h.readUInt32BE(0) % UID_RANGE);
}

/** Cheap synchronous docker probe. Never throws. */
function dockerSh(args: string[]): { ok: boolean; out: string } {
  try {
    const r = spawnSync("docker", args, { timeout: 15000 });
    return { ok: r.status === 0, out: (r.stdout?.toString() ?? "").trim() };
  } catch {
    return { ok: false, out: "" };
  }
}

async function ensureUserContainer(userId: string): Promise<string> {
  const name = containerName(userId);
  const running = dockerSh(["inspect", "-f", "{{.State.Running}}", name]);
  if (running.ok && running.out === "true") return name;
  if (running.ok) {
    dockerSh(["start", name]);
    return name;
  }
  await run("docker", [
    "run", "-d", "--name", name, "--hostname", "soli",
    "--memory", "4g", "--cpus", "4",
    "-v", `${path.join(DATA_DIR, "dots")}:/dots`,
    "-w", "/dots", BOX_IMAGE, "sleep", "infinity",
  ], { timeoutMs: 180_000 });
  return name;
}

/** Ensure the dot's Linux account exists and owns its workspace. Returns the UID to exec as. */
async function ensureAgentUser(container: string, dotId: string): Promise<number> {
  const name = agentName(dotId);
  const existing = dockerSh(["exec", container, "id", "-u", name]);
  if (existing.ok) {
    const uid = Number(existing.out);
    if (Number.isInteger(uid)) {
      dockerSh(["exec", container, "chown", "-R", `${uid}:${uid}`, `/dots/${dotId}/workspace`]);
      dockerSh(["exec", container, "chmod", "700", `/dots/${dotId}/workspace`]);
      return uid;
    }
  }
  let uid = baseUid(dotId);
  for (let i = 0; i < 100; i++) {
    const candidate = UID_BASE + ((uid - UID_BASE + i) % UID_RANGE);
    if (!dockerSh(["exec", container, "getent", "passwd", String(candidate)]).ok) {
      uid = candidate;
      break;
    }
    if (i === 99) throw new Error("No free UID for agent user.");
  }
  const setup = dockerSh(["exec", container, "bash", "-lc",
    `groupadd -g ${uid} ${name} 2>/dev/null; useradd -m -u ${uid} -g ${uid} -s /bin/bash ${name} && chown -R ${uid}:${uid} /dots/${dotId}/workspace && chmod 700 /dots/${dotId}/workspace && echo OK`]);
  if (!setup.ok || !setup.out.includes("OK")) throw new Error(`Failed to create agent user ${name}.`);
  return uid;
}

function run(cmd: string, args: string[], opts: { cwd?: string; timeoutMs: number; signal?: AbortSignal }): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: opts.cwd, timeout: opts.timeoutMs, maxBuffer: 8 * 1024 * 1024, signal: opts.signal }, (err, stdout, stderr) => {
      let out = `${stdout ?? ""}${stderr ? `\n[stderr]\n${stderr}` : ""}`.trim();
      if (err && "code" in err && err.code !== undefined) out += `\n[exit ${String(err.code)}]`;
      if (err && err.name === "AbortError") out += "\n[stopped]";
      if (err && "killed" in err && err.killed) out += "\n[timed out]";
      if (out.length > MAX_OUTPUT) out = `${out.slice(0, MAX_OUTPUT / 2)}\n…[truncated]…\n${out.slice(-MAX_OUTPUT / 2)}`;
      resolve(out || "(no output)");
    });
  });
}

/** Run a shell command as the dot's own Linux user inside its owner's container. */
export async function runOnDotComputer(dotId: string, command: string, signal?: AbortSignal): Promise<string> {
  if (dockerAvailable()) {
    const userId = ownerOfDot(dotId);
    const container = await ensureUserContainer(userId);
    workspaceDir(dotId); // mkdir on the host first so chown has something to own
    const uid = await ensureAgentUser(container, dotId);
    return run("docker", ["exec", "--user", `${uid}:${uid}`, "-w", `/dots/${dotId}/workspace`, container, "bash", "-lc", command], { timeoutMs: 120_000, signal });
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Isolated container execution is unavailable. Host shell execution is disabled in production.");
  }
  return run("bash", ["-lc", command], { cwd: workspaceDir(dotId), timeoutMs: 120_000, signal });
}

/** Run a command on the user's own machine (the computer running this app). Always gated by approvals. */
export async function runOnUserComputer(command: string, signal?: AbortSignal): Promise<string> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Direct host execution is disabled on the production cloud server.");
  }
  return run("bash", ["-lc", command], { cwd: process.env.HOME, timeoutMs: 120_000, signal });
}

export function resolveWorkspacePath(dotId: string, p: string): string {
  const root = fs.realpathSync(workspaceDir(dotId));
  const rel = p.replace(/^\/?workspace\/?/, "");
  const full = path.resolve(root, rel);
  if (fs.existsSync(full)) {
    const realTarget = fs.realpathSync(full);
    if (realTarget !== root && !realTarget.startsWith(root + path.sep)) {
      throw new Error("Path must stay inside /workspace (symlink escape detected)");
    }
  } else if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error("Path must stay inside /workspace");
  }
  return full;
}

export function resetDotComputer(dotId: string) {
  // Drop the agent's Linux account (its container is shared with the owner's
  // other dots, so it stays). The host workspace is kept, as before.
  if (!dockerAvailable()) return;
  try {
    const container = containerName(ownerOfDot(dotId));
    dockerSh(["exec", container, "userdel", "-f", agentName(dotId)]);
  } catch {
    /* container may be gone — nothing to reset */
  }
}
