import { pgTable, text, integer, real, timestamp, json, serial, primaryKey } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  content: text('content').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  tripleCount: integer('triple_count').default(0).notNull(),
});

export const entities = pgTable('entities', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  data: json('data').$type<Record<string, any>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const relationships = pgTable('relationships', {
  id: serial('id').primaryKey(),
  sourceEntity: text('source_entity').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  targetEntity: text('target_entity').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  relation: text('relation').notNull(),
  confidence: real('confidence').notNull(),
  sourceDocumentId: integer('source_document_id').references(() => documents.id, { onDelete: 'cascade' }),
  sourceText: text('source_text'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Composite unique constraint for source-relation-target
export const relationshipsUnique = pgTable('relationships_unique', {
  sourceEntity: text('source_entity'),
  relation: text('relation'),
  targetEntity: text('target_entity'),
}, (table) => ({
  pk: primaryKey({ columns: [table.sourceEntity, table.relation, table.targetEntity] })
}));
