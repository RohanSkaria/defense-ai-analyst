import { graphService } from "@/lib/graph-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const graph = graphService.getGraph();
    const allNodes = await graph.getAllNodes();
    const allEdges = await graph.getAllEdges();

    // Count connections per entity
    const connectionCounts = new Map<string, number>();
    allEdges.forEach(edge => {
      connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
      connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
    });

    // Top programs by connections
    const programs = allNodes
      .filter(n => n.type === "Program")
      .map(n => ({
        name: n.id,
        connections: connectionCounts.get(n.id) || 0,
      }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 10);

    // Top contractors by number of systems they work on
    const contractorSystems = new Map<string, Set<string>>();
    allEdges.forEach(edge => {
      if (edge.relation === "developed_by") {
        if (!contractorSystems.has(edge.target)) {
          contractorSystems.set(edge.target, new Set());
        }
        contractorSystems.get(edge.target)!.add(edge.source);
      }
    });

    const contractors = Array.from(contractorSystems.entries())
      .map(([contractor, systems]) => ({
        name: contractor,
        systemCount: systems.size,
        systems: Array.from(systems).slice(0, 5),
      }))
      .sort((a, b) => b.systemCount - a.systemCount)
      .slice(0, 10);

    // System hierarchies (Program -> System -> Subsystem)
    const hierarchies: any[] = [];
    const programNodes = allNodes.filter(n => n.type === "Program");

    for (const program of programNodes.slice(0, 5)) {
      const programEdges = allEdges.filter(e => e.source === program.id);
      const systems = programEdges
        .filter(e => e.relation === "part_of")
        .map(e => {
          const systemNode = allNodes.find(n => n.id === e.target);
          const subsystems = allEdges
            .filter(se => se.source === e.target && se.relation === "part_of")
            .map(se => allNodes.find(n => n.id === se.target)?.id)
            .filter(Boolean);

          return {
            name: e.target,
            type: systemNode?.type,
            subsystems,
          };
        });

      if (systems.length > 0) {
        hierarchies.push({
          program: program.id,
          systems,
        });
      }
    }

    // Entity type breakdown
    const typeBreakdown: Record<string, number> = {};
    allNodes.forEach(node => {
      typeBreakdown[node.type] = (typeBreakdown[node.type] || 0) + 1;
    });

    // Relationship type breakdown
    const relationBreakdown: Record<string, number> = {};
    allEdges.forEach(edge => {
      relationBreakdown[edge.relation] = (relationBreakdown[edge.relation] || 0) + 1;
    });

    return NextResponse.json({
      programs,
      contractors,
      hierarchies,
      typeBreakdown,
      relationBreakdown,
      totalEntities: allNodes.length,
      totalRelations: allEdges.length,
    });
  } catch (error) {
    console.error("Insights API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
