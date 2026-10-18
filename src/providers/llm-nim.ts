import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { env } from "@/env";
import type { LLMProvider } from "@/providers/llm";

export class NimLLMProvider implements LLMProvider {
  readonly modelId: string;
  private readonly openai;

  constructor() {
    this.modelId = process.env.CUSTOM_LLM_MODEL || env.NIM_LLM_MODEL;
    this.openai = createOpenAI({
      baseURL: process.env.CUSTOM_LLM_BASE_URL || env.NIM_BASE_URL,
      apiKey: process.env.CUSTOM_LLM_API_KEY || env.NVIDIA_API_KEY,
    });
  }

  model(): LanguageModel {
    return this.openai(this.modelId);
  }
}