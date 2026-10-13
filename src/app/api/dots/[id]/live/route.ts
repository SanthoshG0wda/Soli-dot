import { liveUrl } from "@/server/computer";
import { ownerOfDot } from "@/server/repo";
import { isDotId } from "@/server/validate";
import { getSessionUser } from "@/lib/auth";

// Live-view URL for a dot's cloud computer (wakes it if it's asleep). `?interactive=1` for take-over.
export async function GET(req: Request, ctx: RouteContext<"/api/dots/[id]/live">) {
  const { id } = await ctx.params;
  if (!isDotId(id)) return Response.json({ url: null, error: "Invalid dot id." }, { status: 400 });
  const user = await getSessionUser();
  if (!user || ownerOfDot(id) !== user.id) return Response.json({ url: null, error: "Not found." }, { status: 404 });
  const interactive = new URL(req.url).searchParams.get("interactive") === "1";
  try {
    return Response.json({ url: await liveUrl(id, interactive) });
  } catch (err) {
    return Response.json({ url: null, error: err instanceof Error ? err.message : String(err) });
  }
}
