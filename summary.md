# Legal AI Platform: Development Summary

This document provides a comprehensive summary of the architecture, user interface enhancements, legal document engines, file upload and parsing systems, multi-agent personas, and recent stability fixes implemented in the platform.

---

## 1. Product Vision & Architecture Overview

The platform is an AI Legal Operating System designed specifically for Indian advocates, law firms, corporate legal counsels, and chamber practices.

```
                              ┌────────────────────────────────────────┐
                              │            SOLI WEB FRONTEND           │
                              │   Next.js 16 · React 19 · Port 3100    │
                              └───────────────────┬────────────────────┘
                                                  │ HTTP Proxy / SSE
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │          SOLI STANDALONE BACKEND       │
                              │      Hono · Node.js · Port 4000        │
                              └───────┬──────────────┬──────────────┬──┘
                                      │              │              │
             ┌────────────────────────┴─┐     ┌──────┴───────┐   ┌──┴─────────────────────────┐
             │    Persistence Layer     │     │ Vector Engine│   │    Local Edge Inference    │
             │ SQLite (State) · Postgres│     │    Qdrant    │   │  Qwen 2.5 7B GGUF Server   │
             │   Filesystem Blob Store  │     │  Vector RAG  │   │   http://10.10.0.247:8082  │
             └──────────────────────────┘     └──────────────┘   └────────────────────────────┘
```

* **Frontend (`soli-web`):** Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS & Tailwind CSS. Operates on port 3100.
* **Standalone Backend (`soli-backend`):** High-performance Hono API server running on port 4000 (`tsx watch src/server.ts`). Handles agent runtime, file storage, legal document generation, and database interactions.
* **Database & Persistence:**
  * **PostgreSQL with Drizzle ORM:** Enterprise storage for authentication, users, teams, and audit trails.
  * **SQLite (`node:sqlite`):** Localized low-latency storage for agents (`dots`), messages, conversation threads, and artifacts.
  * **Filesystem Store (`.data/files/`):** Blob storage for user uploads, extracted text, and compiled court documents.
* **Legal RAG & Vector Engine:** Qdrant Cloud Vector Database (`@qdrant/js-client-rest`) indexing Indian statutes (**BNS, BNSS, BSA, CPC, Constitution of India, Limitation Act, NI Act**) and landmark Supreme Court/High Court case law.
* **Agent Execution Runtime:** Autonomous event-driven ReAct runtime (`src/services/agent/runtime.ts`) supporting OpenAI-compatible streaming Server-Sent Events (SSE) and multi-provider fallbacks (Local Qwen 2.5 7B, OpenRouter, Groq, NVIDIA NIM).

---

## 2. Interactive Artifact Board & Court Document Engine

### A. Claude-Style Document Card Banner
* **Footer Placement:** The document card is positioned cleanly at the bottom of the assistant message prose, matching Claude's layout.
* **Visual Presentation:**
  * **Left Icon Box:** Rounded container (`size-11 rounded-xl bg-black/[0.03] border border-black/[0.08]`) displaying document icons (`FileText` or `Scale`).
  * **Document Information:** Formatted title with subtitle line: `Document · PDF` or `Document · PDF · Word`.
  * **Direct `[Download]` Button:** Dedicated action button on the right for one-click downloading of court-margin PDFs and Word files without forcing the preview panel to open.
  * **Interactive Preview:** Clicking anywhere on the card opens the resizable split Artifact Board preview on the right.
* **Message Actions:** Claude-style action row placed beneath each message: **Copy**, **Thumbs Up**, **Thumbs Down**, and **Regenerate**.

