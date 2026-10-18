import { BACKEND_URL } from "@/lib/backend-client";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/api/dots/${encodeURIComponent(id)}/stream`, {
      signal: req.signal,
    });
    if (!res.ok || !res.body) return new Response(null, { status: 204 });
    return new Response(res.body, {
      headers: {
        "Content-Type": "multipart/x-mixed-replace; boundary=frame",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}
