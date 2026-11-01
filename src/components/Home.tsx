"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { startConversation } from "@/app/actions";
import { markRead, useStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const dots = useStore((s) => s.dots);
  const loaded = useStore((s) => s.loaded);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  if (loaded && !dots.length) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="rails animate-page-rise mx-auto flex min-h-full max-w-[880px] flex-col items-center justify-center px-4 py-16 text-center sm:px-8">
          <p className="text-foreground/60">Start a new conversation from the sidebar.</p>
        </div>
      </div>
    );
  }

  const target = dots[0];

  const submit = () => {
    const value = text.trim();
    if (!value || !target) return;
    setText("");
    start(async () => {
      const res = await startConversation(target.id, value);
      markRead(target.id);
      const canonicalId = target.id.startsWith("dot_") ? target.id.replace(/^dot_/, "vakil_") : target.id;
      const convId = res?.conversationId || (typeof res === "string" ? res : "");
      router.push(convId ? `/vakil/${canonicalId}?c=${convId}` : `/vakil/${canonicalId}`);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="rails animate-page-rise mx-auto max-w-[880px] px-4 sm:px-8">
        <section className="flex min-h-[calc(100dvh-56px)] -translate-y-10 flex-col items-center justify-center text-center">
          <h1 className="mb-9 font-serif text-[38px] font-normal tracking-[-0.04em] text-[#f1efea] sm:text-[48px]">
            Welcome back.
          </h1>
          <div className="w-full max-w-[640px] text-left">
            <div className="composer-shell rounded-2xl border border-white/15 bg-card px-4 pt-3 pb-2 shadow-[0_18px_42px_-24px_rgba(0,0,0,0.8)] transition-shadow focus-within:border-brand/60">
              <textarea
                autoFocus
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={target ? "Message Soli…" : "Loading…"}
                className="max-h-60 min-h-[48px] w-full resize-none bg-transparent px-1 py-2 text-[16px] leading-[1.5] tracking-default outline-none [field-sizing:content] placeholder:text-foreground/35"
              />
              <div className="flex items-center gap-2 pb-1">
                <button
                  className="motion-card ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-card transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-foreground/30"
                  disabled={pending || !text.trim()}
                  onClick={submit}
                  aria-label="Send"
                >
                  <ArrowUp className="size-4" strokeWidth={2.25} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
