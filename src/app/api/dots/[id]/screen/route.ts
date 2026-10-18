import { BACKEND_URL } from "@/lib/backend-client";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/api/dots/${encodeURIComponent(id)}/screen`, {
      signal: req.signal,
    });
    if (!res.ok) return new Response(null, { status: 204 });
    const blob = await res.blob();
    return new Response(blob, {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}
