import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { GraphStore } from '@defense/graph-store';
import { TripleExtractor } from '@defense/ingestion';
import { DefenseAnalyst } from '@defense/analyst';
import { validateGraph } from '@defense/validation';

// Skip these tests if no API key (they require real LLM calls)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const describeIfApiKey = ANTHROPIC_API_KEY ? describe : describe.skip;

describeIfApiKey('End-to-End Integration', () => {
  let graph: GraphStore;
  let extractor: TripleExtractor;
  let analyst: DefenseAnalyst;

  beforeAll(() => {
    graph = new GraphStore();
    extractor = new TripleExtractor(ANTHROPIC_API_KEY!);
    analyst = new DefenseAnalyst(ANTHROPIC_API_KEY!);
  });

  it('should ingest defense document and build knowledge graph', async () => {
    const samplePath = join(
      process.cwd(),
      'examples/defense-samples/raytheon-spy6.txt'
    );
    const text = readFileSync(samplePath, 'utf-8');

    const result = await extractor.extractTriples(text);

    expect(result.triples.length).toBeGreaterThan(0);

    // Add triples to graph
    result.triples.forEach((triple) => {
      graph.addNode(triple.a, triple.type_a);
      graph.addNode(triple.b, triple.type_b);
      graph.addEdge(triple.a, triple.b, triple.relation, triple.confidence);
    });

    expect(graph.getNodeCount()).toBeGreaterThan(0);
    expect(graph.getEdgeCount()).toBeGreaterThan(0);
  }, 30000);

  it('should answer questions using the knowledge graph', async () => {
    // Ensure graph has data (from previous test)
    if (graph.getNodeCount() === 0) {
      // Populate with minimal test data
      graph.addNode('AN/SPY-6', 'Subsystem');
      graph.addNode('DDG-51 Flight III', 'System');
      graph.addNode('Raytheon Technologies', 'Contractor');
      graph.addEdge('AN/SPY-6', 'DDG-51 Flight III', 'part_of', 0.90);
      graph.addEdge('AN/SPY-6', 'Raytheon Technologies', 'developed_by', 0.95);
    }

    const response = await analyst.answerQuestion(
      'What radar system is used on DDG-51 destroyers?',
      graph
    );

    expect(response.analysis).toBeTruthy();
    expect(response.overall_confidence).toBeGreaterThanOrEqual(0.5);
    expect(response.overall_confidence).toBeLessThanOrEqual(1.0);
  }, 30000);

  it('should validate the knowledge graph', () => {
    const report = validateGraph(graph);

    expect(report.validation_results.total_entities).toBeGreaterThan(0);
    expect(report.recommendations).toBeDefined();
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  it('should handle multiple document ingestion', async () => {
    const sample2Path = join(
      process.cwd(),
      'examples/defense-samples/golden-dome.txt'
    );
    const text = readFileSync(sample2Path, 'utf-8');

    const result = await extractor.extractTriples(text);

    result.triples.forEach((triple) => {
      graph.addNode(triple.a, triple.type_a);
      graph.addNode(triple.b, triple.type_b);
      graph.addEdge(triple.a, triple.b, triple.relation, triple.confidence);
    });

    const finalNodeCount = graph.getNodeCount();
    expect(finalNodeCount).toBeGreaterThan(0);

    // Should have accumulated entities from both documents
    const report = validateGraph(graph);
    expect(report.validation_results.total_entities).toBe(finalNodeCount);
  }, 30000);
});

describe('Integration (Mocked)', () => {
  it('should perform full pipeline with mock data', () => {
    const graph = new GraphStore();

    // Simulate ingestion
    graph.addNode('AN/SPY-6', 'Subsystem', { name: 'AN/SPY-6' });
    graph.addNode('DDG-51 Flight III', 'System', { name: 'DDG-51 Flight III' });
    graph.addNode('Raytheon Technologies', 'Contractor', {
      name: 'Raytheon Technologies',
    });
    graph.addNode('PEO Ships', 'PEO', { name: 'PEO Ships' });

    graph.addEdge('AN/SPY-6', 'DDG-51 Flight III', 'part_of', 0.90);
    graph.addEdge('AN/SPY-6', 'Raytheon Technologies', 'developed_by', 0.95);
    graph.addEdge('DDG-51 Flight III', 'PEO Ships', 'overseen_by', 0.90);

    // Validate
    const report = validateGraph(graph);
    expect(report.validation_results.total_entities).toBe(4);
    expect(report.validation_results.total_relations).toBe(3);
    expect(report.validation_results.orphan_nodes).toHaveLength(0);

    // Test traversal (simulating analyst retrieval)
    const subgraph = graph.traverse('AN/SPY-6', 2);
    expect(subgraph.nodes).toHaveLength(4); // All connected
    expect(subgraph.edges).toHaveLength(3);
  });

  it('should detect issues in graph with orphans', () => {
    const graph = new GraphStore();

    graph.addNode('connected-1', 'System');
    graph.addNode('connected-2', 'Subsystem');
    graph.addNode('orphan', 'Technology');

    graph.addEdge('connected-1', 'connected-2', 'part_of', 0.8);

    const report = validateGraph(graph);
    expect(report.validation_results.orphan_nodes).toContain('orphan');
    expect(report.recommendations.some((r) => r.includes('orphan'))).toBe(true);
  });
});
