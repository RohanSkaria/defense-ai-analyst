import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { graphService } from "@/lib/graph-service";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, mode, filename } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing messages array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const anthropic = createAnthropic({ apiKey });
    const lastMessage = messages[messages.length - 1];

    // Handle AI SDK v5 message format (parts array) or legacy format (content string)
    let userInput: string;
    if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
      // AI SDK v5 format
      userInput = lastMessage.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("");
    } else if (typeof lastMessage.content === "string") {
      // Legacy format
      userInput = lastMessage.content;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid message format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate input size (10MB limit as configured in next.config.ts)
    const maxInputSize = 10 * 1024 * 1024; // 10MB
    if (userInput.length > maxInputSize) {
      return new Response(
        JSON.stringify({ error: "Input text exceeds maximum size of 10MB" }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate mode if provided
    if (mode && !["ingest", "analyze", "validate"].includes(mode)) {
      return new Response(
        JSON.stringify({ error: "Invalid mode. Must be 'ingest', 'analyze', or 'validate'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle different modes
    if (mode === "ingest") {
      // Ingestion mode: extract triples
      const result = await graphService.ingestText(userInput, apiKey, filename || "Untitled");

      return new Response(
        JSON.stringify({
          type: "ingestion",
          data: result,
          message: `Extracted ${result.triples.length} triples, ${result.orphan_entities.length} orphans, ${result.ambiguities.length} ambiguities`,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (mode === "analyze") {
      // Analyst mode: answer questions
      const result = await graphService.answerQuestion(userInput, apiKey);

      return new Response(
        JSON.stringify({
          type: "analysis",
          data: result,
          message: result.analysis,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (mode === "validate") {
      // Validation mode: check graph
      const result = await graphService.validate();

      return new Response(
        JSON.stringify({
          type: "validation",
          data: result,
          message: `Graph has ${result.validation_results.total_entities} entities, ${result.validation_results.total_relations} relations. Found ${result.validation_results.orphan_nodes.length} orphans, ${result.validation_results.schema_violations.length} violations.`,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Default: chat mode with streaming
    const response = await streamText({
      model: anthropic("claude-haiku-4-5") as any,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.parts
          ? m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("")
          : m.content || "",
      })),
      system: `You are a defense intelligence AI assistant. You help analyze defense programs, contractors, and systems. Be concise and factual.`,
    });

    return response.toTextStreamResponse();
  } catch (error) {
    // Log detailed error server-side only
    console.error("Chat API error:", error);

    // Return generic error message to client (don't expose internal details)
    const isDevMode = process.env.NODE_ENV === "development";
    const errorMessage = isDevMode && error instanceof Error
      ? error.message  // Show details in development
      : "An error occurred processing your request"; // Generic in production

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
