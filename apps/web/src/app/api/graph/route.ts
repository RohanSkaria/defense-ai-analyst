import { graphService } from "@/lib/graph-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const graph = graphService.getGraph();
    const allNodes = await graph.getAllNodes();
    const allEdges = await graph.getAllEdges();
    const stats = await graphService.getStats();

    // Convert to React Flow format
    const nodes = allNodes.map((node) => ({
      id: node.id,
      type: "default",
      data: {
        label: node.id,
        entityType: node.type,
        ...node.data,
      },
      position: { x: 0, y: 0 }, // Will be calculated by layout algorithm
    }));

    const edges = allEdges.map((edge) => ({
      id: `${edge.source}-${edge.relation}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.relation,
      data: {
        confidence: edge.confidence,
        relation: edge.relation,
      },
    }));

    return NextResponse.json({
      nodes,
      edges,
      stats,
    });
  } catch (error) {
    console.error("Graph API error:", error);

    const isDevMode = process.env.NODE_ENV === "development";
    const errorMessage = isDevMode && error instanceof Error
      ? error.message
      : "Failed to retrieve graph data";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
