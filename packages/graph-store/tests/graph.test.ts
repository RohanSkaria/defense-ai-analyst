import { describe, it, expect, beforeEach } from 'vitest';
import { GraphStore } from '../src/graph.js';
import type { EntityType, RelationType } from '@defense/schema';

describe('GraphStore', () => {
  let graph: GraphStore;

  beforeEach(() => {
    graph = new GraphStore();
  });

  describe('Node operations', () => {
    it('should add and retrieve a node', () => {
      graph.addNode('raytheon-1', 'Contractor', {
        name: 'Raytheon Technologies',
      });

      const node = graph.getNode('raytheon-1');
      expect(node).toBeDefined();
      expect(node?.type).toBe('Contractor');
      expect(node?.data.name).toBe('Raytheon Technologies');
    });

    it('should return undefined for non-existent node', () => {
      const node = graph.getNode('non-existent');
      expect(node).toBeUndefined();
    });

    it('should find nodes by type', () => {
      graph.addNode('raytheon-1', 'Contractor');
      graph.addNode('lockheed-1', 'Contractor');
      graph.addNode('spy6-1', 'Subsystem');

      const contractors = graph.findByType('Contractor');
      expect(contractors).toHaveLength(2);
      expect(contractors.map((n) => n.id)).toContain('raytheon-1');
      expect(contractors.map((n) => n.id)).toContain('lockheed-1');
    });

    it('should update existing node', () => {
      graph.addNode('test-1', 'System', { version: 1 });
      graph.addNode('test-1', 'System', { version: 2 });

      const node = graph.getNode('test-1');
      expect(node?.data.version).toBe(2);
    });
  });

  describe('Edge operations', () => {
    beforeEach(() => {
      graph.addNode('spy6', 'Subsystem');
      graph.addNode('ddg51', 'System');
      graph.addNode('raytheon', 'Contractor');
    });

    it('should add edge between nodes', () => {
      graph.addEdge('spy6', 'ddg51', 'part_of', 0.90);

      const edges = graph.getEdges('spy6');
      expect(edges).toHaveLength(1);
      expect(edges[0].relation).toBe('part_of');
      expect(edges[0].target).toBe('ddg51');
      expect(edges[0].confidence).toBe(0.90);
    });

    it('should reject edge with low confidence', () => {
      expect(() => {
        graph.addEdge('spy6', 'ddg51', 'part_of', 0.3);
      }).toThrow('Confidence must be between 0.5 and 1.0');
    });

    it('should reject edge with non-existent nodes', () => {
      expect(() => {
        graph.addEdge('non-existent', 'ddg51', 'part_of', 0.9);
      }).toThrow('Source node non-existent does not exist');

      expect(() => {
        graph.addEdge('spy6', 'non-existent', 'part_of', 0.9);
      }).toThrow('Target node non-existent does not exist');
    });

    it('should get all edges for a node', () => {
      graph.addEdge('spy6', 'ddg51', 'part_of', 0.90);
      graph.addEdge('spy6', 'raytheon', 'developed_by', 0.95);

      const edges = graph.getEdges('spy6');
      expect(edges).toHaveLength(2);
    });

    it('should get edges filtered by relation type', () => {
      graph.addEdge('spy6', 'ddg51', 'part_of', 0.90);
      graph.addEdge('spy6', 'raytheon', 'developed_by', 0.95);

      const partOfEdges = graph.getEdges('spy6', 'part_of');
      expect(partOfEdges).toHaveLength(1);
      expect(partOfEdges[0].relation).toBe('part_of');
    });
  });

  describe('Traversal', () => {
    beforeEach(() => {
      // Build test graph:
      // raytheon --develops--> spy6 --part_of--> ddg51 --overseen_by--> peo_ships
      graph.addNode('raytheon', 'Contractor');
      graph.addNode('spy6', 'Subsystem');
      graph.addNode('ddg51', 'System');
      graph.addNode('peo_ships', 'PEO');

      graph.addEdge('spy6', 'raytheon', 'developed_by', 0.95);
      graph.addEdge('spy6', 'ddg51', 'part_of', 0.90);
      graph.addEdge('ddg51', 'peo_ships', 'overseen_by', 0.90);
    });

    it('should perform direct (0-hop) traversal', () => {
      const result = graph.traverse('spy6', 0);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('spy6');
      expect(result.edges).toHaveLength(0);
    });

    it('should perform 1-hop traversal', () => {
      const result = graph.traverse('spy6', 1);

      expect(result.nodes).toHaveLength(3); // spy6, raytheon, ddg51
      expect(result.edges).toHaveLength(2);

      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain('spy6');
      expect(nodeIds).toContain('raytheon');
      expect(nodeIds).toContain('ddg51');
    });

    it('should perform 2-hop traversal', () => {
      const result = graph.traverse('spy6', 2);

      expect(result.nodes).toHaveLength(4); // spy6, raytheon, ddg51, peo_ships
      expect(result.edges).toHaveLength(3);

      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain('peo_ships');
    });

    it('should handle traversal from node with no edges', () => {
      graph.addNode('isolated', 'System');
      const result = graph.traverse('isolated', 2);

      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(0);
    });

    it('should handle non-existent start node', () => {
      expect(() => {
        graph.traverse('non-existent', 1);
      }).toThrow('Start node non-existent does not exist');
    });
  });

  describe('Orphan detection', () => {
    it('should detect orphan nodes', () => {
      graph.addNode('connected-1', 'System');
      graph.addNode('connected-2', 'Subsystem');
      graph.addNode('orphan-1', 'Technology');
      graph.addNode('orphan-2', 'Capability');

      graph.addEdge('connected-1', 'connected-2', 'part_of', 0.8);

      const orphans = graph.getOrphans();
      expect(orphans).toHaveLength(2);
      expect(orphans.map((n) => n.id)).toContain('orphan-1');
      expect(orphans.map((n) => n.id)).toContain('orphan-2');
    });

    it('should return empty array when no orphans', () => {
      graph.addNode('node-1', 'System');
      graph.addNode('node-2', 'Subsystem');
      graph.addEdge('node-1', 'node-2', 'part_of', 0.9);

      const orphans = graph.getOrphans();
      expect(orphans).toHaveLength(0);
    });
  });

  describe('Graph statistics', () => {
    it('should return correct node and edge counts', () => {
      expect(graph.getNodeCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);

      graph.addNode('node-1', 'System');
      graph.addNode('node-2', 'Subsystem');
      graph.addEdge('node-1', 'node-2', 'part_of', 0.9);

      expect(graph.getNodeCount()).toBe(2);
      expect(graph.getEdgeCount()).toBe(1);
    });

    it('should get all nodes', () => {
      graph.addNode('node-1', 'System');
      graph.addNode('node-2', 'Subsystem');

      const nodes = graph.getAllNodes();
      expect(nodes).toHaveLength(2);
    });
  });

  describe('Clear graph', () => {
    it('should clear all nodes and edges', () => {
      graph.addNode('node-1', 'System');
      graph.addNode('node-2', 'Subsystem');
      graph.addEdge('node-1', 'node-2', 'part_of', 0.9);

      graph.clear();

      expect(graph.getNodeCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
    });
  });
});
