import { NextRequest, NextResponse } from "next/server";
import { extractPdfTextFromBuffer } from "@/lib/pdf";
import { compareInventories, extractShowTitles } from "@/lib/compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const previous = formData.get("previous");
    const current = formData.get("current");

    if (!(previous instanceof File) || !(current instanceof File)) {
      return new NextResponse(
        "Both previous and current PDF files are required.",
        { status: 400 }
      );
    }

    if (
      !previous.name.toLowerCase().endsWith(".pdf") ||
      !current.name.toLowerCase().endsWith(".pdf")
    ) {
      return new NextResponse("Only PDF files are supported.", {
        status: 400,
      });
    }

    const [previousBuffer, currentBuffer] = await Promise.all([
      fileToBuffer(previous),
      fileToBuffer(current),
    ]);

    const [previousText, currentText] = await Promise.all([
      extractPdfTextFromBuffer(previousBuffer),
      extractPdfTextFromBuffer(currentBuffer),
    ]);

    const previousTitles = extractShowTitles(previousText);
    const currentTitles = extractShowTitles(currentText);

    if (previousTitles.length === 0 && currentTitles.length === 0) {
      return new NextResponse(
        "No usable show titles were detected. These PDFs may be image based.",
        { status: 422 }
      );
    }

    return NextResponse.json(
      compareInventories(previousTitles, currentTitles)
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected compare error.";
    return new NextResponse(message, { status: 500 });
  }
}
