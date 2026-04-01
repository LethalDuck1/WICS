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
      return new NextResponse("Both files required", { status: 400 });
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

    return NextResponse.json(
      compareInventories(previousTitles, currentTitles)
    );
  } catch (err) {
    return new NextResponse("Server error", { status: 500 });
  }
}
