import "server-only";

import { generateText } from "ai";
import { retrieveRelevantChunks } from "@/lib/retrieval";
import {
  generateRagResponse as runGenerateRagResponse,
  type RagDeps,
  type RagResponse,
} from "@/lib/rag/rag";
import { llmProvider } from "@/providers";
import { effectiveRagLimits } from "@/server/limits";

const model = llmProvider.model();

/**
 * Production RAG pipeline wiring: retrieval over Qdrant via
 * `retrieveRelevantChunks` and a NIM-hosted language model. Limits come from
 * the admin console (deployment-global SQLite overrides) with env fallbacks,
 * so firm admins can tune retrieval without redeploying.
 */
function buildDeps(): RagDeps {
  const limits = effectiveRagLimits();
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