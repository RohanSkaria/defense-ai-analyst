CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"content" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"triple_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"data" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_entity" text NOT NULL,
	"target_entity" text NOT NULL,
	"relation" text NOT NULL,
	"confidence" real NOT NULL,
	"source_document_id" integer,
	"source_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships_unique" (
	"source_entity" text,
	"relation" text,
	"target_entity" text,
	CONSTRAINT "relationships_unique_source_entity_relation_target_entity_pk" PRIMARY KEY("source_entity","relation","target_entity")
);
--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_source_entity_entities_id_fk" FOREIGN KEY ("source_entity") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_target_entity_entities_id_fk" FOREIGN KEY ("target_entity") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;