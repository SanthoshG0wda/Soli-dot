import { userInput, type UserInput } from "@/server/computer";
import { ownerOfDot } from "@/server/repo";
import { isDotId } from "@/server/validate";
import { getSessionUser } from "@/lib/auth";

// One mouse / keyboard / navigation event from the Computer tab's live view.
export async function POST(req: Request, ctx: RouteContext<"/api/dots/[id]/input">) {
  const { id } = await ctx.params;
  if (!isDotId(id)) return Response.json({ error: "Invalid dot id." }, { status: 400 });
  const user = await getSessionUser();
  if (!user || ownerOfDot(id) !== user.id) return Response.json({ error: "Not found." }, { status: 404 });
  try {
    await userInput(id, (await req.json()) as UserInput);
    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
