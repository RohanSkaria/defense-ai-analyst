/**
 * Document chunking utility for processing large defense documents
 * Splits documents into manageable chunks to avoid LLM output degradation
 */

export interface ChunkResult {
  chunks: string[];
  metadata: {
    totalChunks: number;
    avgChunkSize: number;
    maxChunkSize: number;
  };
}

/**
 * Intelligently chunk a document based on paragraph boundaries
 * Preserves context by keeping related paragraphs together
 *
 * @param text - Full document text to chunk
 * @param maxCharsPerChunk - Maximum characters per chunk (default: 3000)
 * @param overlapChars - Characters to overlap between chunks for context (default: 200)
 */
export function chunkDocument(
  text: string,
  maxCharsPerChunk: number = 3000,
  overlapChars: number = 200
): ChunkResult {
  // Split on double newlines (paragraph breaks) while preserving headers
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  const chunks: string[] = [];
  let currentChunk = "";
  let previousChunk = "";

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();

    // Check if adding this paragraph would exceed limit
    const wouldExceed = currentChunk.length + paragraph.length + 2 > maxCharsPerChunk;

    if (wouldExceed && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap from previous for context continuity
      if (overlapChars > 0 && currentChunk.length > overlapChars) {
        const overlapText = currentChunk.slice(-overlapChars);
        previousChunk = overlapText;
        currentChunk = overlapText + "\n\n" + paragraph;
      } else {
        previousChunk = currentChunk;
        currentChunk = paragraph;
      }
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += "\n\n" + paragraph;
      } else {
        currentChunk = paragraph;
      }
    }
  }

  // Add final chunk if not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Calculate metadata
  const chunkSizes = chunks.map(c => c.length);
  const metadata = {
    totalChunks: chunks.length,
    avgChunkSize: Math.round(chunkSizes.reduce((a, b) => a + b, 0) / chunks.length),
    maxChunkSize: Math.max(...chunkSizes),
  };

  return { chunks, metadata };
}

/**
 * Smart chunk merging that handles overlapping entities
 * Deduplicates entities while preserving all unique relationships
 */
export function mergeChunkResults<T extends { a: string; b: string }>(
  chunkResults: Array<{ triples: T[] }>
): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const result of chunkResults) {
    for (const triple of result.triples) {
      // Create unique key for deduplication
      const key = `${normalizeEntity(triple.a)}|${normalizeEntity(triple.b)}`;

      if (!seen.has(key)) {
        seen.add(key);
        merged.push(triple);
      }
    }
  }

  return merged;
}

/**
 * Normalize entity names for deduplication
 * Handles common variations like "F-35A" vs "F35A" vs "F-35 A"
 */
function normalizeEntity(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')   // normalize whitespace
    .replace(/-/g, '')       // remove hyphens
    .replace(/\//g, '')      // remove slashes
    .trim();
}
