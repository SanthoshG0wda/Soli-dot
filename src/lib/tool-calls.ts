import {
  AppWindow,
  Brain,
  Clock,
  Globe,
  KeyRound,
  Laptop,
  MessageSquare,
  MonitorSmartphone,
  Search,
  Terminal,
} from "lucide-react";

/**
 * Raw tool-call dumps reach the UI as plain assistant text.
 *
 * The agent runtime streams tool invocations into the transcript as
 * `TOOL <name> <args-json>` lines instead of structured `activity` records.
 * Left alone these render as a wall of JSON in the bubble, which reads as a
 * crash dump rather than as work in progress. We parse them back out so the
 * renderer can show quiet chips instead.
 *
 * Shapes seen in real transcripts:
 *   TOOL computer {"url":"https://..."}
 *   TOOL web_search {"query":"..."}
 *   TOOL computer {            <- JSON continued on following lines
 *     "cmd": "ls -la"
 *   }
 *   TOOL read_file {"path":"..."}
 *   tool_call: read_file {"path":"..."}
 *   <tool name="browser" args="{}" />
 */

/** Arg keys we prefer to surface, in priority order. */
const DETAIL_KEYS = [
  "url",
  "uri",
  "query",
  "q",
  "search",
  "cmd",
  "command",
  "path",
  "file",
  "filename",
  "prompt",
  "instruction",
  "website",
  "domain",
  "name",
];

/** Human labels for the tools the agent actually exposes. */
const TOOL_LABEL: Record<string, string> = {
  computer: "Using its computer",
  browser: "Browsing",
  browser_navigate: "Opening a page",
  web_search: "Searching the web",
  search: "Searching",
  google_search: "Searching the web",
  navigate: "Opening a page",
  click: "Clicking",
  type: "Typing",
  scroll: "Scrolling",
  screenshot: "Taking a screenshot",
  read_page: "Reading a page",
  extract: "Extracting content",
  shell: "Running a command",
  bash: "Running a command",
  exec: "Running a command",
  run_command: "Running a command",
  read_file: "Reading a file",
  write_file: "Writing a file",
  edit_file: "Editing a file",
  list_files: "Listing files",
  memory: "Updating memory",
  remember: "Updating memory",
  recall: "Checking memory",
  skill: "Using a skill",
  app: "Using an app",
  send_email: "Sending an email",
  send_message: "Sending a message",
  create_event: "Adding a calendar event",
  fetch: "Fetching a URL",
  http: "Fetching a URL",
};

const ICON_FOR: [RegExp, typeof Globe][] = [
  [/search|google/i, Search],
  [/browser|navigate|url|page|fetch|http|web/i, Globe],
  [/computer|click|type|scroll|screenshot/i, MonitorSmartphone],
  [/shell|bash|exec|command/i, Terminal],
  [/file|read|write|edit|list/i, Terminal],
  [/email|mail|message|send/i, MessageSquare],
  [/calendar|event/i, Clock],
  [/skill|app/i, AppWindow],
  [/memory|remember|recall/i, Brain],
  [/login|auth|key|sign/i, KeyRound],
  [/laptop|desktop/i, Laptop],
];

export interface ToolCall {
  /** Raw tool identifier, e.g. "web_search". */
  tool: string;
  /** Parsed arguments, empty object when the payload was not valid JSON. */
  args: Record<string, unknown>;
  /** Human-readable label, e.g. "Searching the web". */
  label: string;
  /** Short detail derived from the most meaningful arg, if any. */
  detail?: string;
}

export interface ParsedMessage {
  /** Message text with every tool-dump block removed and whitespace tidied. */
  prose: string;
  /** Tool calls found, in the order they appeared. */
  tools: ToolCall[];
  /** True when at least one tool call was extracted. */
  hasTools: boolean;
}

/** Turn a tool id into a label a lawyer would read without flinching. */
function labelFor(tool: string): string {
  const key = tool.trim().toLowerCase();
  if (TOOL_LABEL[key]) return TOOL_LABEL[key];
  const prefix = Object.keys(TOOL_LABEL)
    .sort((a, b) => b.length - a.length)
    .find((k) => key.startsWith(k));
  if (prefix) return TOOL_LABEL[prefix];
  const words = key
    .split(/[_\-.]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return words || "Working";
}

/** Best-effort detail: hostname for URLs, else the most salient arg. */
function detailFrom(args: Record<string, unknown>): string | undefined {
  for (const key of DETAIL_KEYS) {
    const v = args[key];
    if (typeof v !== "string" || !v.trim()) continue;
    if (/^https?:\/\//i.test(v)) {
      try {
        return new URL(v).hostname.replace(/^www\./, "");
      } catch {
        return v.slice(0, 60);
      }
    }
    const oneLine = v.replace(/\s+/g, " ").trim();
    return oneLine.length > 48 ? `${oneLine.slice(0, 48)}…` : oneLine;
  }
  return undefined;
}

function parseArgs(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  for (const attempt of [trimmed, relax(trimmed)]) {
    try {
      const parsed = JSON.parse(attempt);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* try the next looser shape */
    }
  }
  return {};
}

/** Tolerate single quotes, unquoted keys and trailing commas. */
function relax(s: string): string {
  return s
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"')
    .replace(/,(\s*[}\]])/g, "$1");
}

