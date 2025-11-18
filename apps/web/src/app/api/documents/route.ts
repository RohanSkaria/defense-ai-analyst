import { graphService } from "@/lib/graph-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const documents = await graphService.getAllDocuments();

    return NextResponse.json({
      documents,
    });
  } catch (error) {
    console.error("Documents API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
