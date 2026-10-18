import { getSessionUser } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/backend-client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "pdf";

  try {
    const backendRes = await fetch(
      `${BACKEND_URL}/api/artifacts/${encodeURIComponent(id)}/export?format=${format}`
    );

    if (!backendRes.ok) {
      return new Response("Failed to generate court export from backend", {
        status: backendRes.status,
      });
    }

    const contentType = backendRes.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = backendRes.headers.get("content-disposition") || `attachment; filename="document.${format}"`;

    return new Response(backendRes.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (err: any) {
    return new Response(`Export service offline: ${err.message}`, { status: 503 });
  }
}
