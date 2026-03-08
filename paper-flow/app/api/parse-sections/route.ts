import { NextResponse } from "next/server";
import { chunkText, parseSections } from "@/app/lib/gemini/helpers";

export async function POST(req: Request) {
  try {
    const { extractedText } = await req.json();

    if (!extractedText) {
      return NextResponse.json({ error: "Missing extractedText" }, { status: 400 });
    }

    const chunks = chunkText(extractedText);
    const sections = await parseSections(chunks.join("\n\n"));

    return NextResponse.json({ sections });
  } catch (err) {
    console.error("Error in parse-sections:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
