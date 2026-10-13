import "server-only";

import { buildRagContext } from "@/lib/rag/context";
import { LIBRARY_REFUSAL } from "@/lib/rag/rag";
import { looksLegalQuestion } from "@/lib/rag/chat";
import { retrieveRelevantChunks } from "@/lib/retrieval";
import { VectorStoreError } from "@/lib/vector/errors";
import { effectiveRagLimits } from "@/server/limits";
import { stashLegalSources } from "./legal-sources";

/**
 * Deterministic legal grounding for agent turns. Prompt instructions alone
 * proved insufficient: twice the model skipped legal_search and answered a
 * statute question from parametric memory (wrong statute both times). So any
 * legal-looking user message gets the corpus consulted *for it*, up front —
 * the model no longer has the option of answering ungrounded.
 */
export const GUARD_PREFIX = "[Legal library context — mandatory grounding for the question above]\n";

/** Guard notes ride as user-role input items; they must never persist into stored history (next turn re-grounds fresh). */
export function isGuardItem(item: unknown): boolean {
  if (typeof item !== "object" || item === null) return false;
  const role = (item as { role?: unknown }).role;
  const content = (item as { content?: unknown }).content;
  return role === "user" && typeof content === "string" && content.startsWith(GUARD_PREFIX);
}

/**
 * Returns a grounding note to append to the turn input, or null when the
 * message needs no legal grounding. Stashes retrieved chunks for the
 * turn-end Sources footer. Never returns null for a legal-looking question:
 * a corpus miss becomes the shared refusal, an outage becomes an explicit
 * unavailable notice — both deterministic, never parametric memory.
 */
export async function legalGuardNote(dotId: string, text: string): Promise<string | null> {
  if (!looksLegalQuestion(text)) return null;
  const limits = effectiveRagLimits();
  let chunks;
  try {
    chunks = await retrieveRelevantChunks({ query: text, limit: limits.topK, minScore: limits.minScore });
  } catch (err) {
    if (err instanceof VectorStoreError) {
      return (
        `${GUARD_PREFIX}The legal library is temporarily unreachable (operations issue). ` +
        `Tell the user the library check could not be completed and offer to retry. ` +
        `Do not answer any statute, case, or document question from general knowledge.`
      );
    }
    throw err;
  }
  if (!chunks.length) {
    const { findTemplateForQuery } = await import("@/legal");
    const template = findTemplateForQuery(text);
    if (template) {
      return (
        `${GUARD_PREFIX}Standard Court Template Available: "${template.title}"\n` +
        `Applicable Act: ${template.act}\n` +
        `Sections: ${template.sections.join(", ")}\n` +
        `Key Precedents to Cite: ${template.keyPrecedents.join("; ")}\n\n` +
        `Court Draft Template Structure:\n${template.templateText}\n\n` +
        `Instruction: The user requested a legal paper or petition draft. Use the court template above to draft a complete, professional, court-ready document with all cause titles, grounds, prayer, and verification clauses. When calling write_legal_paper, the document content must be strictly the court draft itself without conversational introductions, chat greetings, or trailer commentary.`
      );
    }
    return `${GUARD_PREFIX}${LIBRARY_REFUSAL} Do not answer from general knowledge.`;
  }
  const { text: contextText, chunks: included } = buildRagContext(chunks, {
    maxContextChars: limits.contextMaxChars,
    maxChunkChars: limits.chunkMaxChars,
  });
  stashLegalSources(
    dotId,
    included.map((c) => ({ chunkId: c.chunkId, filename: c.filename, pageNumber: c.pageNumber, excerpt: c.content })),
  );
  return (
    `${GUARD_PREFIX}The retrieved context below (chunk numbers match [n] citations) is complete — ` +
    `do not call legal_search for this question. Cite supporting chunks inline with [n] markers; ` +
    `a Sources footer is attached automatically from the chunks you cite. Never invent citations.\n${contextText}`
  );
}
