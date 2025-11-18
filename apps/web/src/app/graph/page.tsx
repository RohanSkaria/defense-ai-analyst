import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraphViewer } from "@/components/graph-viewer";

export default function GraphPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Knowledge Graph Visualization</h1>

      <Card>
        <CardHeader>
          <CardTitle>Interactive Graph Viewer</CardTitle>
          <CardDescription>
            Explore entities and relationships in the defense knowledge graph
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] border rounded-md">
            <GraphViewer />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
