import "server-only";

import { generateText } from "ai";
import { retrieveRelevantChunks } from "@/lib/retrieval";
import {
  generateRagResponse as runGenerateRagResponse,
  type RagDeps,
  type RagResponse,
} from "@/lib/rag/rag";
import { llmProvider } from "@/providers";
const DEFAULT_RAG_LIMITS = {
  topK: 5,
  minScore: 0.65,
  contextMaxChars: 1200,
  chunkMaxChars: 800,
  temperature: 0.2,
};
const model = llmProvider.model();

function buildDeps(): RagDeps {
  const limits = DEFAULT_RAG_LIMITS;
  return {
    defaultLimit: limits.topK,
    defaultMinScore: limits.minScore,
    maxContextChars: limits.contextMaxChars,
    maxChunkChars: limits.chunkMaxChars,
    retrieve: (input) => retrieveRelevantChunks(input),
    complete: async ({ system, prompt }) => {
      const result = await generateText({
        model,
        system,
        prompt,
        temperature: limits.temperature,
      });
      return result.text;
    },
  };
}

export function generateRagResponse(input: {
  question: string;
  organizationId?: string;
  userId?: string;
  documentIds?: string[];
  limit?: number;
  minScore?: number;
}): Promise<RagResponse> {
  return runGenerateRagResponse(input, buildDeps());
}

export type { GenerateRagResponseInput, RagResponse, RagSource } from "@/lib/rag/rag";
export { buildRagSystemPrompt } from "@/lib/rag/system-prompt";