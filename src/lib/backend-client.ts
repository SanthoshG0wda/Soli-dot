import type { ArtifactKind, Attachment, CardData, Conversation, DocumentArtifact, Dot, Look, Matter, Memory, Message, Routine, Rule, Skill } from "./types";

export const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

export async function backendFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMsg = `Backend request failed: ${res.status} ${res.statusText}`;
    try {
      const errBody = await res.json();
      if (errBody.error) errMsg = errBody.error;
    } catch {}
    throw new Error(errMsg);
  }

  // Handle binary data or text
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res as unknown as T;
}

// ---------------- Agent Execution ----------------
export async function sendAgentMessage(
  dotId: string,
  text: string,
  userId?: string,
  conversationId?: string,
  messageId?: string,
  attachments?: Attachment[]
) {
  return backendFetch("/api/agent/message", {
    method: "POST",
    body: JSON.stringify({ dotId, text, userId, conversationId, messageId, attachments }),
  });
}

export async function abortAgent(dotId: string) {
  return backendFetch("/api/agent/abort", {
    method: "POST",
    body: JSON.stringify({ dotId }),
  });
}

// ---------------- Dots ----------------
export async function fetchDots(userId: string = ""): Promise<Dot[]> {
  const data = await backendFetch<{ dots: Dot[] }>(`/api/dots?userId=${encodeURIComponent(userId)}`);
  return data.dots || [];
}

export async function fetchDot(id: string): Promise<Dot | null> {
  try {
    const data = await backendFetch<{ dot: Dot }>(`/api/dots/${encodeURIComponent(id)}`);
    return data.dot || null;
  } catch {
    return null;
  }
}

export async function createBackendDot(input: {
  name: string;
  purpose: string;
  instructions?: string;
  look: Look;
  userId?: string;
}): Promise<Dot> {
  const data = await backendFetch<{ dot: Dot }>("/api/dots", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.dot;
}

export async function deleteBackendDot(id: string): Promise<boolean> {
  const data = await backendFetch<{ success: boolean }>(`/api/dots/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return data.success;
}

// ---------------- Conversations ----------------
export async function fetchConversations(userId: string = "", dotId?: string): Promise<Conversation[]> {
  const q = new URLSearchParams();
  if (userId) q.set("userId", userId);
  if (dotId) q.set("dotId", dotId);
  const data = await backendFetch<{ conversations: Conversation[] }>(`/api/conversations?${q.toString()}`);
  return data.conversations || [];
}

export async function fetchMatters(userId: string): Promise<Matter[]> {
  const data = await backendFetch<{ matters: Matter[] }>(`/api/matters?userId=${encodeURIComponent(userId)}`);
  return (data.matters || []).map(normalizeMatter);
}

export async function createBackendMatter(input: { userId: string; title: string; client?: string; court?: string; nextDate?: string; notes?: string }): Promise<Matter> {
  const data = await backendFetch<{ matter: Matter }>("/api/matters", { method: "POST", body: JSON.stringify(input) });
  return normalizeMatter(data.matter);
}

function normalizeMatter(matter: Matter): Matter {
  const status = matter.status as string;
  return { ...matter, status: status === "active" ? "Active" : status === "on_hold" ? "On hold" : "Closed" };
}

export async function fetchConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] } | null> {
  try {
    return await backendFetch<{ conversation: Conversation; messages: Message[] }>(`/api/conversations/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function createBackendConversation(dotId: string, title?: string, userId?: string, id?: string, matterId?: string): Promise<Conversation> {
  const data = await backendFetch<{ conversation: Conversation }>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ dotId, title, userId, id, matterId }),
  });
  return data.conversation;
}

// ---------------- Artifacts ----------------
export async function fetchArtifacts(userId: string = ""): Promise<DocumentArtifact[]> {
  const data = await backendFetch<{ artifacts: DocumentArtifact[] }>(`/api/artifacts?userId=${encodeURIComponent(userId)}`);
  return data.artifacts || [];
}

export async function fetchArtifact(id: string): Promise<DocumentArtifact | null> {
  try {
    const data = await backendFetch<{ artifact: DocumentArtifact }>(`/api/artifacts/${encodeURIComponent(id)}`);
    return data.artifact || null;
  } catch {
    return null;
  }
}

export async function saveBackendArtifact(input: {
  dotId: string;
  conversationId?: string;
  title: string;
  kind?: string;
  content: string;
  userId?: string;
}): Promise<DocumentArtifact> {
  const data = await backendFetch<{ artifact: DocumentArtifact }>("/api/artifacts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.artifact;
}
