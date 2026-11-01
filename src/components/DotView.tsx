"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import Chat from "./Chat";
import SetupPane from "./SetupPane";
import { MenuButton } from "./MobileBar";

export type Tab = "chat" | "setup";

export default function DotView({ dotId, tab, conversation, matterId }: { dotId: string; tab: Tab; conversation?: string; matterId?: string }) {
  const dot = useStore((s) => s.dots.find((d) => d.id === dotId));
  const loaded = useStore((s) => s.loaded);

  if (!dot) {
    return <div className="flex flex-1 items-center justify-center text-body-sm text-foreground/45">{loaded ? "This counsel doesn't exist." : "Loading…"}</div>;
  }

  const base = `/vakil/${dot.id}`;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="relative flex h-14 shrink-0 items-center gap-1.5 px-2 sm:gap-2 sm:px-4">
        <MenuButton />
        <Link href={base} className="flex min-w-0 items-center rounded-md px-2 py-1.5 text-[14px] font-medium transition-colors hover:bg-white/10">Soli</Link>
      </header>

      {tab === "setup" ? <SetupPane key={dot.id} dot={dot} /> : <Chat key={`${dot.id}:${conversation ?? "latest"}:${matterId ?? "none"}`} dot={dot} conversation={conversation} matterId={matterId} />}
    </div>
  );
}
