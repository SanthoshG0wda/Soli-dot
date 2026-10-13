# Soli — Legal AI Platform: Development Summary

This document summarizes the features, architecture, user interface enhancements, legal document engines, and multi-agent personas implemented in the **Soli** platform.

---

## 1. Product Vision & Architecture Overview

**Soli** is an AI Legal Operating System and SaaS platform designed specifically for Indian advocates, law firms, corporate legal counsels, and chamber practices.

* **Frontend & Full-Stack Core:** Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS & Tailwind CSS.
* **Database & Persistence:** PostgreSQL with Drizzle ORM (auth, users, messages, artifacts, files) + SQLite for localized agent state.
* **Legal RAG & Vector Engine:** Qdrant Vector Database (`@qdrant/js-client-rest`) for statutory indexing (BNS, BNSS, BSA, CPC, Constitution) and case law retrieval.
* **Agent Execution Runtime:** Custom autonomous event-driven ReAct runtime (`src/server/agent/runtime.ts`) built on the official OpenAI SDK (`openai` v7) with support for the OpenAI Responses API, streaming Server-Sent Events (SSE), and multi-provider fallbacks (OpenAI, OpenRouter, NVIDIA NIM, Groq, and Gemini).
* **Sandboxes & Tooling:** 
  * Model Context Protocol (`@modelcontextprotocol/sdk`)
  * Composio (`@composio/core`) for 200+ SaaS app integrations
  * E2B Desktop Sandbox (`@e2b/desktop`) & Playwright for headless browser and shell execution

---

## 2. Interactive Artifact Board & Court Document Engine

### A. Claude-Style Document Card Banner
* **Footer Placement:** The document card is positioned cleanly at the bottom of the assistant message prose, matching Claude's interface.
* **Visual Presentation:**
  * **Left Icon Box:** Rounded container (`size-11 rounded-xl bg-black/[0.03] border border-black/[0.08]`) displaying document icons (`FileText` or `Scale`).
  * **Document Information:** Formatted title with subtitle line: `Document · PDF` or `Document · PDF · Word`.
  * **Direct `[Download]` Button:** Dedicated action button on the right for one-click downloading of court-margin PDFs and Word files without forcing the preview panel to open.
  * **Interactive Preview:** Clicking anywhere on the card opens the resizable split Artifact Board preview on the right.
* **Message Actions:** Claude-style action row placed beneath each message: **Copy**, **Thumbs Up**, **Thumbs Down**, and **Regenerate**.

### B. Draggable & Bidirectional Split-Screen Board
* **Resizable Split Screen:** Draggable divider with smooth pointer tracking, cursor state (`col-resize`), double-click reset to 50/50, and persistent width storage in `localStorage`.
* **Side-by-Side Verification:** Lawyers can view live court documents on the right while interacting with the agent on the left.

### C. Legal Document Generation Engine (`service.ts`)
* **Strict Court Margins & Cause Titles:** High Court and District Court formatting with formal party headers, lists of dates, numbered grounds, prayer clauses, and verification statements.
* **PDF & DOCX Export:** Generates court-ready PDFs (`pdf-lib`) and editable Microsoft Word documents (`docx`).
* **Automated Document Detection (`detector.ts`):** Automatically detects statutory notices, bail applications, quashing petitions, and pleadings in chat, converting them into downloadable artifacts.

---

## 3. UI/UX Redesign & Claude Aesthetics

* **Claude-Style Collapsible Sidebar:** Shrinks and expands smoothly, with tooltips, active-state highlights, and clear section dividers.
* **Typography & Styling:** Inter, Outfit, and Serif font hierarchy with balanced line heights, refined letter spacing, and subtle contrast.
* **Theme Preview (`theme-preview.html`):** Created a live standalone demonstration showcasing multiple curated themes (Dark Executive, Clean Ivory, Navy Corporate, Midnight Onyx, Charcoal), refined specifically for advocates and law firm clients.

---

## 4. The 4 Core Litigation Personas

The platform features 4 specialized litigation personas configured in a central registry (`src/lib/personas.ts`):

```
                                 ┌───────────────────────────────────┐
                                 │           SOLI PLATFORM           │
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
  * **Strict Document Purity:** Invokes `write_legal_paper` to generate clean documents without chat clutter.
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

## 5. UI Persona Integration

1. **Dynamic Prompt Suggestions:** The Home screen and Chat Welcome screen automatically adapt their 4 quick-action prompt chips depending on which agent is selected.
2. **Role Badges & Avatars:** The active agent's professional title (e.g. `COURTROOM DRAFTING COUNSEL & ADVOCATE`) appears in the picker pills, headers, and welcome screens.
3. **Pre-filled Persona Template Selector (`SetupPane.tsx`):** The agent setup tab features quick-load chips (`Nyaya`, `Vakil`, `Pramaan`, `Docket`) allowing users to inspect, load, and edit the full courtroom instruction templates.
4. **New Assistant Creation (`NewDot.tsx`):** Users can spin up new custom agents initialized with any of the 4 litigation personas.

---

## 6. Code Quality & Standards

* **TypeScript Compilation:** `npx tsc --noEmit` passes with **0 errors**.
* **Linting:** `npx eslint . --max-warnings 0` passes with **0 errors and 0 warnings**.
