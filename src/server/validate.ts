import "server-only";

// Central ID + parsing helpers. IDs are generated as `<prefix>_<16 hex>` in db.ts.
const ID_RE: Record<string, RegExp> = {
  dot: /^dot_[0-9a-f]{16}$/,
  conv: /^conv_[0-9a-f]{16}$/,
  ch: /^ch_[0-9a-f]{16}$/,
  msg: /^msg_[0-9a-f]{16}$/,
  file: /^file_[0-9a-f]{16}$/,
};

export function isValidId(prefix: "dot" | "conv" | "ch" | "msg" | "file", id: string): boolean {
  return ID_RE[prefix]?.test(id) ?? false;
}

export function isDotId(id: string): boolean {
  return isValidId("dot", id);
}

export function assertDotId(dotId: string): void {
  if (!isDotId(dotId)) throw new Error("Invalid dot id.");
}

/** JSON.parse that returns fallback instead of throwing on corrupt rows. */
export function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
