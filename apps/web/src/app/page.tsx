"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("Untitled Document");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const router = useRouter();

  // Load recent documents and stats on mount
  useEffect(() => {
    fetch("/api/documents")
      .then(res => res.json())
      .then(data => setRecentDocs(data.documents || []))
      .catch(console.error);

    fetch("/api/stats")
      .then(res => res.json())
      .then(data => setStats(data.stats))
      .catch(console.error);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - only accept text files
    const allowedTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/json'];
    const allowedExtensions = ['.txt', '.md', '.csv', '.json', '.text'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      alert('Invalid file type. Please upload a text file (.txt, .md, .csv, or .json)');
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file size - max 10MB
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 10MB.');
      e.target.value = ''; // Reset input
      return;
    }

    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;

      // Validate content length
      if (content.length > maxSize) {
        alert('File content is too large. Maximum size is 10MB.');
        e.target.value = '';
        return;
      }

      setText(content);
    };
    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleIngest = async () => {
    if (!text.trim()) {
      alert("Please provide text to ingest");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          mode: "ingest",
          filename,
        }),
      });

      const data = await res.json();
      setResult(data);

      // Refresh recent docs and stats
      const docsRes = await fetch("/api/documents");
      const docsData = await docsRes.json();
      setRecentDocs(docsData.documents || []);

      const statsRes = await fetch("/api/stats");
      const statsData = await statsRes.json();
      setStats(statsData.stats);
    } catch (error) {
      console.error("Ingestion error:", error);
      alert("Failed to ingest document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Defense Knowledge Graph
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Intelligence Analysis System
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/graph")}
              >
                Graph View
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Ingestion Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Document Ingestion</CardTitle>
                <CardDescription>
                  Upload defense intelligence documents to extract entities and relationships
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File
                  </label>
                  <input
                    type="file"
                    accept=".txt,.md"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-600
                      file:mr-4 file:py-2 file:px-4
                      file:rounded file:border-0
                      file:text-sm file:font-medium
                      file:bg-gray-100 file:text-gray-700
                      hover:file:bg-gray-200
                      cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supports .txt and .md files
                  </p>
                </div>

                {/* Filename Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Name
                  </label>
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter document name"
                  />
                </div>

                {/* Text Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Text
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Paste defense document text here or upload a file above..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {text.length.toLocaleString()} characters
                  </p>
                </div>

                {/* Ingest Button */}
                <Button
                  onClick={handleIngest}
                  disabled={loading || !text.trim()}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Processing..." : "Ingest Document"}
                </Button>

                {/* Results */}
                {result && result.type === "ingestion" && (
                  <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Extraction Complete
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {result.data.triples?.length || 0}
                        </div>
                        <div className="text-xs text-gray-600">Relationships</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {result.data.orphan_entities?.length || 0}
                        </div>
                        <div className="text-xs text-gray-600">Orphan Entities</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-amber-600">
                          {result.data.ambiguities?.length || 0}
                        </div>
                        <div className="text-xs text-gray-600">Ambiguities</div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={() => router.push("/dashboard")}
                        className="flex-1"
                      >
                        View Dashboard
                      </Button>
                      <Button
                        onClick={() => router.push("/graph")}
                        variant="outline"
                        className="flex-1"
                      >
                        Explore Graph
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Stats & Recent Docs */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Knowledge Graph Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Entities</span>
                  <span className="font-semibold text-gray-900">
                    {stats?.totalEntities || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Relationships</span>
                  <span className="font-semibold text-gray-900">
                    {stats?.totalRelations || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Documents</span>
                  <span className="font-semibold text-gray-900">{recentDocs.length}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => router.push("/dashboard")}
                >
                  View Full Analytics
                </Button>
              </CardContent>
            </Card>

            {/* Recent Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Ingestions</CardTitle>
              </CardHeader>
              <CardContent>
                {recentDocs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No documents yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentDocs.slice(0, 5).map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2 border border-gray-200 rounded hover:bg-gray-50 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => {
                              setText(doc.content);
                              setFilename(doc.filename);
                            }}
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {doc.filename}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center justify-between mt-1">
                              <span>{doc.tripleCount} triples</span>
                              <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${doc.filename}"? This will permanently remove the document and all its extracted relationships. Entities with no remaining connections will also be removed.`)) {
                                try {
                                  const res = await fetch(`/api/documents?id=${doc.id}`, {
                                    method: "DELETE",
                                  });
                                  if (res.ok) {
                                    // Refresh documents list
                                    const docsRes = await fetch("/api/documents");
                                    const docsData = await docsRes.json();
                                    setRecentDocs(docsData.documents || []);

                                    // Refresh stats
                                    const statsRes = await fetch("/api/stats");
                                    const statsData = await statsRes.json();
                                    setStats(statsData.stats);
                                  } else {
                                    alert("Failed to delete document");
                                  }
                                } catch (error) {
                                  console.error("Delete error:", error);
                                  alert("Failed to delete document");
                                }
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-opacity"
                            title="Delete document"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
