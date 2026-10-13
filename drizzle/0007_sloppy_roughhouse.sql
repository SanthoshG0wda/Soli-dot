CREATE TABLE "plan_configs" (
	"tier" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"monthly_price_usd" integer DEFAULT 0 NOT NULL,
	"monthly_tokens" integer DEFAULT 500000 NOT NULL,
	"max_documents" integer DEFAULT 50 NOT NULL,
	"max_seats" integer DEFAULT 1 NOT NULL,
	"top_k_limit" integer DEFAULT 5 NOT NULL,
	"allowed_models" text DEFAULT 'standard' NOT NULL,
	"features" text DEFAULT '[]' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_evals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"query" text NOT NULL,
	"expected_answer" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"expected_doc_title" text,
	"last_score" integer,
	"last_passed" integer,
	"last_latency_ms" integer,
	"last_result" text,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rag_evals_category_idx" ON "rag_evals" USING btree ("category");