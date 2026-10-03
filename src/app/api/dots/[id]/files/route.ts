import { MAX_UPLOAD, upload } from "@/server/files";
import { isDotId } from "@/server/validate";

// The user attaches files in chat. Returns the stored attachments.
export async function POST(req: Request, ctx: RouteContext<"/api/dots/[id]/files">) {
  const { id } = await ctx.params;
  if (!isDotId(id)) return Response.json({ error: "Invalid dot id." }, { status: 400 });
  const form = await req.formData();
  const out = [];
  for (const entry of form.getAll("file")) {
    if (!(entry instanceof File)) continue;
    if (entry.size > MAX_UPLOAD) return Response.json({ error: `${entry.name} is over 25 MB.` }, { status: 413 });
    if (!entry.name || entry.name.length > 255) return Response.json({ error: "Invalid file name." }, { status: 400 });
    const f = await upload(id, entry.name, entry.type, Buffer.from(await entry.arrayBuffer()));
    out.push({ id: f.id, name: f.name, mime: f.mime, size: f.size });
  }
  return Response.json({ files: out });
}
