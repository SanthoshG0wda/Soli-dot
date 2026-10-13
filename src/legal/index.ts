import "server-only";

import {
  generateRagResponse,
  type RagResponse,
  type RagSource,
} from "@/lib/rag";

export interface LegalAnswerInput {
  question: string;
  organizationId?: string;
  userId?: string;
  documentIds?: string[];
  limit?: number;
  minScore?: number;
}

export type LegalAnswer = RagResponse;
export type LegalSource = RagSource;

/**
 * Deep module interface for Soli's legal knowledge engine.
 *
 * Callers ask one question and receive a grounded legal answer plus sources;
 * Qdrant, Postgres, embedding, chunking, and citation details stay behind
 * this interface.
 */
export async function answerLegalQuestion(
  input: LegalAnswerInput,
): Promise<LegalAnswer> {
  return generateRagResponse(input);
}

export * from "./templates/types";
export {
  LEGAL_TEMPLATES,
  getLegalTemplate,
  listLegalTemplates,
  findTemplateForQuery,
} from "./templates/registry";
