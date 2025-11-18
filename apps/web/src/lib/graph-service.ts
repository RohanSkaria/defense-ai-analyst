import { PostgresGraphStore, initializeDatabase } from "@defense/graph-store";
import { TripleExtractor } from "@defense/ingestion";
import { DefenseAnalyst } from "@defense/analyst";
import { validateGraph } from "@defense/validation";
import type { IngestionOutput, AnalystResponse, ValidationReport } from "@defense/schema";

/**
 * Singleton service for managing the knowledge graph
 * Backed by Neon Postgres database
 */
class GraphService {
  private static instance: GraphService;
  private graph: PostgresGraphStore;
  private extractor: TripleExtractor | null = null;
  private analyst: DefenseAnalyst | null = null;
  private initialized: boolean = false;

  private constructor() {
    // Initialize database connection
    if (process.env.DATABASE_URL) {
      initializeDatabase(process.env.DATABASE_URL);
      this.graph = new PostgresGraphStore();
      this.initialized = true;
    } else {
      throw new Error('DATABASE_URL environment variable is required');
    }
  }

  static getInstance(): GraphService {
    if (!GraphService.instance) {
      GraphService.instance = new GraphService();
    }
    return GraphService.instance;
  }

  getGraph(): PostgresGraphStore {
    return this.graph;
  }

  initializeExtractor(apiKey: string): void {
    if (!this.extractor) {
      this.extractor = new TripleExtractor(apiKey);
    }
  }

  initializeAnalyst(apiKey: string): void {
    if (!this.analyst) {
      this.analyst = new DefenseAnalyst(apiKey);
    }
  }

  async ingestText(text: string, apiKey: string, filename: string = 'Untitled'): Promise<IngestionOutput> {
    this.initializeExtractor(apiKey);

    if (!this.extractor) {
      throw new Error("Extractor not initialized");
    }

    const result = await this.extractor.extractTriples(text);

    // Store document
    const documentId = await this.graph.storeDocument(filename, text, result.triples.length);

    // Add triples to graph
    for (const triple of result.triples) {
      await this.graph.addNode(triple.a, triple.type_a, { name: triple.a });
      await this.graph.addNode(triple.b, triple.type_b, { name: triple.b });
      await this.graph.addEdge(
        triple.a,
        triple.b,
        triple.relation,
        triple.confidence,
        documentId,
        triple.source_text
      );
    }

    return result;
  }

  async answerQuestion(question: string, apiKey: string): Promise<AnalystResponse> {
    this.initializeAnalyst(apiKey);

    if (!this.analyst) {
      throw new Error("Analyst not initialized");
    }

    return await this.analyst.answerQuestion(question, this.graph as any);
  }

  async validate(): Promise<ValidationReport> {
    return validateGraph(this.graph as any);
  }

  async getStats() {
    return {
      totalEntities: await this.graph.getNodeCount(),
      totalRelations: await this.graph.getEdgeCount(),
      orphanCount: (await this.graph.getOrphans()).length,
    };
  }

  async getAllDocuments() {
    return await this.graph.getAllDocuments();
  }

  async clearGraph(): Promise<void> {
    await this.graph.clear();
  }
}

export const graphService = GraphService.getInstance();
