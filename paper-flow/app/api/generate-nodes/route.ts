import { NextResponse } from "next/server";
import type { Slide, PresentationConfig } from "@/app/types/slides";
import {
  chunkText,
  parseSections,
  generateOutline,
  generateNodes
} from "@/app/lib/gemini/helpers";

export async function POST(req: Request) {
  try {
    const body: {
      extractedText?: string;
      audienceLevel?: PresentationConfig["audienceLevel"];
      timeLimit?: number;
      researcherType?: PresentationConfig["researcherType"];
    } = await req.json();

    const { extractedText, audienceLevel, timeLimit, researcherType } = body;

    if (!extractedText) {
      return NextResponse.json({ error: "Missing extracted text" }, { status: 400 });
    }

    if (!audienceLevel || !timeLimit) {
      return NextResponse.json({ error: "Missing presentation configuration" }, { status: 400 });
    }

    if (!researcherType) {
      return NextResponse.json({ error: "Missing researcher type" }, { status: 400 });
    }

    const chunks = chunkText(extractedText);
    const sections = await parseSections(chunks.join("\n\n"));
    const outline = await generateOutline(sections, { audienceLevel, timeLimit, researcherType });
    const slides: Slide[] = await generateNodes(outline, sections, { audienceLevel, timeLimit, researcherType });

    return NextResponse.json({ slides, sections });
  } catch (err: unknown) {
    console.error("Error in generating nodes:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error"}, { status: 500 });
  }
}