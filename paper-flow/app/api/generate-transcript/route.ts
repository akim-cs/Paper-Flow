import { NextResponse } from "next/server";
import type { Slide, PresentationConfig } from "@/app/types/slides";
import { generateTranscript } from "@/app/lib/gemini/helpers";

export async function POST(req: Request) {
  try {
    const body: {
      slides?: Slide[];
      slideIndex?: number;
      audienceLevel?: PresentationConfig["audienceLevel"];
      timeLimit?: number;
    } = await req.json();

    const { slides, slideIndex, audienceLevel, timeLimit } = body;

    if (!slides || slides.length === 0) {
      return NextResponse.json({ error: "Missing slides" }, { status: 400 });
    }

    if (typeof slideIndex !== 'number' || slideIndex < 0 || slideIndex >= slides.length) {
      return NextResponse.json({ error: "Invalid slideIndex" }, { status: 400 });
    }

    if (!audienceLevel || !timeLimit) {
      return NextResponse.json({ error: "Missing presentation configuration" }, { status: 400 });
    }

    const transcript = await generateTranscript(slides, slideIndex, { audienceLevel, timeLimit });

    return NextResponse.json({ transcript });
  } catch (err: unknown) {
    console.error("Error in generating transcript:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error"}, { status: 500 });
  }
}
