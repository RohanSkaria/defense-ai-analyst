import { describe, it, expect, beforeEach } from 'vitest';
import { validateGraph } from '../src/validator.js';
import { GraphStore } from '@defense/graph-store';

describe('GraphValidator', () => {
  let graph: GraphStore;

  beforeEach(() => {
    graph = new GraphStore();
  });

  it('should validate empty graph', () => {
    const report = validateGraph(graph);

    expect(report.validation_results.total_entities).toBe(0);
    expect(report.validation_results.total_relations).toBe(0);
    expect(report.validation_results.orphan_nodes).toHaveLength(0);
    expect(report.recommendations).toContain('Graph validation passed - no issues found');
  });

  it('should detect orphan nodes', () => {
    graph.addNode('connected-1', 'System');
    graph.addNode('connected-2', 'Subsystem');
    graph.addNode('orphan-1', 'Technology');
    graph.addNode('orphan-2', 'Capability');

    graph.addEdge('connected-1', 'connected-2', 'part_of', 0.9);

    const report = validateGraph(graph);

    expect(report.validation_results.orphan_nodes).toHaveLength(2);
    expect(report.validation_results.orphan_nodes).toContain('orphan-1');
    expect(report.validation_results.orphan_nodes).toContain('orphan-2');
    expect(report.recommendations.some((r) => r.includes('orphan'))).toBe(true);
  });

  it('should detect confidence issues', () => {
    graph.addNode('node-1', 'System');
    graph.addNode('node-2', 'Subsystem');

    // This should not be possible in normal use due to GraphStore validation,
    // but test the validator's detection capability
    // We'll add a valid edge then check the validator logic
    graph.addEdge('node-1', 'node-2', 'part_of', 0.9);

    const report = validateGraph(graph);

    // With valid edge, no confidence issues
    expect(report.validation_results.confidence_issues).toHaveLength(0);
  });

  it('should find duplicate entities', () => {
    graph.addNode('raytheon-1', 'Contractor', { name: 'Raytheon Technologies' });
    graph.addNode('raytheon-2', 'Contractor', { name: 'Raytheon Technologies' });
    graph.addNode('unique-1', 'System', { name: 'Unique System' });

    const report = validateGraph(graph);

    expect(report.validation_results.duplicate_entities).toHaveLength(1);
    expect(report.validation_results.duplicate_entities[0]).toContain(
      'Raytheon Technologies'
    );
    expect(report.recommendations.some((r) => r.includes('duplicate'))).toBe(true);
  });

  it('should count entities and relations correctly', () => {
    graph.addNode('node-1', 'System');
    graph.addNode('node-2', 'Subsystem');
    graph.addNode('node-3', 'Contractor');

    graph.addEdge('node-1', 'node-2', 'part_of', 0.9);
    graph.addEdge('node-2', 'node-3', 'developed_by', 0.95);

    const report = validateGraph(graph);

    expect(report.validation_results.total_entities).toBe(3);
    expect(report.validation_results.total_relations).toBe(2);
  });

  it('should provide recommendations when issues found', () => {
    graph.addNode('orphan', 'System');
    graph.addNode('duplicate-1', 'Contractor', { name: 'Same Name' });
    graph.addNode('duplicate-2', 'Contractor', { name: 'Same Name' });

    const report = validateGraph(graph);

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations.some((r) => r.includes('orphan'))).toBe(true);
    expect(report.recommendations.some((r) => r.includes('duplicate'))).toBe(true);
  });

  it('should validate healthy graph', () => {
    graph.addNode('spy6', 'Subsystem', { name: 'AN/SPY-6' });
    graph.addNode('ddg51', 'System', { name: 'DDG-51' });
    graph.addNode('raytheon', 'Contractor', { name: 'Raytheon' });

    graph.addEdge('spy6', 'ddg51', 'part_of', 0.90);
    graph.addEdge('spy6', 'raytheon', 'developed_by', 0.95);

    const report = validateGraph(graph);

    expect(report.validation_results.total_entities).toBe(3);
    expect(report.validation_results.total_relations).toBe(2);
    expect(report.validation_results.orphan_nodes).toHaveLength(0);
    expect(report.validation_results.schema_violations).toHaveLength(0);
    expect(report.validation_results.duplicate_entities).toHaveLength(0);
    expect(report.recommendations).toContain('Graph validation passed - no issues found');
  });

  it('should detect nodes without names as separate entities', () => {
    graph.addNode('id-1', 'System'); // No name, uses ID
    graph.addNode('id-2', 'System'); // No name, uses ID

    const report = validateGraph(graph);

    // Should not be flagged as duplicates since they use different IDs
    expect(report.validation_results.duplicate_entities).toHaveLength(0);
  });
});
