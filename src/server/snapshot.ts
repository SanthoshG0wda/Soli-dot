import "server-only";
import * as repo from "./repo";
import { dockerAvailable, BOX_IMAGE } from "./computer/shell";
import { defaultMode } from "./computer";
import { knownModels, hasKey, keySource } from "./agent/client";
import { COMPUTER_ENABLED } from "./agent/tools";
import { skyInstalled } from "./computer/sky";
import { cloudKeySource } from "./computer/cloud";
import { openRouterSource } from "./agent/openrouter";
import { nvidiaSource } from "./agent/nvidia";
import { groqSource } from "./agent/groq";
import { antigravitySource } from "./agent/antigravity";
import { triggersKeySource } from "./triggers";
import { apps, signedIn } from "./composio";
import type { ComputerInfo, Snapshot } from "@/lib/types";

export function computerInfo(userId: string): ComputerInfo {
  const m = knownModels(userId);
  return {
    mode: defaultMode(),
    docker: dockerAvailable(),
    image: BOX_IMAGE,
    model: m.defaultModel,
    models: m.available,
    computerTool: COMPUTER_ENABLED ? "computer" : "off",
    hasKey: hasKey(userId),
    keySource: keySource(userId),
    cloudKey: cloudKeySource(),
    openRouter: openRouterSource(userId),
    nvidia: nvidiaSource(userId),
    groq: groqSource(userId),
    antigravity: antigravitySource(userId),
    triggersKey: triggersKeySource(userId),
    sky: skyInstalled(),
    composio: signedIn(userId),
  };
}

export function snapshot(userId: string): Snapshot {
  return {
    dots: repo.listDots(userId),
    messages: [...repo.recentMessages(userId, 120), ...repo.channelMessages(userId, 300)],
    artifacts: repo.listArtifacts(userId),
    routines: repo.listRoutines(userId),
    triggers: repo.listTriggers(userId),
    rules: repo.listRules(userId),
    memories: repo.listMemories(userId),
    skills: repo.listSkills(userId),
    passwords: repo.listPasswords(userId),
    computer: computerInfo(userId),
    apps: apps(userId),
    channels: repo.listChannels(userId),
    conversations: repo.listConversations(userId),
  };
}
