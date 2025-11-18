import { z } from 'zod';

/**
 * Relation types for knowledge graph edges
 */
export const RelationType = z.enum([
  // Core relations (MVP focus)
  'part_of',
  'overseen_by',
  'developed_by',
  'funded_by',
  'depends_on',
  'interfaces_with',

  // Extended relations
  'enables',
  'mitigates',
  'located_at',
  'has_requirement',
  'tested_by',
  'certified_for',
  'supersedes',
]);

export type RelationType = z.infer<typeof RelationType>;

/**
 * Confidence score must be between 0.5 and 1.0
 * Values below 0.5 are rejected per CLAUDE.md rules
 */
export const ConfidenceScore = z.number().min(0.5).max(1.0);

export type ConfidenceScore = z.infer<typeof ConfidenceScore>;
