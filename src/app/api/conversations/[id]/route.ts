import { getSessionUser } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/backend-client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ messages: [], error: "Unauthorized" }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/api/conversations/${encodeURIComponent(id)}`);
    const data = await res.json();
    return Response.json({ messages: data.messages || [] });
  } catch (err: any) {
    return Response.json({ messages: [], error: err.message }, { status: 500 });
  }
}
