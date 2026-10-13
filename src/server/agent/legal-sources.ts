import "server-only";

import * as repo from "../repo";
import { parseCitedIndices } from "@/lib/rag/citations";

export interface LegalSourceRef {
  chunkId: string;
  filename: string;
  pageNumber?: number;
  excerpt: string;
}

const MAX_CALLS_KEPT = 5;
const MAX_SOURCES_POSTED = 8;
// Footers stay one line per source: number + document + page. No excerpts —
// the answer body already quotes what matters, and five 200-char quotes bury it.
const TITLE_CHARS = 64;

// Sources returned by legal_search during a turn, per call (each call numbers
// its own context 1..k). Keyed by dot; cleared when a new turn starts and when
// flushed. A paused-for-approval turn may lose its footer on resume — accepted:
// missing receipts beat misattributed ones.
const stash = new Map<string, LegalSourceRef[][]>();

export function stashLegalSources(dotId: string, refs: LegalSourceRef[]) {
  if (!refs.length) return;
  const lists = stash.get(dotId) ?? [];
  lists.push(refs.slice(0, 12));
  stash.set(dotId, lists.slice(-MAX_CALLS_KEPT));
}

export function clearLegalSources(dotId: string) {
  stash.delete(dotId);
}

function formatRef(n: number, r: LegalSourceRef): string {
  const where = r.pageNumber !== undefined ? ` (p. ${r.pageNumber})` : "";
  // Filenames arrive underscored/uppercased (EVA_NAMMAVA_ACT_2026.pdf); show
  // words, minus the extension, capped to one line.
  const title = r.filename
    .replace(/\.pdf$/i, "")
    .replace(/_/g, " ");
  const short = title.length > TITLE_CHARS ? `${title.slice(0, TITLE_CHARS)}…` : title;
  return `[${n}] ${short}${where}`;
}

/**
 * Post the turn's cited sources as a "Sources" footer message. Indices are
 * resolved against the most recent legal_search call (the context most likely
 * behind the final answer). Answers with no [n] markers get no footer — an
 * uncited answer must never come with a source dump.
 */
export function flushLegalSources(dotId: string, finalText: string) {
  const lists = stash.get(dotId);
  stash.delete(dotId);
  if (!lists?.length) return;
  const latest = lists[lists.length - 1]!;
  const indices = parseCitedIndices(finalText, latest.length);
  if (!indices.length) return;
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const n of indices) {
    const ref = latest[n - 1];
    if (!ref || seen.has(ref.chunkId)) continue;
    seen.add(ref.chunkId);
    lines.push(formatRef(n, ref));
    if (lines.length >= MAX_SOURCES_POSTED) break;
  }
  if (!lines.length) return;
  repo.addMessage({ dotId, role: "dot", title: "Sources", text: lines.join("\n") });
}
