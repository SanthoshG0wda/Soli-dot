import { BACKEND_URL } from "@/lib/backend-client";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ files: [], error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const p = url.searchParams.get("path");

  try {
    const q = p ? `?path=${encodeURIComponent(p)}` : "";
    const backendRes = await fetch(`${BACKEND_URL}/api/dots/${encodeURIComponent(id)}/workspace${q}`);
    if (!backendRes.ok) return Response.json({ files: [], error: "Workspace error" }, { status: backendRes.status });

    if (p) {
      return new Response(backendRes.body, {
        headers: {
          "Content-Type": backendRes.headers.get("content-type") || "application/octet-stream",
          "Content-Disposition": backendRes.headers.get("content-disposition") || "attachment",
        },
      });
    }

    const data = await backendRes.json();
    return Response.json(data);
  } catch (err: any) {
    return Response.json({ files: [], error: err.message }, { status: 500 });
  }
}
