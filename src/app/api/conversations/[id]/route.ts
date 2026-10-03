import { conversationMessages } from "@/server/repo";
import { isValidId } from "@/server/validate";

// Full history of one conversation (the live snapshot only carries recent messages).
export async function GET(_req: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const { id } = await ctx.params;
  if (!isValidId("conv", id)) return Response.json({ messages: [], error: "Invalid conversation id." }, { status: 400 });
  return Response.json({ messages: conversationMessages(id, 1000) });
}
