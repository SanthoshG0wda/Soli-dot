import "server-only";
import * as repo from "../repo";
import * as computer from "../computer";
import { RISKY_CLICK } from "../computer/dom-actions";
import { runOnUserComputer } from "../computer/shell";
import { credentialFor } from "../vault";
import { emit } from "../bus";
import * as composio from "../composio";
import * as files from "../files";
import { createDocumentArtifact } from "../documents";
import type { Dot, RuleDecision } from "@/lib/types";
import { VectorStoreError } from "@/lib/vector/errors";
import { stashLegalSources } from "./legal-sources";

export type ToolCtx = { dot: Dot; signal: AbortSignal; depth: number; userId: string };

type Schema = { type: "object"; properties: Record<string, unknown>; required: string[]; additionalProperties: false };

export type ToolDef = {
  name: string;
  description: string;
  parameters: Schema | Record<string, unknown>;
  /** Strict JSON-schema mode (our own tools). Composio's MCP tools have open-ended args, so they run non-strict. */
  strict?: boolean;
  /** Short present-tense label shown while running, e.g. "Running commands". */
  label: string;
  /** Natural-language description of the action, matched against the user's rules. Omit for always-safe tools. */
  describe?: (args: Record<string, unknown>, ctx: ToolCtx) => string;
  /** What happens when no user rule matches. */
  defaultDecision?: (ctx: ToolCtx, args: Record<string, unknown>) => RuleDecision | Promise<RuleDecision>;
  /** Runs before rules/approval; a returned string short-circuits as the tool's output (e.g. "app not connected"). */
  precheck?: (args: Record<string, unknown>, ctx: ToolCtx) => Promise<string | null>;
  /** Extra detail for the approval card (e.g. the exact tool and arguments). */
  detail?: (args: Record<string, unknown>) => string;
  /** "pause" tools stop the run and wait for the user (question / approval / connect-an-app card). */
  pause?: "question" | "approval" | "connect";
  execute?: (args: Record<string, unknown>, ctx: ToolCtx) => Promise<string>;
};

const obj = (properties: Record<string, unknown>, required = Object.keys(properties)): Schema => ({
  type: "object", properties, required, additionalProperties: false,
});
const str = (description: string) => ({ type: "string", description });
const nullableStr = (description: string) => ({ type: ["string", "null"], description });
const s = (v: unknown) => String(v ?? "");

// Delegation is injected by the runtime to avoid a circular import.
let consultImpl: ((target: Dot, message: string, from: Dot, depth: number, signal: AbortSignal) => Promise<string>) | null = null;
export function setConsult(fn: typeof consultImpl) {
  consultImpl = fn;
}

