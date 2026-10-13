# Demo-Readiness Fix Map — Soli client demo

Goal: survive a 15-minute live demo to potential (legal) clients with no
embarrassing failure, no confidentiality scare, and no claim the product
can't defend. Source: codebase audit 2026-10-08 (security, reliability,
demo-UX, RAG/data).

How to use: work phases in order. Each item has **Fix**, **Files**, **Done
when** (acceptance), and **Size** (S <2h, M half–1 day, L 1–3 days). Check off `[ ]` as you go. Re-run `pnpm typecheck && pnpm lint` after every item.

---

## Phase 0 — Demo safety (do first; blocks everything else)

> Progress: 0.1, 0.2, 0.3 done (2026-10-08).

### 0.1 Reset client state on logout — DONE
- Added `resetStore()` (`src/lib/store.ts`): closes EventSource, clears all
  cached data, removes `dots.lastRead`; logout now hard-navigates (`logout-button.tsx`).
- Verified: typecheck + lint pass.

### 0.2 Gate signup (invites or domain allowlist) — DONE
- `SIGNUP_INVITE_CODES` / `SIGNUP_ALLOWED_DOMAINS` env gates (`env.ts`, `roles.ts`
  timing-safe code compare); 403 on failure; `GET /api/auth/register` drives the
  invite field on the form; `.env.example` documented. Open registration stays
  the default when neither is set.
- Verified live: policy endpoint, 403 without/wrong code, 201 with valid code.
  Admin console now exists at `/admin` (covered by 2.1).

### 0.3 Legacy claim rework — DONE
- `claimUnowned()` now only claims to env `LEGACY_OWNER_EMAIL` or requires
  explicit "import shared workspace" confirmation; never auto-claims passwords/keys
  to a non-admin. Second account can't inherit first account's secrets by logging in early.
- Verified: second account login leaves legacy data unclaimed unless owner email matches.
- `repo.ts:66-75` updated with conditional claim logic.

### 0.4 Login hardening — DONE
- Added in-memory rate limit on login (`src/app/api/auth/login/route.ts`): 20 rapid bad logins from same IP throttled for 5 minutes, returns 429; tracks failed logins and resets count on successful login.
- Generic "Invalid email or password" message prevents email enumeration oracle.
- Verified: typecheck + lint pass.

## Phase 1 — First-run that works in minute two

### 1.1 Guided first-run + sample matter
- **Problem:** zero-key new user hits `Something went wrong: No Groq key yet…`; empty state is just "Create your first dot" (`Home.tsx:28-45`, `Chat.tsx:141-154`, `runtime.ts:221-224`).
- **Fix:** seed one demo dot + one sample matter conversation (env-flagged `DEMO_SEED=1` on first boot, owned by a demo account); first-run checklist (1. add key or use shared demo key → 2. ask the sample question). Pre-provision a demo provider key via env so the client never hunts for keys.
- **Done when:** fresh account asks a question and gets an answer in <2 min, no Settings visit.
- **Size:** M

### 1.2 Honest cold-start progress
- **Problem:** E2B/browser/model-listing waits show generic shimmer (`cloud.ts:84-101`, `Chat.tsx:127-134`, `ComputerPane.tsx:112`).
- **Fix:** staged status copy ("Starting cloud computer…", "Loading models…") with timeouts on all provider listings (AbortSignal.timeout ~15s); picker shows quick fallback immediately, upgrades when resolve lands.
- **Done when:** every wait >3s explains itself; nothing spins forever on bad network.
- **Size:** M

## Phase 2 — Legal credibility (the core pitch)

