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
      researcherType?: PresentationConfig["researcherType"];
      presentationSize?: PresentationConfig["presentationSize"];
    } = await req.json();

    const { extractedText, audienceLevel, researcherType, presentationSize } = body;

    if (!extractedText) {
      return NextResponse.json({ error: "Missing extracted text" }, { status: 400 });
    }

    if (!audienceLevel) {
      return NextResponse.json({ error: "Missing presentation configuration" }, { status: 400 });
    }

    if (!researcherType) {
      return NextResponse.json({ error: "Missing researcher type" }, { status: 400 });
    }

    const config: PresentationConfig = {
      audienceLevel,
      researcherType,
      presentationSize: presentationSize ?? 'medium',
    };

    const chunks = chunkText(extractedText);
    const sections = await parseSections(chunks.join("\n\n"));
    const outline = await generateOutline(sections, config);
    const slides: Slide[] = await generateNodes(outline, sections, config);

    return NextResponse.json({ slides, sections });
  } catch (err: unknown) {
    console.error("Error in generating nodes:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error"}, { status: 500 });
  }
}