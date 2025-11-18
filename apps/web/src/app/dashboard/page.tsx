"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [insights, setInsights] = useState<any>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/insights")
      .then(res => res.json())
      .then(data => setInsights(data))
      .catch(console.error);
  }, []);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
          mode: "analyze",
        }),
      });

      const data = await res.json();
      setAnswer(data.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!insights) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>Loading insights...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Intelligence Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Knowledge Graph Insights
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/")}>
                Ingest Data
              </Button>
              <Button variant="outline" onClick={() => router.push("/graph")}>
                Graph View
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 70% */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Programs */}
            <Card>
              <CardHeader>
                <CardTitle>Top Programs by Connections</CardTitle>
                <CardDescription>Most connected entities in the knowledge graph</CardDescription>
              </CardHeader>
              <CardContent>
                {insights.programs.length === 0 ? (
                  <p className="text-sm text-gray-500">No programs found</p>
                ) : (
                  <div className="space-y-2">
                    {insights.programs.map((program: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/graph?focus=${encodeURIComponent(program.name)}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-amber-100 text-amber-700 flex items-center justify-center font-semibold text-sm">
                            {i + 1}
                          </div>
                          <span className="font-medium text-gray-900">{program.name}</span>
                        </div>
                        <span className="text-sm text-gray-600">{program.connections} connections</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contractor Portfolio */}
            <Card>
              <CardHeader>
                <CardTitle>Contractor Portfolio</CardTitle>
                <CardDescription>Defense contractors and their systems</CardDescription>
              </CardHeader>
              <CardContent>
                {insights.contractors.length === 0 ? (
                  <p className="text-sm text-gray-500">No contractors found</p>
                ) : (
                  <div className="space-y-3">
                    {insights.contractors.map((contractor: any, i: number) => (
                      <div key={i} className="border border-gray-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{contractor.name}</span>
                          <span className="text-sm text-blue-600 font-medium">{contractor.systemCount} systems</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {contractor.systems.map((system: string, j: number) => (
                            <span
                              key={j}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                            >
                              {system}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Hierarchies */}
            <Card>
              <CardHeader>
                <CardTitle>System Hierarchies</CardTitle>
                <CardDescription>Program relationships and subsystems</CardDescription>
              </CardHeader>
              <CardContent>
                {insights.hierarchies.length === 0 ? (
                  <p className="text-sm text-gray-500">No hierarchies found</p>
                ) : (
                  <div className="space-y-4">
                    {insights.hierarchies.map((hierarchy: any, i: number) => (
                      <div key={i} className="border-l-4 border-amber-500 pl-4">
                        <div className="font-semibold text-gray-900 mb-2">{hierarchy.program}</div>
                        <div className="space-y-2 ml-4">
                          {hierarchy.systems.map((system: any, j: number) => (
                            <div key={j}>
                              <div className="text-sm text-gray-700">└─ {system.name}</div>
                              {system.subsystems && system.subsystems.length > 0 && (
                                <div className="ml-4 space-y-1">
                                  {system.subsystems.map((sub: string, k: number) => (
                                    <div key={k} className="text-xs text-gray-500">
                                      └─ {sub}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 30% */}
          <div className="space-y-6">
            {/* Entity Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entity Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(insights.typeBreakdown).map(([type, count]: [string, any]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{type}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-sm">Total Entities</span>
                    <span>{insights.totalEntities}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
                    <span>Total Relations</span>
                    <span>{insights.totalRelations}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Intelligence Q&A */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ask Intelligence Question</CardTitle>
                <CardDescription className="text-xs">
                  Query the knowledge graph
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What radar systems are used on DDG-51 destroyers?"
                />
                <Button
                  onClick={handleAskQuestion}
                  disabled={loading || !question.trim()}
                  className="w-full"
                  size="sm"
                >
                  {loading ? "Analyzing..." : "Ask Question"}
                </Button>

                {answer && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                    <p className="font-medium text-gray-900 mb-2">Analysis:</p>
                    <p className="text-gray-700 text-xs leading-relaxed">{answer.analysis}</p>
                    {answer.key_findings && answer.key_findings.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium text-gray-900 mb-1">Key Findings:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {answer.key_findings.map((finding: string, i: number) => (
                            <li key={i} className="text-xs text-gray-600">{finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Relationship Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Relationship Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(insights.relationBreakdown).map(([relation, count]: [string, any]) => (
                  <div key={relation} className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">{relation}</span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
