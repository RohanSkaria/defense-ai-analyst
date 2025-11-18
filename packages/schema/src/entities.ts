import { z } from 'zod';

/**
 * Primary entity types for defense knowledge graph
 */
export const EntityType = z.enum([
  // Primary types
  'Program',
  'System',
  'Subsystem',
  'Technology',
  'Capability',
  'Contractor',
  'GovernmentOffice',
  'PEO',

  // Secondary types
  'Requirement',
  'Standard',
  'Milestone',
  'TestEvent',
  'FundingLine',
  'Risk',
  'Location',

  // Metadata types
  'Classification',
  'Timeline',
]);

export type EntityType = z.infer<typeof EntityType>;

/**
 * Entity schema with optional metadata
 */
export const EntitySchema = z.object({
  id: z.string().min(1),
  type: EntityType,
  name: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

export type Entity = z.infer<typeof EntitySchema>;
