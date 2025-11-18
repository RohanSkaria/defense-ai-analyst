import { eq, and, sql } from 'drizzle-orm';
import type { EntityType, RelationType } from '@defense/schema';
import type { GraphNode, GraphEdge, TraversalResult } from './types.js';
import { getDatabase } from './db.js';
import { entities, relationships, documents } from './schema.js';

/**
 * Postgres-backed knowledge graph store
 */
export class PostgresGraphStore {
  private db;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Normalize entity names for deduplication
   */
  private normalizeEntityName(name: string): string {
    return name.trim().toLowerCase();
  }

  /**
   * Add or update a node in the graph
   */
  async addNode(id: string, type: EntityType, data: Record<string, any> = {}): Promise<void> {
    await this.db.insert(entities)
      .values({
        id,
        type,
        data,
      })
      .onConflictDoUpdate({
        target: entities.id,
        set: {
          type,
          data,
        },
      });
  }

  /**
   * Get a node by ID
   */
  async getNode(id: string): Promise<GraphNode | undefined> {
    const result = await this.db.select()
      .from(entities)
      .where(eq(entities.id, id))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return {
      id: result[0].id,
      type: result[0].type as EntityType,
      data: result[0].data as Record<string, any>,
    };
  }

  /**
   * Find all nodes of a specific type
   */
  async findByType(type: EntityType): Promise<GraphNode[]> {
    const result = await this.db.select()
      .from(entities)
      .where(eq(entities.type, type));

    return result.map(row => ({
      id: row.id,
      type: row.type as EntityType,
      data: row.data as Record<string, any>,
    }));
  }

  /**
   * Add an edge between two nodes
   */
  async addEdge(
    from: string,
    to: string,
    relation: RelationType,
    confidence: number,
    sourceDocumentId?: number,
    sourceText?: string
  ): Promise<void> {
    if (confidence < 0.5 || confidence > 1.0) {
      throw new Error('Confidence must be between 0.5 and 1.0');
    }

    // Check if relationship already exists
    const existing = await this.db.select()
      .from(relationships)
      .where(
        and(
          eq(relationships.sourceEntity, from),
          eq(relationships.targetEntity, to),
          eq(relationships.relation, relation)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update confidence if new confidence is higher
      if (confidence > existing[0].confidence) {
        await this.db.update(relationships)
          .set({ confidence, sourceText })
          .where(eq(relationships.id, existing[0].id));
      }
    } else {
      await this.db.insert(relationships).values({
        sourceEntity: from,
        targetEntity: to,
        relation,
        confidence,
        sourceDocumentId,
        sourceText,
      });
    }
  }

  /**
   * Get all edges from a node, optionally filtered by relation type
   */
  async getEdges(nodeId: string, relationType?: RelationType): Promise<GraphEdge[]> {
    const conditions = relationType
      ? and(eq(relationships.sourceEntity, nodeId), eq(relationships.relation, relationType))
      : eq(relationships.sourceEntity, nodeId);

    const result = await this.db.select()
      .from(relationships)
      .where(conditions);

    return result.map((row: any) => ({
      source: row.sourceEntity,
      target: row.targetEntity,
      relation: row.relation as RelationType,
      confidence: row.confidence,
    }));
  }

  /**
   * Perform BFS traversal up to maxHops from startId
   */
  async traverse(startId: string, maxHops: number): Promise<TraversalResult> {
    const visitedNodes = new Set<string>([startId]);
    const visitedEdges = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= maxHops) {
        continue;
      }

      // Get outgoing edges
      const outgoing = await this.db.select()
        .from(relationships)
        .where(eq(relationships.sourceEntity, current.nodeId));

      for (const edge of outgoing) {
        const edgeId = `${edge.sourceEntity}-${edge.relation}-${edge.targetEntity}`;
        visitedEdges.add(edgeId);

        if (!visitedNodes.has(edge.targetEntity)) {
          visitedNodes.add(edge.targetEntity);
          queue.push({ nodeId: edge.targetEntity, depth: current.depth + 1 });
        }
      }

      // Get incoming edges
      const incoming = await this.db.select()
        .from(relationships)
        .where(eq(relationships.targetEntity, current.nodeId));

      for (const edge of incoming) {
        const edgeId = `${edge.sourceEntity}-${edge.relation}-${edge.targetEntity}`;
        visitedEdges.add(edgeId);

        if (!visitedNodes.has(edge.sourceEntity)) {
          visitedNodes.add(edge.sourceEntity);
          queue.push({ nodeId: edge.sourceEntity, depth: current.depth + 1 });
        }
      }
    }

