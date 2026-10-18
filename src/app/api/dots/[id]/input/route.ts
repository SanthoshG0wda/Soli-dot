import { BACKEND_URL } from "@/lib/backend-client";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    await fetch(`${BACKEND_URL}/api/dots/${encodeURIComponent(id)}/input`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return new Response(null, { status: 204 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
