import { z } from 'zod';

/**
 * Confidence issue tracking
 */
export const ConfidenceIssueSchema = z.object({
  triple: z.string(),
  issue: z.string(),
});

export type ConfidenceIssue = z.infer<typeof ConfidenceIssueSchema>;

/**
 * Validation report format
 */
export const ValidationReportSchema = z.object({
  validation_results: z.object({
    total_entities: z.number().int().nonnegative(),
    total_relations: z.number().int().nonnegative(),
    orphan_nodes: z.array(z.string()),
    schema_violations: z.array(z.string()),
    confidence_issues: z.array(ConfidenceIssueSchema),
    duplicate_entities: z.array(z.string()),
    missing_types: z.array(z.string()),
  }),
  recommendations: z.array(z.string()),
});

export type ValidationReport = z.infer<typeof ValidationReportSchema>;