export const TOOLS: ToolDef[] = [
  {
    name: "run_command",
    label: "Running commands",
    description: "Run a bash command on your own computer (Linux; the working directory is your persistent workspace). Use it for scripts, data work, downloads, installing packages, etc.",
    parameters: obj({ command: str("The bash command to run") }),
    describe: (a) => `run \`${s(a.command)}\` on its own computer`,
    // Isolated computers (cloud/docker) run freely; the sandbox-folder fallback lives on the user's Mac, so ask.
    defaultDecision: (ctx) => (computer.modeFor(ctx.dot.id) === "local" ? "ask" : "allow"),
    execute: (a, ctx) => computer.runCommand(ctx.dot.id, s(a.command), ctx.signal),
  },
  {
    name: "read_file",
    label: "Reading a file",
    description: "Read a text file from your workspace.",
    parameters: obj({ path: str("Path relative to your workspace") }),
    execute: async (a, ctx) => {
      const buf = await computer.readFile(ctx.dot.id, s(a.path)).catch(() => null);
      return buf ? buf.toString("utf8").slice(0, 30_000) : `No such file: ${s(a.path)}`;
    },
  },
  {
    name: "write_file",
    label: "Writing a file",
    description: "Create or overwrite a text file in your workspace (reports, notes, code). Use share_file to hand a finished file to the user.",
    parameters: obj({ path: str("Path relative to your workspace"), content: str("Full file contents") }),
    execute: async (a, ctx) => `Wrote ${s(a.content).length} chars to ${await computer.writeFile(ctx.dot.id, s(a.path), s(a.content))}`,
  },
  {
    name: "share_file",
    label: "Sharing a file",
    description:
      "Send a file from your computer to the user in chat (reports, spreadsheets, images, exports, code). They get a notification and can preview or download it. Write the file first, then share it.",
    parameters: obj({ path: str("Path of the file in your workspace"), note: str("A short message to go with it") }),
    execute: async (a, ctx) => {
      const att = await files.shareFromComputer(ctx.dot.id, s(a.path), ctx.userId);
      const text = s(a.note) || `Here's ${att.name}.`;
      repo.addMessage({ dotId: ctx.dot.id, role: "dot", text, attachments: [att] });
      emit({ type: "notify", dotId: ctx.dot.id, title: `${ctx.dot.name} sent ${att.name}`, body: text.slice(0, 160) });
      return `Shared ${att.name} (${att.size} bytes) with the user. Don't repeat its contents unless asked.`;
    },
  },
  {
    name: "open_url",
    label: "Browsing the web",
    description: "Open a URL in your browser (you'll see it via the computer tool / read_page). Your browser keeps its logins.",
    parameters: obj({ url: str("URL to open") }),
    describe: (a) => `open ${s(a.url)} in its browser`,
    defaultDecision: () => "allow",
    execute: (a, ctx) => computer.openUrl(ctx.dot.id, s(a.url)),
  },
  {
    name: "read_page",
    label: "Reading the web",
    description: "Get the visible text of the page currently open in your browser.",
    parameters: obj({}),
    execute: (_a, ctx) => computer.readPage(ctx.dot.id),
  },
  {
    name: "click",
    label: "Using its computer",
    description:
      "Click something on the page open in your browser by its visible text (a button, link, tab, option, checkbox or label), e.g. \"Continue\" or \"Row F seat 12\". Read the page first so you use the exact text.",
    parameters: obj({ text: str("The visible text of what to click") }),
    describe: (a) => `click "${s(a.text)}" in its browser`,
    defaultDecision: (_c, a) => (RISKY_CLICK.test(s(a.text)) ? "ask" : "allow"),
    execute: (a, ctx) => computer.clickText(ctx.dot.id, s(a.text)),
  },
  {
    name: "type_text",
    label: "Using its computer",
    description: "Type into a field on the page open in your browser, found by its label, placeholder or name. Set submit to press Enter afterwards. Never use it for passwords (use sign_in).",
    parameters: obj({ field: str("Label, placeholder or name of the field"), text: str("What to type"), submit: { type: "boolean", description: "Press Enter after typing" } }, ["field", "text", "submit"]),
    describe: (a) => `type "${s(a.text).slice(0, 60)}" into "${s(a.field)}" in its browser`,
    defaultDecision: () => "allow",
    execute: (a, ctx) => computer.typeText(ctx.dot.id, s(a.field), s(a.text), Boolean(a.submit)),
  },
  {
    name: "sign_in",
    label: "Signing in",
    description:
      "Fill the login form on the current browser page using the user's saved password for a site. You never see the password. Open the site's sign-in page first, then submit the form yourself afterwards.",
    parameters: obj({ site: str("Site/domain of the login, e.g. github.com") }),
    describe: (a) => `sign in to ${s(a.site)} with the user's saved password`,
    defaultDecision: () => "ask",
    execute: async (a, ctx) => {
      const cred = credentialFor(s(a.site), ctx.userId);
      if (!cred) return `No saved password for ${s(a.site)}. Ask the user to add one under Passwords (never ask them to paste it in chat), or to take over your computer and log in themselves.`;
      return computer.fillLogin(ctx.dot.id, cred.username, cred.password);
    },
  },
  {
    name: "run_on_my_computer",
    label: "On your computer",
    description: "Run a bash command on the USER's own computer (their Mac). Only use when the task truly needs their machine; prefer your own computer.",
    parameters: obj({ command: str("The bash command to run on the user's computer") }),
    describe: (a) => `run \`${s(a.command)}\` on the user's personal computer`,
    defaultDecision: () => "ask",
    execute: async (a, ctx) => {
      if (!repo.getDot(ctx.dot.id)?.localAccess)
        return "You no longer have access to the user's computer. They can allow access again from this dot's settings on that computer.";
      return runOnUserComputer(s(a.command), ctx.signal);
    },
  },
  {
    name: "remember",
    label: "Remembering",
    description: "Save a durable fact or preference about the user or their work to your memory, so you know it in future conversations.",
    parameters: obj({ fact: str("The fact, written as a short standalone sentence") }),
    execute: async (a, ctx) => (repo.addMemory(ctx.dot.id, s(a.fact)), "Saved to memory."),
  },
  {
    name: "legal_search",
    label: "Checking legal sources",
    description:
      "Search Soli's legal RAG corpus and return a grounded answer with source excerpts. Use this for legal questions, statute/article/section checks, case/document questions, and verification of legal claims. Cite supporting chunks inline with [n] markers matching the numbered sources in the result; a Sources footer is attached automatically from the chunks you cite — never invent citations, and never answer from general knowledge when the result says the library has no source.",
    parameters: obj(
      {
        question: str("The legal question or claim to verify against the corpus"),
        documentIds: {
          type: "array",
          items: { type: "string" },
          description: "Optional document ids to restrict retrieval to",
        },
      },
      ["question"],
    ),
    execute: async (a, ctx) => {
      const { answerLegalQuestion } = await import("@/legal");
      const documentIds = Array.isArray(a.documentIds)
        ? a.documentIds.map((id) => s(id)).filter(Boolean)
        : undefined;
      try {
        const result = await answerLegalQuestion({
          question: s(a.question),
          ...(documentIds?.length ? { documentIds } : {}),
        });
        // Stash for the turn-end Sources footer (flushed in the run loop).
        stashLegalSources(
          ctx.dot.id,
          result.sources.map((src) => ({
            chunkId: src.chunkId,
            filename: src.filename,
            pageNumber: src.pageNumber,
            excerpt: src.excerpt,
          })),
        );
        return JSON.stringify(result);
      } catch (error) {
        // Infrastructure failure is not an empty library: say so explicitly so
        // the model reports an outage instead of an honest-looking refusal.
        if (error instanceof VectorStoreError) {
          return `Corpus unavailable (operations issue, code: ${error.code}). Tell the user the legal library is temporarily unreachable and offer to retry — do not answer the legal question from general knowledge.`;
        }
        const message = error instanceof Error ? error.message : String(error);
        return `Legal RAG search failed: ${message}`;
      }
    },
  },
  {
    name: "get_legal_template",
    label: "Fetching court draft template",
    description:
      "Load a standardized, court-ready Indian legal drafting template (e.g. regular_bail_bnss, anticipatory_bail_bnss, default_bail_bnss, quashing_528_bnss, discharge_bnss, section_138_ni_notice, preserve_cctv_cdr_bnss). Use this whenever the user asks to draft, write, prepare, or format a legal petition, application, or statutory notice.",
    parameters: obj(
      {
        templateId: str("Template id (regular_bail_bnss, anticipatory_bail_bnss, default_bail_bnss, quashing_528_bnss, discharge_bnss, section_138_ni_notice, preserve_cctv_cdr_bnss) or search keyword like 'bail', 'quash', '138', 'cctv'"),
      },
      ["templateId"],
    ),
    execute: async (a) => {
      const { getLegalTemplate, findTemplateForQuery, listLegalTemplates } = await import("@/legal");
      const id = s(a.templateId).trim();
      const t = getLegalTemplate(id) || findTemplateForQuery(id);
      if (!t) {
        const available = listLegalTemplates().map((x) => `${x.id}: ${x.title}`).join("\n");
        return `Template not found for "${id}". Available templates:\n${available}`;
      }
      return JSON.stringify({
        id: t.id,
        title: t.title,
        act: t.act,
        sections: t.sections,
        applicableCourt: t.applicableCourt,
        keyPrecedents: t.keyPrecedents,
        draftingChecklist: t.draftingChecklist,
        templateText: t.templateText,
      });
    },
  },
  {
    name: "write_text_document",
    label: "Writing text document",
    description:
      "Create a structured Markdown or text document artifact (legal research memos, notes, opinions, summaries). Automatically saves to the user's Artifact Board and generates preview and downloads.",
    parameters: obj(
      {
        title: str("Document title, e.g. 'Legal Research Note on Section 483 BNSS'"),
        filename: str("Filename with extension, e.g. 'research_memo_bnss_483.md'"),
        content: str("Complete document content in Markdown or text. STRICT REQUIREMENT: Must contain ONLY the actual document text itself — do NOT include chat greetings (e.g. 'Here is...'), chit-chat, or post-document sign-off commentary in this parameter."),
        summary: nullableStr("Optional one-line summary of the document"),
      },
      ["title", "filename", "content"],
    ),
    execute: async (a, ctx) => {
      const res = await createDocumentArtifact({
        dotId: ctx.dot.id,
        userId: ctx.userId,
        title: s(a.title),
        filename: s(a.filename),
        kind: "markdown",
        content: s(a.content),
        summary: a.summary ? s(a.summary) : undefined,
        generatePdf: true,
        generateDocx: true,
      });
      return `Document artifact "${res.artifact.title}" created successfully (ID: ${res.artifact.id}). It has been added to the user's Artifact Board with PDF and Word downloads available.`;
    },
  },
  {
    name: "write_pdf_document",
    label: "Writing PDF document",
    description:
      "Generate a professional PDF document with custom margins, title, running headers, and pagination. Creates an artifact that previews directly in the Artifact Board and is immediately downloadable as PDF.",
    parameters: obj(
      {
        title: str("PDF document title, e.g. 'Formal Demand Notice under Section 138 NI Act'"),
        filename: str("Filename ending with .pdf, e.g. 'demand_notice.pdf'"),
        content: str("Full document content with headings, paragraphs, and sections. STRICT REQUIREMENT: Must contain ONLY the actual document text itself without conversational chatter."),
        court_header: nullableStr("Optional court header or running title at top of pages"),
        summary: nullableStr("Optional one-line summary of the PDF"),
      },
      ["title", "filename", "content"],
    ),
    execute: async (a, ctx) => {
      const res = await createDocumentArtifact({
        dotId: ctx.dot.id,
        userId: ctx.userId,
        title: s(a.title),
        filename: s(a.filename),
        kind: "pdf",
        content: s(a.content),
        summary: a.summary ? s(a.summary) : undefined,
        metadata: a.court_header ? { court: s(a.court_header) } : undefined,
        generatePdf: true,
        generateDocx: true,
      });
      return `PDF artifact "${res.artifact.title}" generated successfully (ID: ${res.artifact.id}). PDF is ready for preview in the Artifact Board and download.`;
    },
  },
  {
    name: "write_docx_document",
    label: "Writing Word document",
    description:
      "Generate an editable Microsoft Word (.docx) document formatted with standard 1.5-inch left margins and 1.5 line spacing. Stored as an artifact in the user's Artifact Board.",
    parameters: obj(
      {
        title: str("Word document title, e.g. 'Petition for Quashing under Section 528 BNSS'"),
        filename: str("Filename ending with .docx, e.g. 'quashing_petition.docx'"),
        content: str("Full document text with cause title, grounds, and prayers. STRICT REQUIREMENT: Must contain ONLY the actual document text itself without conversational commentary."),
        summary: nullableStr("Optional one-line summary"),
      },
      ["title", "filename", "content"],
    ),
    execute: async (a, ctx) => {
      const res = await createDocumentArtifact({
        dotId: ctx.dot.id,
        userId: ctx.userId,
        title: s(a.title),
        filename: s(a.filename),
        kind: "docx",
        content: s(a.content),
        summary: a.summary ? s(a.summary) : undefined,
        generatePdf: true,
        generateDocx: true,
      });
      return `Word document artifact "${res.artifact.title}" created successfully (ID: ${res.artifact.id}). Available in the Artifact Board with Word (.docx) and PDF downloads.`;
    },
  },
  {
    name: "write_legal_paper",
    label: "Drafting court legal paper",
    description:
      "Draft a formal, court-ready Indian legal paper (Bail Application, Anticipatory Bail, Default Bail, Quashing 528 BNSS, Discharge, Section 138 Notice, Section 94 BNSS CCTV/CDR preservation, etc.). Automatically compiles both a court-margin PDF and an editable DOCX, and opens the Artifact Board for full document preview.",
    parameters: obj(
      {
        title: str("Petition title, e.g. 'Application for Regular Bail under Section 483 BNSS - Ramesh Kumar'"),
        filename: str("Filename, e.g. 'bail_application_ramesh.pdf'"),
        court_name: str("Name of the court, e.g. 'IN THE COURT OF THE PRINCIPAL DISTRICT AND SESSIONS JUDGE AT NEW DELHI'"),
        petitioner: str("Name and details of Applicant / Petitioner"),
        respondent: str("Name and details of Respondent / State"),
        fir_details: nullableStr("FIR No., Police Station, and Sections (e.g. 'FIR No. 42/2026, PS Connaught Place, u/s 318(4) BNS')"),
        content: str("Complete petition body containing: 1. Cause title, 2. Memo of parties, 3. Chronological facts, 4. Statutory grounds with precedents, 5. Prayer clause, 6. Verification & Affidavit. STRICT RULE: Must contain ONLY the petition text itself — do NOT include conversational preambles (e.g. 'Here is the draft...'), chit-chat, or post-document sign-offs in this parameter."),
        summary: nullableStr("Brief one-line summary of the petition"),
      },
      ["title", "filename", "court_name", "petitioner", "respondent", "content"],
    ),
    execute: async (a, ctx) => {
      const res = await createDocumentArtifact({
        dotId: ctx.dot.id,
        userId: ctx.userId,
        title: s(a.title),
        filename: s(a.filename),
        kind: "legal_paper",
        content: s(a.content),
        summary: a.summary ? s(a.summary) : undefined,
        metadata: {
          court: s(a.court_name),
          petitioner: s(a.petitioner),
          respondent: s(a.respondent),
          fir: a.fir_details ? s(a.fir_details) : undefined,
        },
        generatePdf: true,
        generateDocx: true,
      });
      return `Legal paper artifact "${res.artifact.title}" drafted successfully (ID: ${res.artifact.id}). Soli has generated both the court-margin PDF and editable Word DOCX. The user's Artifact Board will now display the document preview.`;
    },
  },
  {
    name: "forget",
    label: "Updating memory",
    description: "Delete a memory that is wrong or outdated.",
    parameters: obj({ memory_id: str("The id shown in your memory list") }),
    execute: async (a, ctx) => {
      if (repo.ownerOfMemory(s(a.memory_id)) !== ctx.userId) return "No such memory.";
      return (repo.deleteMemory(s(a.memory_id)), "Forgotten.");
    },
  },
  {
    name: "save_skill",
    label: "Learning a skill",
    description: "Save a reusable skill: step-by-step markdown instructions for a task you'll repeat. Updates the skill if the name exists.",
    parameters: obj({ name: str("Short skill name"), description: str("One line: when to use it"), instructions: str("Markdown instructions") }),
    execute: async (a, ctx) => (repo.upsertSkill(ctx.dot.id, s(a.name), s(a.description), s(a.instructions)), `Skill "${s(a.name)}" saved.`),
  },
  {
    name: "use_skill",
    label: "Using a skill",
    description: "Load the full instructions of one of your saved skills.",
    parameters: obj({ name: str("Skill name") }),
    execute: async (a, ctx) => {
      const skill = repo.listSkills(ctx.userId, ctx.dot.id).find((k) => k.name.toLowerCase() === s(a.name).toLowerCase());
      return skill ? skill.body : `No skill named "${s(a.name)}".`;
    },
  },
  {
    name: "create_routine",
    label: "Setting up a routine",
    description: "Create a recurring task you'll run on a schedule on your own, e.g. a morning briefing. Results reach the user via send_update.",
    parameters: obj({
      name: str("Short name"),
      instruction: str("What to do each time, written as a full instruction to yourself"),
      schedule: str("5-field cron expression in the user's local timezone, e.g. '0 8 * * 1-5' for weekdays at 8am"),
    }),
    describe: (a) => `set up a recurring routine "${s(a.name)}" (${s(a.schedule)})`,
    defaultDecision: () => "allow",
    execute: async (a, ctx) => {
      if (!repo.validSchedule(s(a.schedule))) return `Invalid cron expression: ${s(a.schedule)}`;
      const r = repo.addRoutine({ dotId: ctx.dot.id, name: s(a.name), instruction: s(a.instruction), schedule: s(a.schedule) });
      return `Routine created (id ${r.id}). Next run: ${r.nextRunAt ? new Date(r.nextRunAt).toString() : "unknown"}.`;
    },
  },
  {
    name: "delete_routine",
    label: "Updating routines",
    description: "Delete one of your routines.",
    parameters: obj({ routine_id: str("Routine id") }),
    describe: (a) => `delete routine ${s(a.routine_id)}`,
    defaultDecision: () => "allow",
    execute: async (a, ctx) => {
      if (repo.ownerOfRoutine(s(a.routine_id)) !== ctx.userId) return "No such routine.";
      return (repo.deleteRoutine(s(a.routine_id)), "Routine deleted.");
    },
  },
  {
    name: "send_update",
    label: "Messaging you",
    description:
      "Proactively message the user with a notification — for progress on long work, or to deliver results of background/routine work. Give finished deliverables a short title like 'Your research is ready'.",
    parameters: obj({ title: nullableStr("Short notification title, or null"), text: str("The message (markdown)") }),
    execute: async (a, ctx) => {
      const title = (a.title as string | null) || null;
      repo.addMessage({ dotId: ctx.dot.id, role: "dot", text: s(a.text), title });
      emit({ type: "notify", dotId: ctx.dot.id, title: title ?? ctx.dot.name, body: s(a.text).slice(0, 160) });
      return "Delivered to the user.";
    },
  },
  {
    name: "message_dot",
    label: "Messaging another dot",
    description: "Ask another of the user's dots for help or hand off a sub-task. Returns their reply.",
    parameters: obj({ dot_name: str("The other dot's name"), message: str("Your message to them, with all needed context") }),
    describe: (a) => `message the dot "${s(a.dot_name)}"`,
    defaultDecision: () => "allow",
    execute: async (a, ctx) => {
      const target = repo.findDotByName(s(a.dot_name), ctx.userId);
      if (!target) return `No dot named "${s(a.dot_name)}". Available: ${repo.listDots(ctx.userId).map((d) => d.name).join(", ")}`;
      if (target.id === ctx.dot.id) return "That's you.";
      if (target.status === "paused") return `${target.name} is paused.`;
      if (ctx.depth >= 2 || !consultImpl) return "Too many nested hand-offs; do it yourself.";
      return consultImpl(target, s(a.message), ctx.dot, ctx.depth + 1, ctx.signal);
    },
  },
  {
    name: "ask_user",
    label: "Waiting for you",
    description: "Ask the user a question and wait for the answer. Offer 2-4 likely answers as options when possible.",
    parameters: obj({ question: str("The question"), options: { type: "array", items: { type: "string" }, description: "Suggested answers (may be empty)" } }),
    pause: "question",
  },
  {
    name: "request_approval",
    label: "Waiting for approval",
    description:
      "Ask the user to approve an action before you take it (sending messages on their behalf, purchases, deleting things, submitting forms, anything irreversible or public). Wait for their decision.",
    parameters: obj({ action: str("What you want to do, one line"), details: str("Exactly what will happen: recipients, amounts, content, etc.") }),
    pause: "approval",
  },
];

