import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TripleExtractor } from '../src/extractor.js';
import type { IngestionOutput } from '@defense/schema';

describe('TripleExtractor', () => {
  let extractor: TripleExtractor;
  let mockClient: any;

  beforeEach(() => {
    // Mock Anthropic client
    mockClient = {
      messages: {
        create: vi.fn(),
      },
    };

    extractor = new TripleExtractor('fake-api-key');
    (extractor as any).client = mockClient;
  });

  it('should extract triples from defense text', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            triples: [
              {
                a: 'Raytheon Technologies',
                type_a: 'Contractor',
                relation: 'developed_by',
                b: 'AN/SPY-6',
                type_b: 'Subsystem',
                confidence: 0.95,
                source_text: 'Raytheon provides AN/SPY-6',
              },
            ],
            orphan_entities: [],
            ambiguities: [],
          }),
        },
      ],
    };

    mockClient.messages.create.mockResolvedValue(mockResponse);

    const result = await extractor.extractTriples(
      'Raytheon Technologies provides the AN/SPY-6 radar.'
    );

    expect(result.triples).toHaveLength(1);
    expect(result.triples[0].a).toBe('Raytheon Technologies');
    expect(result.triples[0].b).toBe('AN/SPY-6');
    expect(result.triples[0].relation).toBe('developed_by');
  });

  it('should normalize entity names in extracted triples', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            triples: [
              {
                a: 'RTX',
                type_a: 'Contractor',
                relation: 'developed_by',
                b: 'AN/SPY-6',
                type_b: 'Subsystem',
                confidence: 0.95,
                source_text: 'RTX provides AN/SPY-6',
              },
            ],
            orphan_entities: [],
            ambiguities: [],
          }),
        },
      ],
    };

    mockClient.messages.create.mockResolvedValue(mockResponse);

    const result = await extractor.extractTriples('RTX provides AN/SPY-6');

    // RTX should be normalized to Raytheon Technologies
    expect(result.triples[0].a).toBe('Raytheon Technologies');
  });

  it('should handle JSON wrapped in code blocks', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: '```json\n{"triples": [], "orphan_entities": [], "ambiguities": []}\n```',
        },
      ],
    };

    mockClient.messages.create.mockResolvedValue(mockResponse);

    const result = await extractor.extractTriples('Some text');

    expect(result.triples).toHaveLength(0);
  });

  it('should validate output against schema', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            triples: [
              {
                a: 'System A',
                type_a: 'System',
                relation: 'part_of',
                b: 'System B',
                type_b: 'System',
                confidence: 0.3, // Below 0.5 threshold
                source_text: 'test',
              },
            ],
            orphan_entities: [],
            ambiguities: [],
          }),
        },
      ],
    };

    mockClient.messages.create.mockResolvedValue(mockResponse);

    // Should throw due to low confidence
    await expect(
      extractor.extractTriples('Some text')
    ).rejects.toThrow();
  });

  it('should handle orphan entities and ambiguities', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            triples: [],
            orphan_entities: [
              {
                entity: 'Unknown Program',
                type: 'Program',
                reason: 'no relationships found',
              },
            ],
            ambiguities: [
              {
                text: 'GD',
                interpretations: ['Golden Dome', 'General Dynamics'],
                resolution: 'needs_clarification',
              },
            ],
          }),
        },
      ],
    };

    mockClient.messages.create.mockResolvedValue(mockResponse);

    const result = await extractor.extractTriples('Some ambiguous text');

    expect(result.orphan_entities).toHaveLength(1);
    expect(result.orphan_entities[0].entity).toBe('Unknown Program');
    expect(result.ambiguities).toHaveLength(1);
    expect(result.ambiguities[0].text).toBe('GD');
  });

  it('should throw error on invalid JSON', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: 'Not valid JSON',
        },
      ],
    };

    mockClient.messages.create.mockResolvedValue(mockResponse);

    await expect(
      extractor.extractTriples('Some text')
    ).rejects.toThrow('Failed to parse JSON');
  });
});
