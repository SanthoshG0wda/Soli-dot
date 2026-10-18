import { BACKEND_URL } from "@/lib/backend-client";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/files/${encodeURIComponent(fileId)}`);
    if (!backendRes.ok) return new Response("Not found", { status: 404 });

    return new Response(backendRes.body, {
      headers: {
        "Content-Type": backendRes.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": backendRes.headers.get("content-disposition") || "inline",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
