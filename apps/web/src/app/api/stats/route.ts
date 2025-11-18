import { graphService } from "@/lib/graph-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const stats = await graphService.getStats();
    const validation = await graphService.validate();

    return NextResponse.json({
      stats,
      validation: validation.validation_results,
      recommendations: validation.recommendations,
    });
  } catch (error) {
    console.error("Stats API error:", error);

    const isDevMode = process.env.NODE_ENV === "development";
    const errorMessage = isDevMode && error instanceof Error
      ? error.message
      : "Failed to retrieve statistics";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
