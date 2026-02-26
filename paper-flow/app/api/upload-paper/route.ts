import { NextResponse } from "next/server";
import { extractPdfText } from "@/app/lib/gemini/helpers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { file } = body;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400});
    }

    const fileBuffer = Uint8Array.from(atob(file), c => c.charCodeAt(0));

    const extractedText = await extractPdfText(fileBuffer);

    return NextResponse.json({ extractedText });
  } catch (err) {
    console.error("Error in upload-paper", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message: "Unknown error" },
      { status: 500 }
    )
  }
}