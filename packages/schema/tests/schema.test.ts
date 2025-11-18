import { describe, it, expect } from 'vitest';
import {
  EntityType,
  EntitySchema,
  RelationType,
  ConfidenceScore,
  TripleSchema,
  IngestionOutputSchema,
  AnalystResponseSchema,
  ValidationReportSchema,
} from '../src/index.js';

describe('EntitySchema', () => {
  it('should validate valid entity', () => {
    const entity = {
      id: 'raytheon-1',
      type: 'Contractor' as const,
      name: 'Raytheon Technologies',
    };
    expect(() => EntitySchema.parse(entity)).not.toThrow();
  });

  it('should reject invalid entity type', () => {
    const entity = {
      id: 'test-1',
      type: 'InvalidType',
      name: 'Test',
    };
    expect(() => EntitySchema.parse(entity)).toThrow();
  });

  it('should reject empty id', () => {
    const entity = {
      id: '',
      type: 'System' as const,
      name: 'Test System',
    };
    expect(() => EntitySchema.parse(entity)).toThrow();
  });
});

describe('ConfidenceScore', () => {
  it('should accept valid confidence scores', () => {
    expect(() => ConfidenceScore.parse(0.5)).not.toThrow();
    expect(() => ConfidenceScore.parse(0.75)).not.toThrow();
    expect(() => ConfidenceScore.parse(0.90)).not.toThrow();
    expect(() => ConfidenceScore.parse(1.0)).not.toThrow();
  });

  it('should reject confidence below 0.5', () => {
    expect(() => ConfidenceScore.parse(0.49)).toThrow();
    expect(() => ConfidenceScore.parse(0.0)).toThrow();
  });

  it('should reject confidence above 1.0', () => {
    expect(() => ConfidenceScore.parse(1.01)).toThrow();
    expect(() => ConfidenceScore.parse(2.0)).toThrow();
  });
});

describe('TripleSchema', () => {
  it('should validate valid triple', () => {
    const triple = {
      a: 'AN/SPY-6',
      type_a: 'Subsystem' as const,
      relation: 'part_of' as const,
      b: 'DDG-51 Flight III',
      type_b: 'System' as const,
      confidence: 0.90,
      source_text: 'AN/SPY-6 radar for DDG-51 Flight III',
    };
    expect(() => TripleSchema.parse(triple)).not.toThrow();
  });

  it('should accept triple without source_text', () => {
    const triple = {
      a: 'AN/SPY-6',
      type_a: 'Subsystem' as const,
      relation: 'part_of' as const,
      b: 'DDG-51 Flight III',
      type_b: 'System' as const,
      confidence: 0.90,
    };
    expect(() => TripleSchema.parse(triple)).not.toThrow();
  });

  it('should reject invalid relation type', () => {
    const triple = {
      a: 'AN/SPY-6',
      type_a: 'Subsystem' as const,
      relation: 'invalid_relation',
      b: 'DDG-51 Flight III',
      type_b: 'System' as const,
      confidence: 0.90,
    };
    expect(() => TripleSchema.parse(triple)).toThrow();
  });

  it('should reject low confidence triple', () => {
    const triple = {
      a: 'AN/SPY-6',
      type_a: 'Subsystem' as const,
      relation: 'part_of' as const,
      b: 'DDG-51 Flight III',
      type_b: 'System' as const,
      confidence: 0.3,
    };
    expect(() => TripleSchema.parse(triple)).toThrow();
  });
});

describe('IngestionOutputSchema', () => {
  it('should validate complete ingestion output', () => {
    const output = {
      triples: [
        {
          a: 'Raytheon Technologies',
          type_a: 'Contractor' as const,
          relation: 'developed_by' as const,
          b: 'AN/SPY-6',
          type_b: 'Subsystem' as const,
          confidence: 0.95,
          source_text: 'Raytheon provides AN/SPY-6',
        },
      ],
      orphan_entities: [
        {
          entity: 'Unknown Program',
          type: 'Program' as const,
          reason: 'no relationships found',
        },
      ],
      ambiguities: [
        {
          text: 'GD',
          interpretations: ['Golden Dome', 'General Dynamics'],
          resolution: 'needs_clarification' as const,
        },
      ],
    };
    expect(() => IngestionOutputSchema.parse(output)).not.toThrow();
  });

  it('should accept empty arrays', () => {
    const output = {
      triples: [],
      orphan_entities: [],
      ambiguities: [],
    };
    expect(() => IngestionOutputSchema.parse(output)).not.toThrow();
  });
});

describe('AnalystResponseSchema', () => {
  it('should validate complete analyst response', () => {
    const response = {
      analysis: 'DDG-51 Flight III uses AN/SPY-6 radar',
      key_findings: ['AN/SPY-6 integrated on Flight III'],
      evidence: [
        {
          source: 'graph' as const,
          content: 'AN/SPY-6 | part_of | DDG-51 Flight III',
          confidence: 0.90,
          relevance: 'Direct evidence',
        },
      ],
      unknowns: ['Specific installation timeline'],
      recommended_next_questions: ['Who develops AN/SPY-6?'],
      overall_confidence: 0.85,
      retrieval_strategy: '1-hop' as const,
    };
    expect(() => AnalystResponseSchema.parse(response)).not.toThrow();
  });

  it('should reject invalid retrieval strategy', () => {
    const response = {
      analysis: 'test',
      key_findings: [],
      evidence: [],
      unknowns: [],
      recommended_next_questions: [],
      overall_confidence: 0.8,
      retrieval_strategy: '3-hop',
    };
    expect(() => AnalystResponseSchema.parse(response)).toThrow();
  });
});

describe('ValidationReportSchema', () => {
  it('should validate complete validation report', () => {
    const report = {
      validation_results: {
        total_entities: 10,
        total_relations: 8,
        orphan_nodes: ['orphan-1'],
        schema_violations: ['Missing type on node X'],
        confidence_issues: [
          {
            triple: 'A -> B',
            issue: 'confidence below threshold',
          },
        ],
        duplicate_entities: ['duplicate-name'],
        missing_types: [],
      },
      recommendations: ['Remove orphan nodes', 'Fix confidence issues'],
    };
    expect(() => ValidationReportSchema.parse(report)).not.toThrow();
  });

  it('should reject negative entity count', () => {
    const report = {
      validation_results: {
        total_entities: -1,
        total_relations: 0,
        orphan_nodes: [],
        schema_violations: [],
        confidence_issues: [],
        duplicate_entities: [],
        missing_types: [],
      },
      recommendations: [],
    };
    expect(() => ValidationReportSchema.parse(report)).toThrow();
  });
});

describe('Type inference', () => {
  it('should infer EntityType from enum', () => {
    const entityTypes: Array<EntityType> = [
      'Program',
      'System',
      'Contractor',
    ];
    expect(entityTypes).toHaveLength(3);
  });

  it('should infer RelationType from enum', () => {
    const relationTypes: Array<RelationType> = [
      'part_of',
      'developed_by',
      'funded_by',
    ];
    expect(relationTypes).toHaveLength(3);
  });
});
