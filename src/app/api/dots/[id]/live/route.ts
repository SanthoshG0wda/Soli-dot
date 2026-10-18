import { BACKEND_URL } from "@/lib/backend-client";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ url: null, error: "Unauthorized" }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/api/dots/${encodeURIComponent(id)}/live`);
    const data = await res.json();
    return Response.json(data);
  } catch (err: any) {
    return Response.json({ url: null, error: err.message });
  }
}
