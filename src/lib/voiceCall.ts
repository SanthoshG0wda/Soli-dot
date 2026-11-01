"use client";

export type CallStatus = "connecting" | "listening" | "speaking" | "ended" | "error";
export type CallLine = { id: number; who: "you" | "dot" | "note"; text: string };
export type Call = { dotId: string; conversationId: string; status: CallStatus; muted: boolean; lines: CallLine[]; error?: string; startedAt: number };

export function subscribeCall(_listener: () => void) {
  return () => {};
}

export function getCall(): Call | null {
  return null;
}

export function endCall(): void {}

export function setMuted(_muted: boolean): void {}

export async function startCall(_dotId: string, _conversationId: string): Promise<void> {}