### 2.1 Ingest UI (upload/curate/delete corpus) — DONE
- Built the full admin console at `/admin` (layout + Corpus/Users/Models/Limits tabs, `requireAdmin` on every page, `/admin` added to proxy protection, shield link in sidebar for admins only).
- Corpus: upload PDF with collection tag (`POST /api/admin/documents` → `ingestPdfProduction`), list with status, delete removes vectors + chunks + metadata (`DELETE /api/admin/documents/[id]`).
- Users: list, role change, delete with self/last-admin guards (`/api/admin/users*`; SQLite dots/chats/keys scrubbed on delete).
- Models: deployment-global `default_model`/`review_model` with catalog + env visibility (`/api/admin/models`); precedence dot → user → admin → env → best available (`client.ts`).
- Limits: global RAG budgets (topK, context/chunk chars, temperature) with bounds + env fallback (`/api/admin/limits`, `server/limits.ts`); `lib/rag/index.ts` reads effective limits per answer.
- Verified: `pnpm typecheck` clean, `pnpm build` compiles with all new routes.

### 2.2 Honest citations — DONE (2026-10-12)
- Prompt already required `[n]` markers and `resolveSources` already returned only cited chunks (prior session). Added the visible half: `legal_search` stashes per-call sources, the run loop posts a **Sources footer** (`role: dot, title: Sources`, filename + page + excerpt) after the final answer — resolved against the cited `[n]` markers, deduped, capped at 8. Uncited answers post nothing (verified: no dump).
- Tool description now instructs inline `[n]` cites and forbids invented citations.
- Verified: 18/18 behavioral checks pass (isolated store); typecheck clean. Live end-to-end (real NVIDIA+Qdrant) still needs the morning checklist run.
- Follow-up 2026-10-12 (evals 0/4, avg 10%): diagnosed — seeds tested 4 documents never uploaded (Puttaswamy/BNS/Bhajan Lal/Criminal Codification), so refusals were CORRECT; the 0.3 floor rightly excluded junk (0.25) while real matches score 0.46–0.61. Rewrote seeds to indexed docs (verified chunk text). Also found the model emits `【n†Lx-Ly】` markers instead of `[n]` — parser now accepts both (strict prompt, lenient parse). Re-ran suite: **4/4 pass, avg 86%, all cited**. Watch-out: duplicate chunk points in Qdrant (same IT Act chunk twice) — needs a re-ingest dedupe pass later; answer latency 7–21s (reasoning model) — plan demo timing accordingly.

### 2.3 Strict no-match behavior everywhere — DONE (2026-10-12)
- **Problem:** strict API says "I could not find…" but chat path answers from general knowledge (`rag/chat.ts:73-79`, `system-prompt.ts:15-16`); missing Qdrant collection looks like "no matches" (`qdrant.ts:163-171`).
- **Fix:** one policy: corpus miss → "I don't have a source for that in your library" + offer to broaden; never answer statute questions from parametric memory; surface collection-missing as an ops error, not an empty result.
- **Done when:** same unknown question gets the same honest refusal in chat, agent tool, and API — met via shared `LIBRARY_REFUSAL`.
- **Size:** M
- Shipped: `planRagChat` no longer falls back to general knowledge on empty retrieval: legal/substantive questions → deterministic refusal plan, chit-chat → general (`looksLegalQuestion` heuristic).
- Missing Qdrant collection now throws `collection_not_found` instead of masquerading as empty: tool returns an explicit "corpus unavailable" ops message, `POST /api/legal/answer` returns 503 `corpus_unavailable`. Evals record it per-test instead of scoring a fake refusal.
- System prompt rule 4 tightened: general knowledge is for small talk only, never legal substance.
- Verified: refusal/empty/general split covered by the 18 behavioral checks.
- Follow-up 2026-10-12 (dot answered Eva Nammava question from memory about the wrong Act, twice): prompt rules proved insufficient — the model skipped `legal_search` and improvised. Added deterministic grounding (`server/agent/legal-guard.ts`): every legal-looking turn carries retrieved context (or the refusal, or an explicit unavailable notice) regardless of tool use; guard notes never persist into stored history; footer resolves against the same chunks. Verified live: 11/11 guard checks pass (hit grounds, miss refuses, chit-chat untouched). Agent prompt also gained an explicit never-substitute rule as backstop.

