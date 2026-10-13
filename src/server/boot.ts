import "server-only";
import * as repo from "./repo";
import { settingUserIds, usersWithSetting } from "./db";
import { canThink, models } from "./agent/client";
import { startScheduler } from "./scheduler";
import { startEvents as startTriggerEvents } from "./triggers";
import { refresh as refreshComposio, usersWithTokens } from "./composio";

export function boot() {
  // Nothing is running after a restart; don't leave dots stuck in "working".
  for (const dot of repo.listAllDots()) {
    if (dot.status === "working") repo.updateDot(dot.id, { status: repo.pendingCards(dot.id).length ? "waiting" : "idle" });
  }
  try {
    startScheduler();
  } catch (err) {
    console.error("[dots] scheduler failed to start:", err instanceof Error ? err.message : err);
  }
  // Listen for Composio trigger events for every user that added a trigger key.
  for (const userId of usersWithSetting("composio_api_key")) {
    void startTriggerEvents(userId).catch((err) => console.warn("[dots] triggers:", err instanceof Error ? err.message : err));
  }
  // Warm each user's model list (fills their model pickers on connect via snapshot).
  for (const userId of settingUserIds()) {
    try {
      if (canThink(userId)) void models(userId).catch((err) => console.warn("[dots] models:", err instanceof Error ? err.message : err));
    } catch (err) {
      console.warn("[dots] models:", err instanceof Error ? err.message : err);
    }
  }
  // Reconnect to Composio For You for every signed-in user.
  for (const userId of usersWithTokens(settingUserIds())) {
    void refreshComposio(userId).catch((err) => console.warn("[dots] Composio:", err instanceof Error ? err.message : err));
  }
}
