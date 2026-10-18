import { getSessionUser } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/backend-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Proxy SSE stream from standalone backend
export async function GET(req: Request) {
  const user = await getSessionUser();
  const userId = user?.id || "usr-super-admin";

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/events?userId=${encodeURIComponent(userId)}`, {
      headers: {
        Accept: "text/event-stream",
      },
      cache: "no-store",
      signal: req.signal,
    });

    if (!backendRes.ok || !backendRes.body) {
      return new Response("Failed to connect to backend event stream", { status: 502 });
    }

    const transform = new TransformStream();
    backendRes.body.pipeTo(transform.writable).catch(() => {});

    return new Response(transform.readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform, no-store",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return new Response(`Backend offline: ${err.message}`, { status: 503 });
  }
}
