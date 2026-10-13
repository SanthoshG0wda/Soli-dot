import { getSessionUser } from "@/lib/auth";
import { deleteArtifact, getArtifact, ownerOfArtifact } from "@/server/repo";

export async function GET(req: Request, ctx: RouteContext<"/api/artifacts/[id]">) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const artifact = getArtifact(id);
  if (!artifact) return new Response("Not found", { status: 404 });
  if (ownerOfArtifact(id) !== user.id) return new Response("Forbidden", { status: 403 });

  return Response.json({ artifact });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/artifacts/[id]">) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (ownerOfArtifact(id) !== user.id) return new Response("Forbidden", { status: 403 });
  deleteArtifact(id);

  return Response.json({ ok: true });
}
