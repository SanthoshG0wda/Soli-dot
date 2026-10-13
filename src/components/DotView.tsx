"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Monitor, Pause, Play, SlidersHorizontal, Square, SquarePen, Trash2, X } from "lucide-react";
import { deleteDot, pauseDot, resumeDot, stopDot } from "@/app/actions";
import { useStore } from "@/lib/store";
import { statusDot, statusLine } from "@/lib/status";
import DotOrb from "./DotOrb";
import Chat from "./Chat";
import ComputerPane from "./ComputerPane";
import SetupPane from "./SetupPane";
import { MenuButton } from "./MobileBar";

export type Tab = "chat" | "computer" | "setup";

function IconLink({ href, active, label, children }: { href: string; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} title={label} aria-label={label} className={`btn-quiet size-8 p-0 ${active ? "bg-black/[0.06] text-foreground" : ""}`}>
      {children}
    </Link>
  );
}

export default function DotView({ dotId, tab, conversation }: { dotId: string; tab: Tab; conversation?: string }) {
  const dot = useStore((s) => s.dots.find((d) => d.id === dotId));
  const loaded = useStore((s) => s.loaded);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  if (!dot) {
    return <div className="flex flex-1 items-center justify-center text-body-sm text-foreground/45">{loaded ? "This dot doesn't exist." : "Loading…"}</div>;
  }

  const base = `/dots/${dot.id}`;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="relative flex h-14 shrink-0 items-center gap-1.5 px-2 sm:gap-2 sm:px-4">
        <MenuButton />
        {/* Dot pill */}
        <Link href={base} className="flex min-w-0 items-center gap-2 rounded-full bg-background py-1 pr-3.5 pl-1 transition-colors hover:bg-black/[0.06]">
          <DotOrb look={dot.look} status={dot.status} size={26} />
          <span className="truncate text-[14px] font-medium">{dot.name}</span>
          {dot.status !== "idle" && (
            <span className="flex items-center gap-1.5 text-[12px] text-foreground/50">
              <span className={`size-1.5 rounded-full ${statusDot(dot)}`} />
              <span className={`hidden max-w-48 truncate sm:inline ${dot.status === "working" ? "shimmer-text" : ""}`}>{statusLine(dot)}</span>
            </span>
          )}
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          {tab === "chat" ? (
            <IconLink href={`${base}?c=new`} label="New chat">
              <SquarePen className="size-4" strokeWidth={1.75} />
            </IconLink>
          ) : (
            <IconLink href={base} label="Back to chat">
              <MessageSquare className="size-4" strokeWidth={1.75} />
            </IconLink>
          )}
          <IconLink href={`${base}?tab=computer`} active={tab === "computer"} label={`${dot.name}'s computer`}>
            <Monitor className="size-4" strokeWidth={1.75} />
          </IconLink>
          <IconLink href={`${base}?tab=setup`} active={tab === "setup"} label="Setup: rules, routines, memory, skills">
            <SlidersHorizontal className="size-4" strokeWidth={1.75} />
          </IconLink>
          {dot.status === "working" && (
            <button className="btn-quiet size-8 p-0" disabled={pending} onClick={() => start(() => stopDot(dot.id))} title="Stop" aria-label="Stop">
              <Square className="size-3.5 fill-current" />
            </button>
          )}
          {dot.status === "paused" ? (
            <button className="btn-primary h-8 px-3 text-[13px]" disabled={pending} onClick={() => start(() => resumeDot(dot.id))}>
              <Play className="size-3.5 fill-current" /> Resume
            </button>
          ) : (
            <button
              className="btn-quiet size-8 p-0"
              disabled={pending}
              title="Pause: any ongoing work will be stopped, and your dot will not message you until you resume it."
              aria-label="Pause"
              onClick={() => start(() => pauseDot(dot.id))}
            >
              <Pause className="size-4" strokeWidth={1.75} />
            </button>
          )}
          {confirmDelete ? (
            <span className="flex items-center gap-1 rounded-full bg-destructive/[0.08] py-1 pr-1 pl-3">
              <span className="text-[12px] text-destructive">Delete?</span>
              <button
                className="rounded-full px-2 py-1 text-[12px] font-medium text-destructive hover:bg-destructive/10"
                disabled={pending}
                onClick={() => start(async () => {
                  await deleteDot(dot.id);
                  router.push("/");
                })}
              >
                Yes
              </button>
              <button className="btn-quiet size-6 p-0" onClick={() => setConfirmDelete(false)} aria-label="Cancel delete">
                <X className="size-3.5" strokeWidth={2} />
              </button>
            </span>
          ) : (
            <button
              className="btn-quiet size-8 p-0 hover:text-destructive"
              disabled={pending}
              title={`Delete ${dot.name}`}
              aria-label={`Delete ${dot.name}`}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </header>

      {tab === "computer" ? <ComputerPane key={dot.id} dot={dot} /> : tab === "setup" ? <SetupPane key={dot.id} dot={dot} /> : <Chat key={`${dot.id}:${conversation ?? "latest"}`} dot={dot} conversation={conversation} />}
    </div>
  );
}
