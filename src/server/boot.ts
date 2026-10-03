import "server-only";
import * as repo from "./repo";
import { emit } from "./bus";
import { canThink, models } from "./agent/client";
import { computerInfo } from "./snapshot";
import { startScheduler } from "./scheduler";
import { startEvents as startTriggerEvents } from "./triggers";
import { refresh as refreshComposio, signedIn } from "./composio";

export function boot() {
  // Nothing is running after a restart; don't leave dots stuck in "working".
  for (const dot of repo.listDots()) {
    if (dot.status === "working") repo.updateDot(dot.id, { status: repo.pendingCards(dot.id).length ? "waiting" : "idle" });
  }
  try {
    startScheduler();
  } catch (err) {
    console.error("[dots] scheduler failed to start:", err instanceof Error ? err.message : err);
  }
  // Listen for Composio trigger events (only if the user added a Composio API key).
  void startTriggerEvents().catch((err) => console.warn("[dots] triggers:", err instanceof Error ? err.message : err));
  // Learn which models the key can use, then tell any open windows (fills the model pickers).
  if (canThink()) void models().then(() => emit({ type: "computer", data: computerInfo() })).catch((err) => console.warn("[dots] models:", err instanceof Error ? err.message : err));
  // Reconnect to Composio For You with the saved sign-in (fills Settings → Apps and the dots' tools).
  if (signedIn()) void refreshComposio().catch((err) => console.warn("[dots] Composio:", err instanceof Error ? err.message : err));
}
