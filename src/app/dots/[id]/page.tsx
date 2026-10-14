import { redirect } from "next/navigation";
import * as repo from "@/server/repo";

export default async function Page({ params, searchParams }: PageProps<"/dots/[id]">) {
  const { id } = await params;
  const { tab, c } = await searchParams;

  const dot =
    repo.getDot(id) ||
    (id.startsWith("dot_") ? repo.getDot(id.replace(/^dot_/, "vakil_")) : null) ||
    (id.startsWith("vakil_") ? repo.getDot(id.replace(/^vakil_/, "dot_")) : null);

  const targetId = dot ? dot.id : (id.startsWith("dot_") ? id.replace(/^dot_/, "vakil_") : id);

  const qs = new URLSearchParams();
  if (typeof tab === "string") qs.set("tab", tab);
  if (typeof c === "string") qs.set("c", c);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/vakil/${targetId}${query}`);
}
