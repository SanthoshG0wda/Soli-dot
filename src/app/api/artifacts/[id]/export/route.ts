import { getSessionUser } from "@/lib/auth";
import { getArtifact, ownerOfArtifact } from "@/server/repo";
import { generatePdfDocument } from "@/server/documents/pdf-generator";
import { generateDocxDocument } from "@/server/documents/docx-generator";

export async function GET(req: Request, ctx: RouteContext<"/api/artifacts/[id]/export">) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const artifact = getArtifact(id);
  if (!artifact) return new Response("Not found", { status: 404 });
  if (ownerOfArtifact(id) !== user.id) return new Response("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "pdf";
  const cleanTitle = (artifact.title || "document").replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "_");

  if (format === "pdf") {
    const buffer = await generatePdfDocument(artifact.content, {
      title: artifact.title,
      courtHeader: (artifact.metadata?.court as string) || undefined,
      author: "Soli Legal AI",
    });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cleanTitle}.pdf"`,
      },
    });
  }

  if (format === "docx") {
    const buffer = await generateDocxDocument(artifact.content, {
      title: artifact.title,
      courtHeader: (artifact.metadata?.court as string) || undefined,
      author: "Soli Legal AI",
    });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${cleanTitle}.docx"`,
      },
    });
  }

  if (format === "txt" || format === "md") {
    return new Response(artifact.content, {
      headers: {
        "Content-Type": format === "md" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${cleanTitle}.${format}"`,
      },
    });
  }

  return new Response(`Unsupported format: ${format}`, { status: 400 });
}