### B. Draggable & Bidirectional Split-Screen Board
* **Resizable Split Screen:** Draggable divider with smooth pointer tracking, cursor state (`col-resize`), double-click reset to 50/50, and persistent width storage in `localStorage`.
* **Side-by-Side Verification:** Advocates can view live court documents on the right while interacting with the agent on the left.
* **Three View Modes:**
  1. **Court Paper View:** Traditional Indian judicial formatting on soft legal paper (`#fdfcf9`) with court cause headers, margin rules, and statutory stamps.
  2. **Prose View:** Clean typographic Markdown rendering.
  3. **PDF View:** Embedded PDF preview iframe for compiled court drafts.

### C. Legal Document Generation Engine (`court-engine.ts`)
* **Strict Court Margins & Cause Titles:** High Court and District Court formatting with formal party headers, lists of dates, numbered grounds, prayer clauses, and verification statements.
* **PDF & DOCX Export:** Generates court-ready PDFs (`pdf-lib`) and editable Microsoft Word documents (`docx`).
* **Automated Document Detection (`detector.ts`):** Automatically detects statutory notices, bail applications, quashing petitions, plaints, and contracts in chat, converting them into downloadable artifacts.

---

## 3. Document Upload & Parsing Infrastructure

* **Multi-Format Ingestion:** Advocates can upload contract agreements, charge-sheets, FIRs, and notices via the paperclip icon (`📎`) in the composer.
* **Fast Text Extraction:** Integrated `unpdf` for PDF parsing and UTF-8 decoders for text and markdown documents.
* **Prompt Context Injection:** Attached files are parsed on upload and automatically fed into the LLM runtime under `[USER UPLOADED ATTACHMENT CONTEXT]`.
* **Ready-to-Use Test Documents (`sample-docs/`):**
  * **`Mutual_Non_Disclosure_Agreement.pdf` / `.txt`:** Tests Section 27 Indian Contract Act analysis (restrictive non-compete covenant and unilateral indemnities).
  * **`Section_138_NI_Act_Legal_Demand_Notice.pdf` / `.txt`:** Tests cheque bounce statutory limitation periods and 15-day demand notice requirements under the Negotiable Instruments Act, 1881.
  * **`Commercial_Lease_Deed_Bangalore.pdf` / `.txt`:** Tests commercial lease agreements, 36-month lock-in liquidated damages vs penalty clauses, and mandatory registration under the Registration Act, 1908.

---

## 4. UI/UX Cleanliness & Recent Optimizations

* **Voice Call Deprecation & Cleanup:** Fully removed unused voice call overlays and buttons from the chat input and header, streamlining the UI for text and document-driven workflows.
* **Artifact Opening Latency Elimination:**
  * Fixed SQLite schema constraint issue where missing `filename` caused HTTP 500 errors.
  * Implemented optimistic client-side artifact activation (`addArtifactLocally` + `setActiveArtifact`), ensuring the Artifact Board opens immediately on click with zero delay.
  * Added automated database migrations in `db/index.ts` to ensure all artifact metadata columns (`filename`, `summary`, `metadata`, `file_id`, `pdf_file_id`, `docx_file_id`) are present and indexed.
  * Auto-generates court-formatted PDFs on artifact persistence so the PDF preview tab and download button work out-of-the-box.
* **Conversation Management:**
  * Atomic transactional deletion for conversations, messages, and associated artifacts in `soli-backend`.
  * Client-side optimistic store updates that instantly purge deleted conversations from the sidebar without requiring page refreshes.

---

## 5. The 4 Core Litigation Personas

The platform features 4 specialized litigation personas configured in a central registry (`src/lib/personas.ts`):

```
                                 ┌───────────────────────────────────┐
                                 │         LEGAL AI PLATFORM         │
                                 └─────────────────┬─────────────────┘
                                                   │
         ┌───────────────────┬─────────────────────┴───────────────────┬───────────────────┐
         │                   │                                         │                   │
         ▼                   ▼                                         ▼                   ▼
     ┌───────┐           ┌───────┐                                 ┌───────┐           ┌───────┐
     │ NYAYA │           │ VAKIL │                                 │PRAMAAN│           │DOCKET │
     └───────┘           └───────┘                                 └───────┘           └───────┘
  Legal Research      Court Drafting                              Case Scrutiny      Chamber Practice
  & Jurisprudence       & Pleadings                             & Evidence Audit    & Matter Management
```