### 2.4 Retrieval floor — DONE (demo-sized, 2026-10-12)
- Default `minScore` 0.3 (`DEFAULT_MIN_SCORE`, env-overridable via `RAG_MIN_SCORE`, admin-tunable in Limits UI alongside topK/temperature). Applies in `generateRagResponse` + `planRagChat` unless the caller passes an explicit floor; evals inherit it. Qdrant search log now includes `minScore` + `topScore`.
- Verified: default-applied/passthrough checks pass. The 0.3 value is a starting point — confirm against the real corpus during the morning checklist (upload-then-ask pass).

## Phase 3 — Live-demo reliability

### 3.1 Retry + graceful errors on the main path
- **Problem:** Responses-API path has no retry; failures render raw SDK text (`runtime.ts:330-346,220-224`); mid-stream abort leaves truncated bubbles (`runtime.ts:389-394`).
- **Fix:** wrap the Responses path in the existing transient-error retry; error card with Retry button instead of system row; aborted turns show "Stopped" note, not a cut-off sentence.
- **Done when:** kill network mid-answer → clean error + one-click retry recovers.
- **Size:** M

### 3.2 RAG degradation
- **Problem:** one Qdrant failure poisons the process (cached rejected promise, `qdrant.ts:80-83`); answer route 500s (`legal/answer/route.ts:28`).
- **Fix:** resettable init (retry on next call, backoff); try/catch → "corpus unavailable" card; validate `EMBEDDING_DIMENSIONS` vs collection size at boot with a loud error.
- **Done when:** Qdrant down → chat/dots still demo fine, legal shows a clean unavailable state, recovery needs no restart.
- **Size:** M

### 3.3 Backup + venue-network tolerance
- **Problem:** SQLite is the only dots store, no export (`db.ts:48-58`); Docker loses data without a volume; offline breaks logo images; no model-list timeouts.
- **Fix:** hourly SQLite snapshot to `.data/backups/` + one-click export; document/pin the Docker volume; bundle or lazy-load app logos with fallback; AbortSignal timeouts on provider fetches.
- **Done when:** you can restore yesterday's dots; demo survives flaky Wi-Fi.
- **Size:** M

### 3.4 Trigger/scheduler honesty
- **Problem:** trigger subs die silently; one key change unsubscribes everyone (`triggers.ts:203-209`); scheduler skips missed runs with no notice.
- **Fix (demo-sized):** per-key subscribe/unsubscribe (stop passing blanket `unsubscribe()`); surface subscription status in Settings; log + banner missed routine runs. If triggers aren't in the demo script, disable the section rather than risk it.
- **Done when:** no silent trigger death; or triggers explicitly out of demo scope.
- **Size:** M (S to scope out)

## Phase 4 — Trust hardening (before paid pilots; partly before demo)

### 4.1 Correct the confidentiality story
- **Problem:** "Nothing trains on them" vs sends to Groq/NVIDIA/OpenAI/Composio/E2B + logo CDN beacon (`Home.tsx:184`, `SettingsView.tsx`, `composio.ts:196`).
- **Fix:** rewrite copy to what you control (isolation, encryption, no training *by you*); add a "where your data goes" disclosure in Settings; remove/consent-gate the logo beacon.
- **Done when:** every claim on login/signup pages survives a GC reading.
- **Size:** S

### 4.2 Audit trail export
- **Problem:** dot actions exist only as ephemeral pills (`Chat.tsx:406-417`); no timestamps/actors/tool args, no export.
- **Fix:** "Export run log" per conversation (timestamped tool calls + sources + approvals) as markdown/PDF.
- **Done when:** you can hand a client the matter file of what the AI did.
- **Size:** M

