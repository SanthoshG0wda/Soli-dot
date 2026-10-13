import { get } from "@/server/files";
import { ownerOfFile } from "@/server/repo";
import { isValidId } from "@/server/validate";
import { getSessionUser } from "@/lib/auth";

// Download or preview a file. Images/PDFs render inline; `?download=1` forces a download.
export async function GET(req: Request, ctx: RouteContext<"/api/files/[fileId]">) {
  const { fileId } = await ctx.params;
  if (!isValidId("file", fileId)) return new Response("Not found", { status: 404 });
  const user = await getSessionUser();
  if (!user || ownerOfFile(fileId) !== user.id) return new Response("Not found", { status: 404 });
  const f = get(fileId);
  if (!f) return new Response("Not found", { status: 404 });
  const inline = /^(image\/(png|jpeg|gif|webp)|application\/pdf|text\/plain)$/.test(f.mime) && new URL(req.url).searchParams.get("download") !== "1";
  return new Response(new Uint8Array(f.data()), {
    headers: {
      "Content-Type": f.mime,
      "Content-Length": String(f.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      ...(inline ? { "Content-Security-Policy": "sandbox" } : {}),
    },
  });
}
