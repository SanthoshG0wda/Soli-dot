CREATE TABLE "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"lead_id" text NOT NULL,
	"members" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"dot_id" text NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"organization_id" uuid,
	"title" text NOT NULL,
	"kind" text DEFAULT 'chat' NOT NULL,
	"ref" text,
	"thread" text,
	"pending" text,
	"history" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dot_files" (
	"id" text PRIMARY KEY NOT NULL,
	"dot_id" text NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" bigint NOT NULL,
	"source" text NOT NULL,
	"box_path" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dot_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"dot_id" text NOT NULL,
	"conversation_id" text,
	"channel_id" text,
	"role" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"title" text,
	"card" text,
	"source" text,
	"attachments" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"purpose" text DEFAULT '' NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"look" text NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"local_access" integer DEFAULT 0 NOT NULL,
	"model" text,
	"box_id" text,
	"thread" text,
	"pending" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" text PRIMARY KEY NOT NULL,
	"dot_id" text NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"text" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_members_role_check" CHECK ("organization_members"."role" IN ('owner', 'admin', 'member', 'viewer'))
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan_tier" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_plan_tier_check" CHECK ("organizations"."plan_tier" IN ('free', 'starter', 'pro', 'enterprise'))
);
--> statement-breakpoint
CREATE TABLE "passwords" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"site" text NOT NULL,
	"username" text NOT NULL,
	"secret" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" text PRIMARY KEY NOT NULL,
	"dot_id" text NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"instruction" text NOT NULL,
	"schedule" text NOT NULL,
	"enabled" integer DEFAULT 1 NOT NULL,
	"last_run_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" text PRIMARY KEY NOT NULL,
	"dot_id" text,
	"user_id" text DEFAULT '' NOT NULL,
	"action" text NOT NULL,
	"decision" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" text DEFAULT '' NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "settings_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"dot_id" text NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"body" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triggers" (
	"id" text PRIMARY KEY NOT NULL,
	"dot_id" text NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"composio_id" text NOT NULL,
	"slug" text NOT NULL,
	"toolkit" text NOT NULL,
	"name" text NOT NULL,
	"config" text NOT NULL,
	"instruction" text NOT NULL,
	"enabled" integer DEFAULT 1 NOT NULL,
	"last_fired_at" bigint,
	"last_error" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dots" ADD CONSTRAINT "dots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channels_user_idx" ON "channels" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_dot_idx" ON "conversations" USING btree ("dot_id","updated_at");--> statement-breakpoint
CREATE INDEX "conversations_user_idx" ON "conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "conversations_org_id_idx" ON "conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dot_files_user_idx" ON "dot_files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dot_messages_conv_idx" ON "dot_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "dot_messages_dot_idx" ON "dot_messages" USING btree ("dot_id","created_at");--> statement-breakpoint
CREATE INDEX "dots_user_id_idx" ON "dots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dots_org_id_idx" ON "dots" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "memories_dot_idx" ON "memories" USING btree ("dot_id");--> statement-breakpoint
CREATE INDEX "memories_user_idx" ON "memories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_members_org_id_idx" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passwords_user_idx" ON "passwords" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "routines_user_idx" ON "routines" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rules_user_idx" ON "rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "settings_user_idx" ON "settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "skills_dot_idx" ON "skills" USING btree ("dot_id");--> statement-breakpoint
CREATE INDEX "skills_user_idx" ON "skills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "triggers_user_idx" ON "triggers" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chats_org_id_idx" ON "chats" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "documents_org_id_idx" ON "documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");