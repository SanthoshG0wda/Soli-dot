import { getSessionUser } from "@/lib/auth";
import { listArtifacts } from "@/server/repo";
import { createDocumentArtifact } from "@/server/documents";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const convId = url.searchParams.get("conversationId");

  const artifacts = listArtifacts(user.id, convId);
  return Response.json({ artifacts });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const {
      dotId,
      conversationId,
      messageId,
      title,
      filename,
      kind = "markdown",
      content,
      summary,
      metadata,
    } = body;

    if (!dotId || !title || !content) {
      return new Response("Missing required fields (dotId, title, content)", { status: 400 });
    }

    const result = await createDocumentArtifact({
      dotId,
      conversationId: conversationId || undefined,
      userId: user.id,
      title,
      filename: filename || `${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.md`,
      kind,
      content,
      summary,
      metadata,
      generatePdf: true,
      generateDocx: true,
      notifyInChat: messageId ? false : true,
    });

    if (messageId) {
      const { updateMessage } = await import("@/server/repo");
      updateMessage(messageId, { artifactId: result.artifact.id });
    }

    return Response.json(result);
  } catch (err) {
    console.error("Artifact creation error:", err);
    return new Response(err instanceof Error ? err.message : "Internal Server Error", { status: 500 });
  }
}
