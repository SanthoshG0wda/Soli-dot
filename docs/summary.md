# Soli Project Summary

## Overview
**Soli** is an AI paralegal assistant built with Next.js 16.3.5, TypeScript, and React 19. It indexes legal matter files (PDFs) and provides cited answers with streaming responses, targeting lawyers who need verifiable, grounded research over their own documents.

Tagline: *Counsel, meet your tireless paralegal.*

## Tech Stack

### Core Framework
- **Next.js 16.3.5** with App Router
- **React 19.2.8**
- **TypeScript 5**
- **TailwindCSS 4**

### AI / RAG
- **AI SDK v7** (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`)
- **NVIDIA NIM** via `@ai-sdk/openai` integration
  - LLM: `nvidia/nvidia-nemotron-nano-9b-v2` (default)
  - Embeddings: `nvidia/nvidia-embed-qa-4` (1024 dims)
- **Qdrant** vector database for semantic search
  - Collection: `soli_chunks` (configurable)
  - Cosine distance, payload indexes on `document_id`, `chunk_id`, `chunk_index`, `page_number`

### Backend / Data
- **PostgreSQL** with **Drizzle ORM 0.45.2**
- **Drizzle Kit** for migrations
- **Session auth** with `jose` + `bcryptjs`
- **unpdf** for PDF text extraction
- **postgres** driver

### Testing / Dev
- **Vitest 5** for unit tests
- **ESLint 9**

## Architecture

### Multi-tenancy & Auth
- Users table with `role` enum: `admin` | `user`
- Session-based auth via HTTP-only cookies
- `requireUser()` and `requireAdmin()` guards on routes
- Admin emails configurable via `ADMIN_EMAILS` env
- Recent commits indicate multi-tenancy was added: `8464eba added multi-tennecy`, `0524513 added auth`

### Document Lifecycle
Status flow: `uploading` → `processing` → `ready` | `failed`

**Ingestion pipeline** (`src/lib/ingest/service.ts`):
1. Save document row with `uploading` status
2. Extract PDF text via `unpdf`
3. Normalize & chunk pages (default 1200 chars, 200 overlap)
4. Embed chunks in passage mode via NVIDIA NIM
5. Upsert vectors to Qdrant with stable IDs
6. Commit chunks to Postgres in transaction
7. Mark `ready` or `failed` with cleanup on error

- Max PDF size: 25 MB
- Only PDFs accepted, verified by `%PDF-` magic bytes
- Admin-only upload via `/api/documents` POST
- Documents can be tagged with a corpus collection: `constitutional`, `statutes`, `case-law`

### RAG Pipeline
**Production entry point**: `src/lib/rag/index.ts`

- Retrieval via Qdrant `searchSimilarChunks`
- Top-K default: 5 (`TOP_K`)
- Context window limits:
  - `RAG_CONTEXT_MAX_CHARS`: 12000
  - `RAG_CHUNK_MAX_CHARS`: 4000
- Temperature: 0.2
- System prompts in `src/lib/rag/system-prompt.ts`:
  - Grounded answers over `<retrieved_context>`
  - General conversation fallback when no relevant chunks
  - Explicit instruction to treat document text as untrusted data

**Chat flow** (`src/app/api/chat/route.ts`):
- `planRagChat` decides proceed vs general
- Streams via Vercel AI SDK `streamText`
- User messages persisted immediately
- Assistant messages persisted on stream finish with citations
- Overlay logic in `src/lib/chat/overlay.ts` for UI updates

### Database Schema

**Tables** (from `src/db/schema.ts`):
- `users` (id, name, email unique, password_hash, role, timestamps)
- `sessions` (id, userId FK cascade, expiresAt)
- `documents` (id, title, fileName, mimeType, sizeBytes, pageCount, collection nullable, status, error, timestamps)
  - Check constraints for status and collection
- `chunks` (id, documentId FK cascade, content, pageNumber, chunkIndex, charCount, charStart, charEnd)
  - Indexes on documentId and documentId+chunkIndex
- `chats` (id, userId nullable FK cascade, title, timestamps)
- `messages` (id, chatId FK cascade, role enum, content, citations jsonb, createdAt)
  - Indexes on chatId

**Migrations**:
- `0000_init.sql` – initial schema with `document_status` enum
- `0001_familiar_epoch.sql`
- `0002_wooden_mandroid.sql`
- `0003_chemical_multiple_man.sql`
- `0004_past_leopardon.sql`
- `0005_woozy_dorian_gray.sql` – adds `collection` column + check constraint

### API Routes

**Auth**
- `POST /api/auth/register` – signup
- `POST /api/auth/login` – login, creates session
- `POST /api/auth/logout` – destroy session
- `GET /api/auth/me` – current user

**Documents**
- `GET /api/documents` – list with chunk counts
- `POST /api/documents` – admin PDF upload + ingest
- `DELETE /api/documents/[id]` – delete document + vectors + chunks

**Chat**
- `GET /api/chat` – list user's chats
- `POST /api/chat` – streaming RAG chat, optional `documentIds` filter
- `GET /api/chat/[id]` – fetch chat history

### Pages

- `/` – Landing page with value props: Legal research, Cited answers, Matter diligence; assurances: Confidential by design, Verifiable not magic, Research aid not counsel
- `/chat` – Consultation UI (`ChatPanel` component)
- `/documents` – Case files manager (`DocumentManager`)
- `/login`, `/signup` – Auth forms
- `/admin` – Knowledge base admin (`CorpusManager`) – admin only
- `/admin/test` – Test consultation

### Key Components

- `SiteHeader` – nav, admin link, user menu, logout
- `ChatPanel` – streaming chat UI with sources
- `DocumentManager` – upload, list, status, collection tagging
- `CorpusManager` – admin corpus curation
- Auth forms with Zod validation

### Configuration

**Env vars** (`src/env.ts`):
- `DATABASE_URL` – Postgres
- `NIM_BASE_URL`, `NVIDIA_API_KEY`, `NIM_LLM_MODEL`, `NIM_EMBEDDING_MODEL`
- `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION`
- `EMBEDDING_DIMENSIONS` default 1024
- `CHUNK_SIZE` 1200, `CHUNK_OVERLAP` 200
- `TOP_K` 5, `RAG_CONTEXT_MAX_CHARS` 12000, `RAG_CHUNK_MAX_CHARS` 4000
- `RAG_TEMPERATURE` 0.2
- `SESSION_SECRET` ≥32 chars, `SESSION_MAX_AGE_SECONDS` default 7 days
- `ADMIN_EMAILS`

**Config defaults** (`src/config.ts`): mirrors env defaults

### Providers

Swappable providers in `src/providers/index.ts`:
- `embeddingProvider` → `NimEmbeddingProvider`
- `llmProvider` → `NimLLMProvider`

### Corpus

Three collections defined in `src/lib/corpus.ts`:
- `constitutional` – Constitution, schedules, amendments
- `statutes` – BNS, BNSS, Bharatiya Sakshya Adhiniyam, etc.
- `case-law` – Criminal judgments, orders

Documents may be uncategorized.

### Project Structure Highlights

```
src/
 app/
   api/
     auth/ login|logout|me|register
     chat/ route + [id]
     documents/ route + [id]
   admin/ page + test
   chat/ page
   documents/ page
   login/ page
   signup/ page
 components/
   auth/
   chat/
   documents/
   admin/
   site-header
 lib/
   auth/ session, token, password, validation, roles
   chat/ history, overlay, persistence, sources, types
   ingest/ chunk, extract, ids, normalize, service
   rag/ chat, citations, context, rag, system-prompt
   retrieval/
   vector/ qdrant, errors, logger, types
 providers/ embedding-nim, embedding, llm-nim, llm
 db/ schema, index
```

### Recent Work
Git status shows active modifications:
- `src/app/api/documents/[id]/route.ts`
- `src/app/api/documents/route.ts`
- `src/components/chat/chat-panel.tsx`
- `src/components/documents/document-manager.tsx`
- `src/components/site-header.tsx`
- `src/db/schema.ts`
- `src/lib/auth/index.ts`
- `src/lib/auth/session.ts`
- `src/lib/ingest/service.ts`
- `src/proxy.ts`
Untracked:
- `drizzle/0005_woozy_dorian_gray.sql`
- `drizzle/meta/0005_snapshot.json`
- `secrets.txt`
- `soli-video/` directory
- `src/app/admin/`
- `src/components/admin/`
- `src/lib/corpus.ts`

### Notes
- AGENTS.md warns this is NOT the Next.js you know – breaking changes in APIs/conventions. Read guides in `node_modules/next/dist/docs/`.
- The app runs on port 4000 (`next dev -p 4000`).
- Dark UI by default with `soli-accent` branding.
- Citations stored as JSONB on messages with chunkId, documentId, title, pageNumber, excerpt, score.

Generated: 2026-10-05
