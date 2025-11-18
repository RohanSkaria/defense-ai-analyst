import type { EntityType, RelationType } from '@defense/schema';

/**
 * Graph node representing a defense entity
 */
export interface GraphNode {
  id: string;
  type: EntityType;
  data: Record<string, any>;
}

/**
 * Graph edge representing a relationship
 */
export interface GraphEdge {
  source: string;
  target: string;
  relation: RelationType;
  confidence: number;
}

/**
 * Traversal result containing subgraph
 */
export interface TraversalResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
