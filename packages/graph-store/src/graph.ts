import Graph from 'graphology';
import type { EntityType, RelationType } from '@defense/schema';
import type { GraphNode, GraphEdge, TraversalResult } from './types.js';

/**
 * In-memory knowledge graph store using graphology
 */
export class GraphStore {
  private graph: Graph;

  constructor() {
    this.graph = new Graph();
  }

  /**
   * Add or update a node in the graph
   */
  addNode(id: string, type: EntityType, data: Record<string, any> = {}): void {
    if (this.graph.hasNode(id)) {
      this.graph.mergeNodeAttributes(id, { type, data });
    } else {
      this.graph.addNode(id, { type, data });
    }
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): GraphNode | undefined {
    if (!this.graph.hasNode(id)) {
      return undefined;
    }

    const attrs = this.graph.getNodeAttributes(id);
    return {
      id,
      type: attrs.type as EntityType,
      data: attrs.data || {},
    };
  }

  /**
   * Find all nodes of a specific type
   */
  findByType(type: EntityType): GraphNode[] {
    const nodes: GraphNode[] = [];

    this.graph.forEachNode((nodeId, attrs) => {
      if (attrs.type === type) {
        nodes.push({
          id: nodeId,
          type: attrs.type as EntityType,
          data: attrs.data || {},
        });
      }
    });

    return nodes;
  }

  /**
   * Add an edge between two nodes
   */
  addEdge(
    from: string,
    to: string,
    relation: RelationType,
    confidence: number
  ): void {
    if (confidence < 0.5 || confidence > 1.0) {
      throw new Error('Confidence must be between 0.5 and 1.0');
    }

    if (!this.graph.hasNode(from)) {
      throw new Error(`Source node ${from} does not exist`);
    }

    if (!this.graph.hasNode(to)) {
      throw new Error(`Target node ${to} does not exist`);
    }

    // Use directed edge with relation and confidence
    const edgeId = `${from}-${relation}-${to}`;
    if (this.graph.hasEdge(edgeId)) {
      this.graph.setEdgeAttribute(edgeId, 'confidence', confidence);
    } else {
      this.graph.addDirectedEdgeWithKey(edgeId, from, to, {
        relation,
        confidence,
      });
    }
  }

  /**
   * Get all edges from a node, optionally filtered by relation type
   */
  getEdges(nodeId: string, relationType?: RelationType): GraphEdge[] {
    if (!this.graph.hasNode(nodeId)) {
      return [];
    }

    const edges: GraphEdge[] = [];

    this.graph.forEachOutEdge(nodeId, (edgeId, attrs, source, target) => {
      if (!relationType || attrs.relation === relationType) {
        edges.push({
          source,
          target,
          relation: attrs.relation as RelationType,
          confidence: attrs.confidence as number,
        });
      }
    });

    return edges;
  }

  /**
   * Perform BFS traversal up to maxHops from startId
   */
  traverse(startId: string, maxHops: number): TraversalResult {
    if (!this.graph.hasNode(startId)) {
      throw new Error(`Start node ${startId} does not exist`);
    }

    const visitedNodes = new Set<string>();
    const visitedEdges = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [
      { nodeId: startId, depth: 0 },
    ];

    visitedNodes.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= maxHops) {
        continue;
      }

      // Traverse outgoing edges
      this.graph.forEachOutEdge(current.nodeId, (edgeId, attrs, source, target) => {
        visitedEdges.add(edgeId);

        if (!visitedNodes.has(target)) {
          visitedNodes.add(target);
          queue.push({ nodeId: target, depth: current.depth + 1 });
        }
      });

      // Traverse incoming edges (undirected traversal)
      this.graph.forEachInEdge(current.nodeId, (edgeId, attrs, source, target) => {
        visitedEdges.add(edgeId);

        if (!visitedNodes.has(source)) {
          visitedNodes.add(source);
          queue.push({ nodeId: source, depth: current.depth + 1 });
        }
      });
    }

    // Collect nodes
    const nodes: GraphNode[] = [];
    visitedNodes.forEach((nodeId) => {
      const node = this.getNode(nodeId);
      if (node) {
        nodes.push(node);
      }
    });

    // Collect edges
    const edges: GraphEdge[] = [];
    visitedEdges.forEach((edgeId) => {
      const attrs = this.graph.getEdgeAttributes(edgeId);
      const [source, target] = this.graph.extremities(edgeId);
      edges.push({
        source,
        target,
        relation: attrs.relation as RelationType,
        confidence: attrs.confidence as number,
      });
    });

    return { nodes, edges };
  }

  /**
   * Find all orphan nodes (nodes with no edges)
   */
  getOrphans(): GraphNode[] {
    const orphans: GraphNode[] = [];

    this.graph.forEachNode((nodeId, attrs) => {
      if (this.graph.degree(nodeId) === 0) {
        orphans.push({
          id: nodeId,
          type: attrs.type as EntityType,
          data: attrs.data || {},
        });
      }
    });

    return orphans;
  }

  /**
   * Get total node count
   */
  getNodeCount(): number {
    return this.graph.order;
  }

  /**
   * Get total edge count
   */
  getEdgeCount(): number {
    return this.graph.size;
  }

  /**
   * Get all nodes
   */
  getAllNodes(): GraphNode[] {
    const nodes: GraphNode[] = [];

    this.graph.forEachNode((nodeId, attrs) => {
      nodes.push({
        id: nodeId,
        type: attrs.type as EntityType,
        data: attrs.data || {},
      });
    });

    return nodes;
  }

  /**
   * Clear the entire graph
   */
  clear(): void {
    this.graph.clear();
  }
}
