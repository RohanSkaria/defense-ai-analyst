import { z } from 'zod';
import { EntityType } from './entities.js';
import { RelationType, ConfidenceScore } from './relations.js';

/**
 * Knowledge graph triple (RDF-style)
 * Format: (entity_a, relation, entity_b) with metadata
 */
export const TripleSchema = z.object({
  a: z.string().min(1),
  type_a: EntityType,
  relation: RelationType,
  b: z.string().min(1),
  type_b: EntityType,
  confidence: ConfidenceScore,
  source_text: z.string().optional(),
});

export type Triple = z.infer<typeof TripleSchema>;

/**
 * Orphan entity (no relationships found during ingestion)
 */
export const OrphanEntitySchema = z.object({
  entity: z.string().min(1),
  type: EntityType,
  reason: z.string(),
});

export type OrphanEntity = z.infer<typeof OrphanEntitySchema>;

/**
 * Ambiguity tracking during ingestion
 */
export const AmbiguitySchema = z.object({
  text: z.string(),
  interpretations: z.array(z.string()),
  resolution: z.enum(['created_both', 'needs_clarification']),
});

export type Ambiguity = z.infer<typeof AmbiguitySchema>;

/**
 * Complete ingestion output format
 */
export const IngestionOutputSchema = z.object({
  triples: z.array(TripleSchema),
  orphan_entities: z.array(OrphanEntitySchema),
  ambiguities: z.array(AmbiguitySchema),
});

export type IngestionOutput = z.infer<typeof IngestionOutputSchema>;
