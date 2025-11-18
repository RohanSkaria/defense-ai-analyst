import Anthropic from '@anthropic-ai/sdk';
import { IngestionOutputSchema, type IngestionOutput } from '@defense/schema';
import { normalizeEntity } from './normalizer.js';
import { chunkDocument, mergeChunkResults } from './chunker.js';

/**
 * LLM-based entity and relation extractor
 */
export class TripleExtractor {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-haiku-4-5') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  /**
   * Extract triples from defense text using Claude
   * Automatically chunks large documents to avoid LLM output degradation
   */
  async extractTriples(text: string): Promise<IngestionOutput> {
    // Check if document is large enough to warrant chunking
    const CHUNK_THRESHOLD = 2500; // chars

    if (text.length > CHUNK_THRESHOLD) {
      return this.extractTriplesChunked(text);
    }

    return this.extractTriplesFromChunk(text);
  }

  /**
   * Process large documents by chunking
   */
  private async extractTriplesChunked(text: string): Promise<IngestionOutput> {
    const { chunks, metadata } = chunkDocument(text, 2500, 200);

    const chunkResults: IngestionOutput[] = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      try {
        const result = await this.extractTriplesFromChunk(chunks[i]);
        chunkResults.push(result);
      } catch (error) {
        // Continue with other chunks even if one fails
        // Error will be logged in API route
      }
    }

    // Merge all results
    const mergedTriples = mergeChunkResults(chunkResults);

    // Combine orphans and ambiguities
    const allOrphans = chunkResults.flatMap(r => r.orphan_entities);
    const allAmbiguities = chunkResults.flatMap(r => r.ambiguities);

    return {
      triples: mergedTriples,
      orphan_entities: allOrphans,
      ambiguities: allAmbiguities,
    };
  }

  /**
   * Extract triples from a single chunk of text
   */
  private async extractTriplesFromChunk(text: string): Promise<IngestionOutput> {
    const prompt = this.buildExtractionPrompt(text);

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

    // Try to extract JSON from markdown code blocks with multiple patterns
    let jsonText = content.text;
    const patterns = [
      /```json\s*\n([\s\S]*?)\n```/,  // ```json\n...\n```
      /```\s*\n([\s\S]*?)\n```/,       // ```\n...\n```
      /\{[\s\S]*\}/                     // Raw JSON object
    ];

    for (const pattern of patterns) {
      const match = content.text.match(pattern);
      if (match) {
        jsonText = pattern.source.includes('```') ? match[1] : match[0];
        break;
      }
    }

    let rawOutput: any;
    try {
      rawOutput = JSON.parse(jsonText.trim());
    } catch (error) {
      throw new Error(`Failed to parse JSON from Claude response: ${error}\n\nResponse text: ${content.text.substring(0, 200)}...`);
    }

    // Normalize entity names in triples
    if (rawOutput.triples) {
      rawOutput.triples = rawOutput.triples.map((triple: any) => ({
        ...triple,
        a: normalizeEntity(triple.a),
        b: normalizeEntity(triple.b),
      }));
    }

    // Validate against schema
    return IngestionOutputSchema.parse(rawOutput);
  }

  /**
   * Build extraction prompt following CLAUDE.md spec
   */
  private buildExtractionPrompt(text: string): string {
    return `You are a Defense Knowledge Graph extraction agent.

Extract entities and relationships from the following defense text.

**RULES:**
1. Extract entities ONLY if explicitly named
2. Use these entity types: Program, System, Subsystem, Technology, Capability, Contractor, GovernmentOffice, PEO, Requirement, Standard, Milestone, TestEvent, FundingLine, Risk, Location, Classification, Timeline
3. Use these relation types: part_of, overseen_by, developed_by, funded_by, depends_on, interfaces_with, enables, mitigates, located_at, has_requirement, tested_by, certified_for, supersedes
4. Confidence levels:
   - 0.90-1.00: Explicitly stated
   - 0.70-0.89: Strong implication
   - 0.50-0.69: Reasonable inference
   - NEVER use confidence < 0.50
5. Include source_text excerpt for each triple

**INPUT TEXT:**
${text}

**OUTPUT FORMAT (strict JSON):**
\`\`\`json
{
  "triples": [
    {
      "a": "entity_A_name",
      "type_a": "EntityType",
      "relation": "relation_type",
      "b": "entity_B_name",
      "type_b": "EntityType",
      "confidence": 0.90,
      "source_text": "relevant excerpt"
    }
  ],
  "orphan_entities": [
    {
      "entity": "name",
      "type": "EntityType",
      "reason": "no relationships found"
    }
  ],
  "ambiguities": [
    {
      "text": "ambiguous phrase",
      "interpretations": ["option1", "option2"],
      "resolution": "created_both" | "needs_clarification"
    }
  ]
}
\`\`\`

Extract now:`;
  }
}
