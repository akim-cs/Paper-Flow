import { NextResponse } from "next/server";
import type { PresentationConfig, Sections } from "@/app/types/slides";
import { generateOutline } from "@/app/lib/gemini/helpers";

export async function POST(req: Request) {
  try {
    const body: { sections?: Sections; config?: PresentationConfig } = await req.json();
    const { sections, config } = body;

    if (!sections) {
      return NextResponse.json({ error: "Missing sections" }, { status: 400 });
    }
    if (!config?.audienceLevel || !config?.researcherType) {
      return NextResponse.json({ error: "Missing presentation config" }, { status: 400 });
    }

    const outline = await generateOutline(sections, config);

    return NextResponse.json({ outline });
  } catch (err) {
    console.error("Error in generate-outline:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
