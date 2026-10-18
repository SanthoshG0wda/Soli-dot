import { getSessionUser } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/backend-client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/api/artifacts/${encodeURIComponent(id)}`);
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/api/artifacts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