// ---------- Composio For You: the user's apps (Gmail, Calendar, Slack, Notion, GitHub…) ----------

TOOLS.push({
  name: "app_connect",
  label: "Connecting an app",
  description:
    "Ask the user to connect one of their apps to Composio (shows a Connect card with a sign-in link) and wait until they finish. Use the exact toolkit slug from COMPOSIO_SEARCH_TOOLS.",
  parameters: obj({ toolkit: str("Toolkit slug, e.g. gmail, googlecalendar, slack, notion, github") }),
  pause: "connect",
});

/** Composio's hosted MCP tools, wrapped so they pass our rules and approval cards. */
function composioTools(userId: string): ToolDef[] {
  return composio.mcpTools(userId).map((t): ToolDef => {
    const base = {
      name: t.name,
      description: t.description ?? t.name,
      parameters: t.inputSchema as Record<string, unknown>,
      strict: false,
      execute: (a: Record<string, unknown>, ctx: ToolCtx) => composio.callTool(t.name, a, ctx.userId),
    };
    if (t.name === "COMPOSIO_MULTI_EXECUTE_TOOL") {
      return {
        ...base,
        label: "Using your apps",
        describe: (a) => composio.describeExecute(a),
        defaultDecision: (_ctx, a) => composio.executeDecision(a),
        detail: (a) => composio.executeDetail(a),
      };
    }
    if (t.name === "COMPOSIO_MANAGE_CONNECTIONS") {
      return {
        ...base,
        label: "Checking app connections",
        // New connections go through app_connect so the user gets a proper Connect card.
        precheck: async (a) =>
          ((a.toolkits as { action?: string }[] | undefined) ?? []).some((k) => (k.action ?? "add") === "add")
            ? "To connect an app, call app_connect with the toolkit slug instead (it shows the user a Connect card)."
            : null,
        describe: (a) => `change app connections (${JSON.stringify(a.toolkits ?? []).slice(0, 120)})`,
        defaultDecision: (_ctx, a) =>
          ((a.toolkits as { action?: string }[] | undefined) ?? []).every((k) => k.action === "list") ? "allow" : "ask",
      };
    }
    return { ...base, label: t.name === "COMPOSIO_SEARCH_TOOLS" ? "Finding app tools" : "Checking app tools" };
  });
}

export const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

/** Look up a tool by name, including Composio's dynamic ones. */
export function findTool(name: string, userId: string): ToolDef | undefined {
  return TOOL_BY_NAME.get(name) ?? composioTools(userId).find((t) => t.name === name);
}

export function toolsForDot(dot: Dot, userId: string): ToolDef[] {
  const signedIn = composio.signedIn(userId);
  return [
    ...TOOLS.filter((t) => (t.name !== "run_on_my_computer" || dot.localAccess) && (t.name !== "app_connect" || signedIn)),
    ...(signedIn ? composioTools(userId) : []),
  ];
}

export const COMPUTER_ENABLED = (process.env.DOTS_COMPUTER_TOOL ?? "computer") !== "off";
