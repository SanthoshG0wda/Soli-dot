import { getSessionUser } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/backend-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Proxy SSE stream from standalone backend
export async function GET(req: Request) {
  const user = await getSessionUser();
  const userId = user?.id || "usr-super-admin";

  try {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    req.signal.addEventListener("abort", onAbort);

    const backendRes = await fetch(
      `${BACKEND_URL}/api/events?userId=${encodeURIComponent(userId)}`,
      {
        headers: {
          Accept: "text/event-stream",
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );

    if (!backendRes.ok || !backendRes.body) {
      req.signal.removeEventListener("abort", onAbort);
      return new Response("Failed to connect to backend event stream", { status: 502 });
    }

    const reader = backendRes.body.getReader();
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            req.signal.removeEventListener("abort", onAbort);
            return;
          }
          controller.enqueue(value);
        } catch {
          // Gracefully handle client navigation or socket disconnects without crashing the dev server
          try {
            controller.close();
          } catch {}
          req.signal.removeEventListener("abort", onAbort);
        }
      },
      cancel() {
        req.signal.removeEventListener("abort", onAbort);
        controller.abort();
        reader.cancel().catch(() => {});
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform, no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    if (req.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    return new Response(`Backend offline: ${err.message}`, { status: 503 });
  }
}
