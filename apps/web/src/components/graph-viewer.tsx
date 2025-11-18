"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const nodeColor = (node: Node) => {
  const entityType = node.data.entityType;
  switch (entityType) {
    case "Contractor": return "#3b82f6";
    case "System": return "#8b5cf6";
    case "Subsystem": return "#ec4899";
    case "Program": return "#f59e0b";
    case "PEO": return "#10b981";
    case "Technology": return "#06b6d4";
    default: return "#6b7280";
  }
};

const edgeColor = (relation: string) => {
  switch (relation) {
    case "developed_by": return "#3b82f6";
    case "overseen_by": return "#10b981";
    case "part_of": return "#8b5cf6";
    case "depends_on": return "#f59e0b";
    default: return "#6b7280";
  }
};

function getLayoutedElements(nodes: Node[], edges: Edge[]): Node[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "TB",
    nodesep: 150,
    ranksep: 200,
    marginx: 50,
    marginy: 50,
  });

  const nodeWidth = 200;
  const nodeHeight = 80;

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      style: {
        width: nodeWidth,
        height: nodeHeight,
      },
    };
  });
}

function GraphViewerInner() {
  const searchParams = useSearchParams();
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(["all"]));
  const [focusNode, setFocusNode] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(false);
  const { fitView, setCenter } = useReactFlow();

  const entityTypes = ["Program", "Contractor", "System", "Subsystem", "PEO", "Technology"];

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  useEffect(() => {
    async function loadGraph() {
      try {
        const res = await fetch("/api/graph");
        const data = await res.json();

        if (data.nodes && data.edges) {
          const layoutedNodes = getLayoutedElements(data.nodes, data.edges);
          const styledEdges = data.edges.map((edge: Edge) => {
            const labelStr = String(edge.label || "");
            return {
              ...edge,
              label: labelStr,
              type: "smoothstep",
              animated: false,
              style: {
                stroke: edgeColor(labelStr),
                strokeWidth: 2,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: edgeColor(labelStr),
              },
              labelStyle: {
                fontSize: 11,
                fontWeight: 500,
                fill: "#374151",
              },
              labelBgStyle: {
                fill: "#ffffff",
                fillOpacity: 0.9,
              },
            };
          });

          setAllNodes(layoutedNodes);
          setAllEdges(styledEdges);
          setNodes(layoutedNodes);
          setEdges(styledEdges);
        }
      } catch (error) {
        console.error("Failed to load graph:", error);
      } finally {
        setLoading(false);
      }
    }

    loadGraph();
  }, [setNodes, setEdges]);

  // Apply URL parameters after graph loads
  useEffect(() => {
    if (allNodes.length === 0 || loading) return;

    const focusParam = searchParams.get('focus');
    const searchParam = searchParams.get('search');
    const typeParam = searchParams.get('type');

    if (focusParam) {
      // Check if the entity exists in the graph
      const entityExists = allNodes.some(n => n.id === focusParam);
      if (entityExists) {
        setFocusNode(focusParam);
        setControlsVisible(true); // Show controls so user can see what's focused
      }
    }

    if (searchParam) {
      setSearchTerm(searchParam);
      setControlsVisible(true);
    }

    if (typeParam) {
      const types = typeParam.split(',');
      setSelectedTypes(new Set(types));
      setControlsVisible(true);
    }
  }, [allNodes, loading, searchParams]);

  // Filter nodes and edges based on search, type filter, and focus
  useEffect(() => {
    let filteredNodes = allNodes;
    let filteredEdges = allEdges;

    // Type filter
    if (!selectedTypes.has("all")) {
      filteredNodes = allNodes.filter(n =>
        selectedTypes.has(String(n.data.entityType))
      );
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredEdges = allEdges.filter(e =>
        nodeIds.has(e.source) && nodeIds.has(e.target)
      );
    }

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredNodes = filteredNodes.filter(n =>
        n.id.toLowerCase().includes(lowerSearch)
      );
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredEdges = filteredEdges.filter(e =>
        nodeIds.has(e.source) && nodeIds.has(e.target)
      );
    }

    // Focus mode
    if (focusNode) {
      const connectedIds = new Set([focusNode]);
      allEdges.forEach(e => {
        if (e.source === focusNode) connectedIds.add(e.target);
        if (e.target === focusNode) connectedIds.add(e.source);
      });
      filteredNodes = allNodes.filter(n => connectedIds.has(n.id));
      filteredEdges = allEdges.filter(e =>
        connectedIds.has(e.source) && connectedIds.has(e.target)
      );
    }

    // Re-layout filtered nodes to cluster them together
    if (filteredNodes.length < allNodes.length && filteredNodes.length > 0) {
      const layoutedFiltered = getLayoutedElements(filteredNodes, filteredEdges);
      setNodes(layoutedFiltered);
      setEdges(filteredEdges);
      setTimeout(() => fitView(), 50);
    } else {
      setNodes(filteredNodes);
      setEdges(filteredEdges);
    }
  }, [searchTerm, selectedTypes, focusNode, allNodes, allEdges, setNodes, setEdges, fitView]);

  const toggleTypeFilter = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (type === "all") {
      newTypes.clear();
      newTypes.add("all");
    } else {
      newTypes.delete("all");
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      if (newTypes.size === 0) newTypes.add("all");
    }
    setSelectedTypes(newTypes);
  };

  const handleNodeClick = (_: any, node: Node) => {
    if (focusNode === node.id) {
      // Unfocusing - reset to original view with all nodes
      setFocusNode(null);
      setTimeout(() => fitView(), 100);
    } else {
      setFocusNode(node.id);
    }
  };

  const resetView = () => {
    setSearchTerm("");
    setSelectedTypes(new Set(["all"]));
    setFocusNode(null);
    setTimeout(() => fitView(), 0);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p>Loading graph...</p>
      </div>
    );
  }

  if (allNodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">No data in knowledge graph</p>
          <p className="text-sm text-muted-foreground">
            Go to Home to ingest defense documents
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Collapsible Controls Toggle */}
      {!controlsVisible && (
        <button
          onClick={() => setControlsVisible(true)}
          className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors"
          title="Show filters"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      )}

      {/* Controls Overlay */}
      {controlsVisible && (
        <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-md space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Filters</span>
            <button
              onClick={() => setControlsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
              title="Hide filters"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div>
            <Input
              type="text"
              placeholder="Search entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Type Filters */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Filter by Type</p>
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant={selectedTypes.has("all") ? "default" : "outline"}
                onClick={() => toggleTypeFilter("all")}
                className="text-xs h-7"
              >
                All
              </Button>
              {entityTypes.map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant={selectedTypes.has(type) ? "default" : "outline"}
                  onClick={() => toggleTypeFilter(type)}
                  className="text-xs h-7"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {nodes.length} / {allNodes.length} entities
            </span>
            {(focusNode || searchTerm || !selectedTypes.has("all")) && (
              <Button size="sm" variant="ghost" onClick={resetView} className="h-6 text-xs">
                Reset View
              </Button>
            )}
          </div>

          {focusNode && (
            <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
              Focus: {focusNode} (click node to toggle)
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-3 max-w-xs">
        <p className="text-xs font-medium text-gray-700 mb-2">Entity Types</p>
        <div className="space-y-1">
          {entityTypes.map(type => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: nodeColor({ data: { entityType: type } } as any) }}
              />
              <span className="text-gray-700">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Back to Full View Button */}
      {(focusNode || searchTerm || !selectedTypes.has("all")) && (
        <button
          onClick={resetView}
          className="absolute bottom-4 left-4 z-10 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Full View</span>
        </button>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        fitView
      >
        <Controls />
        <MiniMap
          nodeColor={nodeColor}
          pannable
          zoomable
          style={{ height: 150, width: 200 }}
          className="border-2 border-gray-300"
        />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export function GraphViewer() {
  return (
    <ReactFlowProvider>
      <GraphViewerInner />
    </ReactFlowProvider>
  );
}
