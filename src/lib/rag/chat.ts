import { z } from "zod";
import type { RetrievedChunk } from "@/lib/retrieval/retrieval";
import {
  LIBRARY_REFUSAL,
  resolveSources,
  type RagSource,
} from "@/lib/rag/rag";
import { buildRagContext } from "@/lib/rag/context";
import {
  buildGeneralSystemPrompt,
  buildRagSystemPrompt,
} from "@/lib/rag/system-prompt";

export interface ChatRagInput {
  question: string;
  documentIds?: string[];
  limit?: number;
  minScore?: number;
}

export interface ChatRagDeps {
  defaultLimit: number;
  defaultMinScore: number;
  maxContextChars: number;
  maxChunkChars: number;
  retrieve: (input: {
    query: string;
    documentIds?: string[];
    limit?: number;
    minScore?: number;
  }) => Promise<RetrievedChunk[]>;
}

export type ChatRagPlan =
  | {
      kind: "general";
      system: string;
      prompt: string;
    }
  | {
      /** Corpus miss on a question that needs sources: render this text
       * verbatim (no LLM call). Identical to the API/tool refusal. */
      kind: "refusal";
      text: string;
    }
  | {
      kind: "proceed";
      system: string;
      prompt: string;
      /** Chunks that made it into the context block, in cite order. */
      contextChunks: RetrievedChunk[];
    };

/**
 * Fail-closed question triage for empty retrieval: legal/document questions
 * must get the honest refusal, never a parametric answer. Chit-chat (greetings,
 * thanks, capability questions — short and keyword-free) still gets a normal
 * general reply.
 */
export function looksLegalQuestion(question: string): boolean {
  const q = question.trim().toLowerCase();
  if (!q) return false;
  if (
    /\b(section|article|act|statute|chapter|clause|rule|regulation|amendment|schedule|case|judgment|judgement|petition|fir|bail|court|tribunal|ipc|bns|bnss|bsa|crpc|cpc|constitution|law|legal|right|rights|offence|offense|punish|sentence|trial|appeal|writ|contract|agreement|deed|affidavit|evidence|witness|accused|plaintiff|defendant|jurisdiction|precedent|ratio|obiter|marriage|divorce|custody|maintenance|succession|dowry|honour|honor)\b/.test(
      q,
    )
  ) {
    return true;
  }
  if (/§|\b(article|section)\s*\d+/i.test(question)) return true;
  // A substantive question with no corpus hit still needs sources.
  return q.split(/\s+/).length > 12;
}

const inputSchema = z.object({
  question: z.string().trim().min(1, "question must not be empty"),
  documentIds: z.array(z.string().trim().min(1)).min(1).optional(),
  limit: z.number().int().positive().optional(),
  minScore: z.number().min(0).max(1).optional(),
});

/**
 * Retrieval + prompt construction for the streaming chat route. The actual
 * text generation runs in the route via `streamText`, but everything that can
 * be reasoned about deterministically lives here (and is testable without an
 * LLM): input validation, retrieval, context assembly, and the prompt the
 * model receives.
 */
export async function planRagChat(
  input: ChatRagInput,
  deps: ChatRagDeps,
): Promise<ChatRagPlan> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid chat input: ${parsed.error.issues[0]?.message}`);
  }

  const retrieved = await deps.retrieve({
    query: parsed.data.question,
    documentIds: parsed.data.documentIds,
    limit: parsed.data.limit ?? deps.defaultLimit,
    minScore: parsed.data.minScore ?? deps.defaultMinScore,
  });

  if (retrieved.length === 0) {
    const { findTemplateForQuery } = await import("@/legal/templates/registry");
    const template = findTemplateForQuery(parsed.data.question);
    if (template) {
      const draftingSystem =
        `You are Soli, a specialized Indian legal AI paralegal. ` +
        `The user has requested a legal paper or court petition draft. ` +
        `Use the standard courtroom template below to generate a formal, court-ready draft with complete cause titles, grounds, precedents, prayer, and verification clauses.\n\n` +
        `Template: ${template.title}\nAct: ${template.act}\nSections: ${template.sections.join(", ")}\n` +
        `Key Precedents: ${template.keyPrecedents.join("; ")}\n\n` +
        `Template Framework:\n${template.templateText}`;
      return {
        kind: "general",
        system: draftingSystem,
        prompt: `Draft the following legal document with full courtroom precision: ${parsed.data.question}`,
      };
    }
    // Strict no-match: a question that needs sources gets the shared refusal,
    // never a general-knowledge answer dressed as legal advice.
    if (looksLegalQuestion(parsed.data.question)) {
      return { kind: "refusal", text: LIBRARY_REFUSAL };
    }
    return {
      kind: "general",
      system: buildGeneralSystemPrompt(),
      prompt: `Question: ${parsed.data.question}`,
    };
  }

  const { text: contextText, chunks } = buildRagContext(retrieved, {
    maxContextChars: deps.maxContextChars,
    maxChunkChars: deps.maxChunkChars,
  });

  const prompt = `<retrieved_context>\n${contextText}\n</retrieved_context>\n\nQuestion: ${parsed.data.question}`;

  return {
    kind: "proceed",
    system: buildRagSystemPrompt(),
    prompt,
    contextChunks: chunks,
  };
}

/** Sources that back a finished chat answer (cite markers in the text). */
export function chatSources(
  answer: string,
  contextChunks: RetrievedChunk[],
): RagSource[] {
  return resolveSources(answer, contextChunks);
}