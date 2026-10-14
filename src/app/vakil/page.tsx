import { redirect } from "next/navigation";
import * as repo from "@/server/repo";
import { getSessionUser } from "@/lib/auth";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vakil");
  const dots = repo.listDots(user.id);
  const vakil = dots.find((d) => d.name.toLowerCase() === "vakil" || d.id.startsWith("vakil_")) ?? dots[0];
  if (vakil) {
    redirect(`/vakil/${vakil.id}`);
  }
  redirect("/");
}
