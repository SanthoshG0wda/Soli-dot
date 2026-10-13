import { onEvent } from "@/server/bus";
import { eventOwnerId } from "@/server/scope";
import { apps } from "@/server/composio";
import { models } from "@/server/agent/client";
import { computerInfo, snapshot } from "@/server/snapshot";
import { getSessionUser } from "@/lib/auth";
import type { ServerEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Server-sent events: one full snapshot on connect, then every change as it happens.
// The snapshot and the stream are scoped to the signed-in user: events for other
// users' dots are never forwarded, and the per-user aggregates ("computer",
// "composio") are recomputed for the subscriber instead of relayed.
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const userId = user.id;
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (ev: ServerEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      send({ type: "snapshot", data: snapshot(userId) });
      // The snapshot carries the best-known model list without blocking; refresh
      // it once the provider listing resolves so pickers fill in on connect.
      void models(userId)
        .then(() => {
          try {
            send({ type: "computer", data: computerInfo(userId) });
          } catch {}
        })
        .catch(() => {});
      const off = onEvent((ev) => {
        if (ev.type === "computer") {
          send({ type: "computer", data: computerInfo(userId) });
          return;
        }
        if (ev.type === "composio") {
          send({ type: "composio", data: apps(userId) });
          return;
        }
        if (eventOwnerId(ev) === userId) send(ev);
      });
      const ping = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 20_000);
      cleanup = () => {
        off();
        clearInterval(ping);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform, no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
