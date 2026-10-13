import { conversationMessages, ownerOfConversation } from "@/server/repo";
import { isValidId } from "@/server/validate";
import { getSessionUser } from "@/lib/auth";

// Full history of one conversation (the live snapshot only carries recent messages).
export async function GET(_req: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const { id } = await ctx.params;
  if (!isValidId("conv", id)) return Response.json({ messages: [], error: "Invalid conversation id." }, { status: 400 });
  const user = await getSessionUser();
  // 404 either way: never reveal whether a foreign id exists.
  if (!user || ownerOfConversation(id) !== user.id) return Response.json({ messages: [], error: "Not found." }, { status: 404 });
  return Response.json({ messages: conversationMessages(id, 1000) });
}
