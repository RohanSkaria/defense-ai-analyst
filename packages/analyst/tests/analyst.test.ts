import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefenseAnalyst } from '../src/query.js';
import { GraphStore } from '@defense/graph-store';

describe('DefenseAnalyst', () => {
  let analyst: DefenseAnalyst;
  let graph: GraphStore;
  let mockClient: any;

  beforeEach(() => {
    // Setup test graph
    graph = new GraphStore();
    graph.addNode('AN/SPY-6', 'Subsystem', { name: 'AN/SPY-6' });
    graph.addNode('DDG-51 Flight III', 'System', { name: 'DDG-51 Flight III' });
    graph.addNode('Raytheon Technologies', 'Contractor', {
      name: 'Raytheon Technologies',
    });
    graph.addNode('PEO Ships', 'PEO', { name: 'PEO Ships' });

    graph.addEdge('AN/SPY-6', 'DDG-51 Flight III', 'part_of', 0.90);
    graph.addEdge('AN/SPY-6', 'Raytheon Technologies', 'developed_by', 0.95);
    graph.addEdge('DDG-51 Flight III', 'PEO Ships', 'overseen_by', 0.90);

    // Mock Anthropic client
    mockClient = {
      messages: {
        create: vi.fn(),
      },
    };

    analyst = new DefenseAnalyst('fake-api-key');
    (analyst as any).client = mockClient;
  });

  it('should answer question about radar systems', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            analysis:
              'DDG-51 Flight III destroyers use the AN/SPY-6 radar system.',
            key_findings: [
              'AN/SPY-6 radar is integrated on DDG-51 Flight III',
            ],
            evidence: [
              {
                source: 'graph',
                content: 'AN/SPY-6 --[part_of]--> DDG-51 Flight III',
                confidence: 0.90,
                relevance: 'Direct evidence of radar integration',
              },
            ],
            unknowns: [],
            recommended_next_questions: ['Who develops the AN/SPY-6 radar?'],
            overall_confidence: 0.90,
            retrieval_strategy: '1-hop',
          }),
        },
      ],
    };

    mockClient.messages.create.mockResolvedValue(mockResponse);

    const result = await analyst.answerQuestion(
      'What radar is used on DDG-51 Flight III?',
      graph
    );

    expect(result.analysis).toContain('AN/SPY-6');
    expect(result.key_findings).toHaveLength(1);
    expect(result.evidence).toHaveLength(1);
    expect(result.overall_confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('should identify entities in question', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            analysis: 'Raytheon Technologies develops the AN/SPY-6 radar.',
            key_findings: ['Raytheon is the prime contractor'],
            evidence: [
              {
                source: 'graph',
                content: 'AN/SPY-6 --[developed_by]--> Raytheon Technologies',
                confidence: 0.95,
                relevance: 'Direct evidence',
              },
            ],
            unknowns: [],
            recommended_next_questions: [
              'What other systems does Raytheon develop?',
            ],
            overall_confidence: 0.95,
            retrieval_strategy: '1-hop',
          }),
        },
      ],
    };

    mockClient.messages.create.mockResolvedValue(mockResponse);

    const result = await analyst.answerQuestion(
      'Who develops the AN/SPY-6?',
      graph
    );

    expect(result.analysis).toContain('Raytheon');
    expect(result.overall_confidence).toBe(0.95);
  });

  it('should handle unknown entities gracefully', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            analysis: 'No information found in knowledge graph.',
            key_findings: [],
            evidence: [],
            unknowns: ['No data on Unknown System in graph'],
            recommended_next_questions: ['Add information about Unknown System'],
            overall_confidence: 0.5,
            retrieval_strategy: 'direct',
          }),
        },
      ],
    };

    mockClient.messages.create.mockResolvedValue(mockResponse);

    const result = await analyst.answerQuestion(
      'What is Unknown System?',
      graph
    );

    expect(result.unknowns).toHaveLength(1);
    expect(result.overall_confidence).toBe(0.5);
  });

  it('should perform multi-hop traversal', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            analysis: 'PEO Ships oversees DDG-51 Flight III program.',
            key_findings: [
              'PEO Ships is the oversight office',
              'AN/SPY-6 is part of DDG-51 Flight III',
            ],
            evidence: [
              {
                source: 'graph',
                content: 'DDG-51 Flight III --[overseen_by]--> PEO Ships',
                confidence: 0.90,
                relevance: '1-hop traversal',
              },
              {
                source: 'graph',
                content: 'AN/SPY-6 --[part_of]--> DDG-51 Flight III',
                confidence: 0.90,
                relevance: '2-hop traversal from AN/SPY-6',
              },
            ],
            unknowns: [],
            recommended_next_questions: ['What other programs does PEO Ships oversee?'],
            overall_confidence: 0.90,
            retrieval_strategy: '2-hop',
          }),
        },
      ],
    };

    mockClient.messages.create.mockResolvedValue(mockResponse);

    const result = await analyst.answerQuestion(
      'Who oversees the AN/SPY-6 program?',
      graph
    );

    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.retrieval_strategy).toBe('2-hop');
  });

  it('should validate response against schema', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            analysis: 'Test',
            key_findings: [],
            evidence: [],
            unknowns: [],
            recommended_next_questions: [],
            overall_confidence: 0.3, // Below 0.5 threshold
            retrieval_strategy: 'direct',
          }),
        },
      ],
    };

    mockClient.messages.create.mockResolvedValue(mockResponse);

    // Should throw due to low confidence
    await expect(
      analyst.answerQuestion('Test question', graph)
    ).rejects.toThrow();
  });
});