### 1. Nyaya — Senior Legal Researcher & Jurist
* **Mandate:** Statutory interpretation, case law research, Supreme Court & High Court precedents, ratio decidendi extraction.
* **Core Capabilities:**
  * Differentiates the new criminal codes (**BNS 2023, BNSS 2023, BSA 2023**) from colonial statutes (IPC, CrPC, IEA), applying Section 531 BNSS transitional rules.
  * Rigorous precedent discipline (Constitution Bench vs Division Bench authority).
  * Formal citations (SCC, AIR, SCR, INSC) with zero hallucination.
* **Dynamic Starter Prompts:**
  * Anticipatory Bail Precedents under Section 482 BNSS
  * BNS vs IPC Comparative Offence Analysis
  * PMLA Section 45 Twin Conditions post-Vijay Madanlal
  * Section 11 Arbitration Judicial Scrutiny Scope

### 2. Vakil — Courtroom Drafting Counsel & Advocate
* **Mandate:** Drafting court-ready pleadings, bail applications, petitions, statutory demand notices, plaints, written statements, and affidavits.
* **Core Capabilities:**
  * High Court and District Court practice rules compliance.
  * Proper cause titles, memos of parties, numbered grounds, prayer clauses, and verifications.
  * **Strict Document Purity:** Generates structured legal pleadings and agreements cleanly displayed in the interactive Artifact Board.
* **Dynamic Starter Prompts:**
  * Regular Bail Application under Section 483 BNSS (Satender Antil grounds)
  * Section 138 NI Act 15-day Statutory Demand Notice
  * Section 528 BNSS Quashing Petition (Bhajan Lal parameters)
  * Section 94 BNSS Evidence Preservation Application (CCTV & CDRs)

### 3. Pramaan — Forensic Case Scrutiny & Evidence Auditor
* **Mandate:** Detailed scrutiny of case files, FIRs, charge-sheets, witness statements under Sec 180/183 BNSS, electronic evidence, and forensic reports.
* **Core Capabilities:**
  * Date-and-time chronological fact matrices.
  * FIR vs witness deposition contradiction & omission matrices.
  * Electronic evidence compliance audits (**Section 63 BSA / Section 65B**).
  * Targeted cross-examination question frameworks for IOs and witnesses.
* **Dynamic Starter Prompts:**
  * Audit Charge-Sheet & FIR Contradiction Matrix
  * Reconstruct Chronological Fact Table
  * Section 63 BSA / 65B Electronic Evidence Audit
  * Cross-Examination Questionnaire for Investigating Officers

### 4. Docket — Chamber Practice & Matter Coordinator
* **Mandate:** Hearing preparation briefs, limitation period tracking, cause list monitoring, client intake briefs, and senior counsel briefing packs.
* **Core Capabilities:**
  * Next Date of Hearing (NDH) chamber preparation sheets (Court No., Item No., Coram, Stage, Pending IAs, Talking Points).
  * Statutory limitation calculations (Limitation Act 1963, Sec 138 NI Act, Sec 187 BNSS default bail).
  * 2-page Senior Counsel briefing packs with page indexes.
* **Dynamic Starter Prompts:**
  * Next Date of Hearing (NDH) Preparation Brief
  * Statutory Limitation Period Tracker
  * Client Intake Assessment & Case Synopsis
  * 2-Page Senior Counsel Briefing Note

---

## 6. Verification & Quality Standards

* **Backend Type Check & Build:** `pnpm --filter soli-backend build` passes with **0 errors**.
* **Frontend Type Check:** `pnpm --filter soli-web typecheck` passes with **0 errors**.
* **Database State:** Verified SQLite schema with automated self-healing column migrations for `dots`, `conversations`, `messages`, and `artifacts`.
