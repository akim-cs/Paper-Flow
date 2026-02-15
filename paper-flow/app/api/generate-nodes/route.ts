import { NextResponse } from "next/server";
import type { Slide, PresentationConfig } from "@/app/types/slides";
import {
  paperStore,
  chunkText,
  parseSections,
  generateOutline,
  generateNodes
} from "@/app/lib/gemini/helpers";

export async function POST(req: Request) {
  try {
    const body: {
      paperId?: string;
      audienceLevel?: PresentationConfig["audienceLevel"];
      timeLimit?: number;
    } = await req.json();

    const { paperId, audienceLevel, timeLimit } = body;

    if (!paperId || !paperStore.has(paperId)) {
      return NextResponse.json({ error: "Invalid or missing paperId" }, { status: 400 });
    }

    if (!audienceLevel || !timeLimit) {
      return NextResponse.json({ error: "Missing presentation configuration" }, { status: 400 });
    }

    const text = paperStore.get(paperId)!;

    const chunks = chunkText(text);
    const sections = await parseSections(chunks.join("\n\n"));
    const outline = await generateOutline(sections, { audienceLevel, timeLimit });
    const slides: Slide[] = await generateNodes(outline, sections, { audienceLevel, timeLimit });

    return NextResponse.json(slides);
  } catch (err: unknown) {
    console.error("Error in generating nodes:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error"}, { status: 500 });
  }
}