import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { graphService } from "@/lib/graph-service";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, mode, filename } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response("ANTHROPIC_API_KEY not configured", { status: 500 });
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
      return new Response("Invalid message format", { status: 400 });
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
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