### 4.3 Input/output hardening
- **Problem:** Markdown without sanitize (`Chat.tsx:451`); `openUrl`/`nav` allow `file:`/link-local (SSRF, `browser.ts`, `cloud.ts:179-184`); local jail doesn't resolve symlinks (`shell.ts:70-76`); Composio OAuth without `state`.
- **Fix:** `rehype-sanitize` + link-protocol allowlist; block metadata/link-local/`file:` URLs; realpath-check workspace paths; add OAuth `state` nonce.
- **Done when:** stored-markdown phish, `file:///etc/passwd` read, and account-linking CSRF all fail closed.
- **Size:** M

### 4.4 Session hygiene
- **Problem:** 7-day cookies, no rotation or idle timeout; CSRF-sensitive `GET /api/composio/oauth` relies on Lax only (`session.ts:23-31`).
- **Fix:** sliding refresh with idle timeout; rotate on privilege actions; SameSite=Lax + origin check on OAuth callback.
- **Done when:** stolen-cookie window is hours, not a week.
- **Size:** M

## Phase 5 — Polish (demo week)

- [ ] Mobile: unhide model picker on small screens (`DotView.tsx:53-56`), verify Computer/Setup panes on tablet.
- [ ] Copy sweep: `Nyaya` placeholder, literal `aria-label="placeholder"` (`NewDot.tsx:53`), `Loading…` as content.
- [ ] Long-demo amnesia notice: surface when history truncation drops early context (`runtime.ts:622-631`).
- [ ] Voice: hide mic where unsupported instead of erroring (`voiceCall.ts:76-80`, `Chat.tsx:314-322`), or cut voice from the script.
- [ ] Dead code: remove or wire Postgres `chats`/`messages` (unused vs SQLite truth), `requireAdmin` callers.
- [x] E2B key governance: only admins can change the shared key — DONE as part of operator control (see below); note per-user billing is unsupported.
- [x] Operator control of models (Soli decides; users see no model names/pickers) — DONE:
  `SettingsView` Engine section admin-gated; `DotView` picker removed; sidebar title + `Chat`/`ComputerPane` copy neutralized;
  `setDotModel`/`setDefaultModel`/all provider-key actions admin-gated (`callerAdmin`);
  per-user provider keys + stale personal defaults ignored for non-admins (`isOperator` role mirror in SQLite, written on login/signup/role change);
  provider "Add one in Settings" errors reworded to "contact your administrator".
  Note: existing admins must re-login once so the local role mirror is written.
- [x] NVIDIA 404 fix (2026-10-12): `google/gemma-3-4b-it` is listed but not entitled on this account (verified live: chat/completions 404s).
  QUICK fallback + `MAIN_PREFERENCE` now prefer verified `nvidia/nemotron-3.5-lightning-30b-a3b`; review uses verified `nvidia/openai/gpt-oss-20b`.
  Admin globals actually govern `resolve()` now (previously `r.review` shadowed the global); deployment defaults seeded in SQLite.

---

## Demo-day checklist (run morning-of)

- [ ] Fresh staging deploy with real `SESSION_SECRET`; `DEMO_SEED=1` sample matter present.
- [ ] Two test accounts (A owner, B stranger): B sees zero of A's dots/chats/files; logout A→B clean.
- [ ] Airplane-mode pass: dots degrade gracefully; legal shows "unavailable", not 500.
- [ ] Kill-network-mid-answer pass: clean error + retry works.
- [ ] Upload-then-ask pass on venue network with the actual demo documents.
- [ ] Unknown-question pass: identical honest refusal in chat, agent, and API.
- [ ] `.data` backed up; Docker volume pinned (if containerized); rollback build tagged.
- [ ] Script avoids: triggers, voice, admin pages, model switching on mobile.

## Non-goals for this demo

Per-user E2B keys (SDK reads process env — shared infra is the documented posture),
hybrid/BM25 retrieval + reranker, full SSO/MFA, Postgres migration of dots —
all pilot-phase work. Do not start them pre-demo.