/** Read a balanced `{...}` object starting at `start` (index of "{"). */
function readBalanced(text: string, start: number): { raw: string; end: number } | null {
  if (text[start] !== "{") return null;
  let depth = 0;
  let inStr = false;
  let quote = "";
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return { raw: text.slice(start, i + 1), end: i + 1 };
    }
  }
  return null;
}

/** `TOOL name ...` / `tool_call: name ...` — not prose that merely mentions TOOL. */
const PLAIN_TOOL_LINE = /^(?:TOOL|tool_call|tool)\s*[:=]?\s*([A-Za-z][\w.-]*)\s*(.*)$/i;
/** `<tool name="browser" args="{}" />` */
const XML_TOOL_LINE = /^<tool\s+name=["']([^"']+)["'][^>]*?(?:args=["']([^"']*)["'])?[^>]*\/?>\s*$/i;
/** Trailing text allowed after a tool id before we decide it is prose, not a call. */
const ALLOWED_TRAILING = /^[\s),.;:{"'\]]*$/;

/**
 * Split a message into clean prose plus any embedded tool invocations.
 * Cheap enough to call on every render, and returns the input untouched
 * when nothing matches.
 */
export function parseToolCalls(text: string): ParsedMessage {
  if (!text || !/\b(TOOL|tool_call|<tool)\b/i.test(text)) {
    return { prose: text ?? "", tools: [], hasTools: false };
  }

  const lines = text.split("\n");
  // Absolute start offset of each line within `text`.
  const starts: number[] = new Array(lines.length);
  let acc = 0;
  for (let k = 0; k < lines.length; k++) {
    starts[k] = acc;
    acc += lines[k].length + 1;
  }

  const tools: ToolCall[] = [];
  const kept: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const xml = XML_TOOL_LINE.exec(line.trim());

    if (!xml && !PLAIN_TOOL_LINE.test(line.trim())) {
      kept.push(line);
      i++;
      continue;
    }

    const tool = xml ? xml[1] : PLAIN_TOOL_LINE.exec(line.trim())![1];
    const rest = xml ? (xml[2] ?? "") : PLAIN_TOOL_LINE.exec(line.trim())![2];

    let argsRaw = "";
    let end = i;

    // Prefer JSON that opens on this same line.
    const openInLine = rest.indexOf("{");
    if (openInLine >= 0) {
      // `rest` starts right after the tool id / `<tool ...>` tag, so find its
      // column in `line` and measure the brace from there.
      const col = line.indexOf(rest);
      const abs = (col >= 0 ? col : 0) + openInLine + starts[i];
      const balanced = readBalanced(text, abs);
      if (balanced) {
        argsRaw = balanced.raw;
        end = i + (text.slice(starts[i], balanced.end).split("\n").length - 1);
      }
    } else if (ALLOWED_TRAILING.test(rest)) {
      // No JSON here — but it may open on the next line: `TOOL computer\n{...}`
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j < lines.length && lines[j].trim().startsWith("{")) {
        const balanced = readBalanced(text, starts[j]);
        if (balanced) {
          argsRaw = balanced.raw;
          end = i + (text.slice(starts[i], balanced.end).split("\n").length - 1);
        }
      }
    } else {
      // Prose that happens to start with the word "TOOL" — leave it alone.
      kept.push(line);
      i++;
      continue;
    }

    const args = parseArgs(argsRaw);
    tools.push({ tool, args, label: labelFor(tool), detail: detailFrom(args) });
    i = end + 1;
  }

  const prose = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!tools.length) return { prose: text, tools: [], hasTools: false };
  return { prose, tools, hasTools: true };
}

/** Icon for a tool call, matching the activity-row icon conventions. */
export function toolIcon(tool: string) {
  const hit = ICON_FOR.find(([re]) => re.test(tool));
  return hit ? hit[1] : MonitorSmartphone;
}
