import { userInput, type UserInput } from "@/server/computer";
import { isDotId } from "@/server/validate";

// One mouse / keyboard / navigation event from the Computer tab's live view.
export async function POST(req: Request, ctx: RouteContext<"/api/dots/[id]/input">) {
  const { id } = await ctx.params;
  if (!isDotId(id)) return Response.json({ error: "Invalid dot id." }, { status: 400 });
  try {
    await userInput(id, (await req.json()) as UserInput);
    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
