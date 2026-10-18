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
    const formData = await req.formData();
    const res = await fetch(`${BACKEND_URL}/api/dots/${encodeURIComponent(id)}/files`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
