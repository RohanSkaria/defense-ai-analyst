import Anthropic from '@anthropic-ai/sdk';
import { GraphStore, type TraversalResult } from '@defense/graph-store';
import { AnalystResponseSchema, type AnalystResponse } from '@defense/schema';

/**
 * Defense analyst query engine
 */
export class DefenseAnalyst {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-haiku-4-5') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  /**
   * Answer a defense research question using the knowledge graph
   */
  async answerQuestion(
    question: string,
    graph: GraphStore
  ): Promise<AnalystResponse> {
    // Step 1: Extract key entities from question
    const entities = await this.extractEntitiesFromQuestion(question, graph);

    // Step 2: Retrieve relevant subgraph (start with 1-hop, expand if needed)
    const subgraph = this.retrieveRelevantSubgraph(entities, graph);

    // Step 3: Generate analysis using LLM
    const response = await this.generateAnalysis(question, subgraph);

    return response;
  }

  /**
   * Extract entity names mentioned in the question
   */
  private async extractEntitiesFromQuestion(
    question: string,
    graph: GraphStore
  ): Promise<string[]> {
    const allNodes = graph.getAllNodes();
    const entityNames = allNodes.map((n) => n.id);

    // Simple keyword matching (case-insensitive)
    const lowerQuestion = question.toLowerCase();
    const foundEntities = entityNames.filter((name) =>
      lowerQuestion.includes(name.toLowerCase())
    );

    return foundEntities;
  }

  /**
   * Retrieve relevant subgraph starting from identified entities
   */
  private retrieveRelevantSubgraph(
    startEntities: string[],
    graph: GraphStore
  ): TraversalResult {
    if (startEntities.length === 0) {
      // No specific entities found, return empty result
      return { nodes: [], edges: [] };
    }

    // Traverse from each start entity (max 2-hop per CLAUDE.md)
    const allNodes = new Map<string, any>();
    const allEdges = new Map<string, any>();

    for (const entityId of startEntities) {
      try {
        const result = graph.traverse(entityId, 2);

        result.nodes.forEach((node) => allNodes.set(node.id, node));
        result.edges.forEach((edge) => {
          const edgeKey = `${edge.source}-${edge.relation}-${edge.target}`;
          allEdges.set(edgeKey, edge);
        });
      } catch (error) {
        // Entity might not exist in graph
        continue;
      }
    }

    return {
      nodes: Array.from(allNodes.values()),
      edges: Array.from(allEdges.values()),
    };
  }

  /**
   * Generate analysis using Claude with graph context
   */
  private async generateAnalysis(
    question: string,
    subgraph: TraversalResult
  ): Promise<AnalystResponse> {
    const prompt = this.buildAnalysisPrompt(question, subgraph);

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : content.text;

    let rawOutput: any;
    try {
      rawOutput = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`Failed to parse JSON from Claude response: ${error}`);
    }

    // Clamp confidence values to valid range [0.5, 1.0] to handle LLM variations
    if (rawOutput.overall_confidence !== undefined && rawOutput.overall_confidence < 0.5) {
      rawOutput.overall_confidence = 0.5;
    }
    if (rawOutput.evidence && Array.isArray(rawOutput.evidence)) {
      rawOutput.evidence = rawOutput.evidence.map((e: any) => ({
        ...e,
        confidence: e.confidence < 0.5 ? 0.5 : e.confidence,
      }));
    }

    return AnalystResponseSchema.parse(rawOutput);
  }

  /**
   * Build analysis prompt with graph context
   */
  private buildAnalysisPrompt(
    question: string,
    subgraph: TraversalResult
  ): string {
    // Format graph data for context
    const graphContext = this.formatGraphContext(subgraph);

    return `You are a Defense Intelligence Research Assistant.

Answer the following question using ONLY the knowledge graph data provided.

**QUESTION:**
${question}

**KNOWLEDGE GRAPH DATA:**
${graphContext}

**RULES:**
1. Use ONLY information from the graph above
2. Distinguish between direct evidence (from graph) and inference
3. Mark unknowns explicitly if information is missing
4. Provide confidence scores (0.5-1.0)
5. Suggest logical follow-up questions

**OUTPUT FORMAT (strict JSON):**
\`\`\`json
{
  "analysis": "Full analytical response with clear reasoning",
  "key_findings": [
    "Primary finding with evidence",
    "Secondary finding"
  ],
  "evidence": [
    {
      "source": "graph",
      "content": "Specific triple or fact",
      "confidence": 0.90,
      "relevance": "Why this matters"
    }
  ],
  "unknowns": [
    "Critical missing information",
    "Data gaps"
  ],
  "recommended_next_questions": [
    "Logical follow-up question 1",
    "Exploratory question 2"
  ],
  "overall_confidence": 0.85,
  "retrieval_strategy": "1-hop" | "2-hop" | "direct"
}
\`\`\`

Analyze now:`;
  }

  /**
   * Format subgraph as readable context
   */
  private formatGraphContext(subgraph: TraversalResult): string {
    if (subgraph.nodes.length === 0) {
      return 'No relevant entities found in knowledge graph.';
    }

    let context = '**Entities:**\n';
    subgraph.nodes.forEach((node) => {
      context += `- ${node.id} (${node.type})\n`;
    });

    context += '\n**Relationships:**\n';
    if (subgraph.edges.length === 0) {
      context += '- No relationships found\n';
    } else {
      subgraph.edges.forEach((edge) => {
        context += `- ${edge.source} --[${edge.relation}, confidence: ${edge.confidence}]--> ${edge.target}\n`;
      });
    }

    return context;
  }
}
