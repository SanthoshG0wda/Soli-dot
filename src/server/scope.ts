import "server-only";
import * as repo from "./repo";
import type { ServerEvent } from "@/lib/types";

// Which user an event belongs to. Returns null for per-user aggregates that
// the subscriber recomputes for themselves ("computer", "composio") — those
// are never forwarded raw — and for unknown ids (fail closed: not delivered).
export function eventOwnerId(ev: ServerEvent): string | null {
  switch (ev.type) {
    case "snapshot":
      return null;
    case "dot":
      return repo.ownerOfDot(ev.data.id) || null;
    case "dot_deleted":
      return repo.lastOwner(ev.id) ?? null;
    case "message":
      return repo.ownerOfMessage(ev.data.id) || null;
    case "message_delta":
      return repo.ownerOfDot(ev.dotId) || null;
    case "routine":
      return repo.ownerOfRoutine(ev.data.id) || null;
    case "routine_deleted":
      return repo.lastOwner(ev.id) ?? null;
    case "trigger":
      return repo.ownerOfTrigger(ev.data.id) || null;
    case "trigger_deleted":
      return repo.lastOwner(ev.id) ?? null;
    case "rule":
      return repo.ownerOfRule(ev.data.id) || null;
    case "rule_deleted":
      return repo.lastOwner(ev.id) ?? null;
    case "memory":
      return repo.ownerOfMemory(ev.data.id) || null;
    case "memory_deleted":
      return repo.lastOwner(ev.id) ?? null;
    case "skill":
      return repo.ownerOfSkill(ev.data.id) || null;
    case "skill_deleted":
      return repo.lastOwner(ev.id) ?? null;
    case "password":
      return repo.ownerOfPassword(ev.data.id) || null;
    case "password_deleted":
      return repo.lastOwner(ev.id) ?? null;
    case "screen":
    case "browser_url":
    case "notify":
      return repo.ownerOfDot(ev.dotId) || null;
    case "computer":
    case "composio":
      return null;
    case "channel":
      return repo.ownerOfChannel(ev.data.id) || null;
    case "channel_deleted":
      return repo.lastOwner(ev.id) ?? null;
    case "conversation":
      return repo.ownerOfConversation(ev.data.id) || null;
    case "conversation_deleted":
      return repo.lastOwner(ev.id) ?? null;
    case "artifact":
      return repo.ownerOfArtifact(ev.data.id) || null;
    case "artifact_deleted":
      return repo.lastOwner(ev.id) ?? null;
  }
}
