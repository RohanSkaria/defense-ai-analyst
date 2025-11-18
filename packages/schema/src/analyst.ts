import { z } from 'zod';
import { ConfidenceScore } from './relations.js';

/**
 * Evidence source for analyst responses
 */
export const EvidenceSchema = z.object({
  source: z.enum(['graph', 'inference']),
  content: z.string(),
  confidence: ConfidenceScore,
  relevance: z.string(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

/**
 * Analyst response format (per CLAUDE.md spec)
 */
export const AnalystResponseSchema = z.object({
  analysis: z.string(),
  key_findings: z.array(z.string()),
  evidence: z.array(EvidenceSchema),
  unknowns: z.array(z.string()),
  recommended_next_questions: z.array(z.string()),
  overall_confidence: ConfidenceScore,
  retrieval_strategy: z.enum(['direct', '1-hop', '2-hop']),
});

export type AnalystResponse = z.infer<typeof AnalystResponseSchema>;
