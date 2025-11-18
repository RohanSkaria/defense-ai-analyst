import { graphService } from "@/lib/graph-service";
import { NextResponse, NextRequest } from "next/server";

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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Validate that ID is a valid integer
    const documentId = parseInt(id, 10);
    if (isNaN(documentId) || documentId < 1) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    await graphService.deleteDocument(documentId);

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Document deletion error:", error);

    // Don't expose internal error details in production
    const isDevMode = process.env.NODE_ENV === "development";
    const errorMessage = isDevMode && error instanceof Error
      ? error.message
      : "Failed to delete document";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