    // Collect nodes
    const nodes: GraphNode[] = [];
    for (const nodeId of visitedNodes) {
      const node = await this.getNode(nodeId);
      if (node) {
        nodes.push(node);
      }
    }

    // Collect edges
    const edges: GraphEdge[] = [];
    for (const edgeId of visitedEdges) {
      const [source, relation, target] = edgeId.split('-');
      const result = await this.db.select()
        .from(relationships)
        .where(
          and(
            eq(relationships.sourceEntity, source),
            eq(relationships.relation, relation),
            eq(relationships.targetEntity, target)
          )
        )
        .limit(1);

      if (result.length > 0) {
        edges.push({
          source: result[0].sourceEntity,
          target: result[0].targetEntity,
          relation: result[0].relation as RelationType,
          confidence: result[0].confidence,
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Find all orphan nodes (nodes with no edges)
   */
  async getOrphans(): Promise<GraphNode[]> {
    const result = await this.db.select()
      .from(entities)
      .leftJoin(relationships, eq(entities.id, relationships.sourceEntity))
      .where(sql`${relationships.id} IS NULL`) as any[];

    return result.map((row: any) => ({
      id: row.entities.id,
      type: row.entities.type as EntityType,
      data: row.entities.data as Record<string, any>,
    }));
  }

  /**
   * Get total node count
   */
  async getNodeCount(): Promise<number> {
    const result = await this.db.select({ count: sql<number>`count(*)` })
      .from(entities);
    return Number(result[0].count);
  }

  /**
   * Get total edge count
   */
  async getEdgeCount(): Promise<number> {
    const result = await this.db.select({ count: sql<number>`count(*)` })
      .from(relationships);
    return Number(result[0].count);
  }

  /**
   * Get all nodes
   */
  async getAllNodes(): Promise<GraphNode[]> {
    const result = await this.db.select().from(entities);

    return result.map(row => ({
      id: row.id,
      type: row.type as EntityType,
      data: row.data as Record<string, any>,
    }));
  }

  /**
   * Get all edges
   */
  async getAllEdges(): Promise<GraphEdge[]> {
    const result = await this.db.select().from(relationships);

    return result.map(row => ({
      source: row.sourceEntity,
      target: row.targetEntity,
      relation: row.relation as RelationType,
      confidence: row.confidence,
    }));
  }

  /**
   * Clear the entire graph
   */
  async clear(): Promise<void> {
    await this.db.delete(relationships);
    await this.db.delete(entities);
    await this.db.delete(documents);
  }

  /**
   * Store a document record
   */
  async storeDocument(filename: string, content: string, tripleCount: number): Promise<number> {
    const result = await this.db.insert(documents)
      .values({
        filename,
        content,
        tripleCount,
      })
      .returning({ id: documents.id });

    return result[0].id;
  }

  /**
   * Get all documents
   */
  async getAllDocuments() {
    return await this.db.select().from(documents).orderBy(sql`${documents.uploadedAt} DESC`);
  }

  /**
   * Delete a document by ID
   * Cascades to delete all relationships from this document, then cleans up orphaned entities
   */
  async deleteDocument(id: number): Promise<void> {
    // First, get all entities that are referenced by relationships from this document
    const affectedRelationships = await this.db.select({
      sourceEntity: relationships.sourceEntity,
      targetEntity: relationships.targetEntity,
    })
      .from(relationships)
      .where(eq(relationships.sourceDocumentId, id));

    const affectedEntityIds = new Set<string>();
    affectedRelationships.forEach(rel => {
      affectedEntityIds.add(rel.sourceEntity);
      affectedEntityIds.add(rel.targetEntity);
    });

    // Delete the document (cascade will delete relationships automatically)
    await this.db.delete(documents).where(eq(documents.id, id));

    // Now clean up orphaned entities (entities with no remaining relationships)
    for (const entityId of affectedEntityIds) {
      const remainingRelations = await this.db.select({ count: sql<number>`count(*)` })
        .from(relationships)
        .where(
          sql`${relationships.sourceEntity} = ${entityId} OR ${relationships.targetEntity} = ${entityId}`
        );

      const count = Number(remainingRelations[0].count);
      if (count === 0) {
        // This entity has no more relationships, delete it
        await this.db.delete(entities).where(eq(entities.id, entityId));
      }
    }
  }
}
