# Soli Web — Cloud Legal AI Platform & Control Plane

Soli Web is the cloud-native SaaS backend and web application for the Soli legal AI platform.

## Architecture

- **Web Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (Neon Serverless) managed with Drizzle ORM
- **Vector Database:** Qdrant Cloud (collections: `statutes`, `constitutional`, `case-law`)
- **Control Plane:** Dedicated Enterprise Admin Portal (`/admin/*`)
  - **Corpus & Ingestion (`/admin/corpus`):** Bare Acts ingestion, PDF parsing, Qdrant indexing, and chunk inspection.
  - **RAG Evals (`/admin/evals`):** Legal benchmark suite, keyword recall, citation verification, and latency scoring.
  - **Model Providers (`/admin/models`):** Deployment-wide LLM provider fallbacks (Anthropic, OpenAI, Gemini, Ollama).
  - **Plans & Limits (`/admin/plans` & `/admin/limits`):** Tier quotas, monthly token budgets, seat allotments, and retrieval bounds.
  - **Users & Teams (`/admin/users`):** Firm member access control.

## Getting Started

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

Visit [http://localhost:3100](http://localhost:3100) for the assistant and [http://localhost:3100/admin](http://localhost:3100/admin) for the firm control plane.
