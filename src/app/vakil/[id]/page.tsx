import { redirect } from "next/navigation";
import DotView, { type Tab } from "@/components/DotView";
import { fetchDot } from "@/lib/backend-client";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; c?: string; matter?: string }>;
}) {
  const { id } = await params;
  const { tab, c, matter } = await searchParams;
  const current: Tab = tab === "setup" ? "setup" : "chat";

  // Resolve ID whether passed as vakil_... or dot_...
  const dot =
    (await fetchDot(id)) ||
    (id.startsWith("dot_") ? await fetchDot(id.replace(/^dot_/, "vakil_")) : null) ||
    (id.startsWith("vakil_") ? await fetchDot(id.replace(/^vakil_/, "dot_")) : null);

  if (dot && id !== dot.id) {
    const qs = new URLSearchParams();
    if (typeof tab === "string") qs.set("tab", tab);
    if (typeof c === "string") qs.set("c", c);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    redirect(`/vakil/${dot.id}${query}`);
  }

  const actualId = dot ? dot.id : id;

  return <DotView dotId={actualId} tab={current} conversation={typeof c === "string" ? c : undefined} matterId={typeof matter === "string" ? matter : undefined} />;
}
