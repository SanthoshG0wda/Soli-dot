import { lastScreenshot, screenshot } from "@/server/computer";
import { ownerOfDot } from "@/server/repo";
import { isDotId } from "@/server/validate";
import { getSessionUser } from "@/lib/auth";

// Latest frame of the dot's screen. `?fresh=1` captures a new one.
export async function GET(req: Request, ctx: RouteContext<"/api/dots/[id]/screen">) {
  const { id } = await ctx.params;
  if (!isDotId(id)) return new Response("Invalid dot id.", { status: 400 });
  const user = await getSessionUser();
  if (!user || ownerOfDot(id) !== user.id) return new Response("Not found.", { status: 404 });
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  const shot = fresh ? await screenshot(id).catch(() => null) : await lastScreenshot(id);
  if (!shot) return new Response(null, { status: 204 });
  return new Response(new Uint8Array(shot), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
}
