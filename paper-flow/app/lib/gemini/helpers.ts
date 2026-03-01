// TODO: delete geminiVision
import { geminiText, /*geminiVision*/ } from "./client";
// TODO: delete pdf prompt
import { /*PDF_EXTRACT_PROMPT,*/ SECTION_PROMPT, OUTLINE_PROMPT, SLIDES_PROMPT} from "./prompts";
import { Sections, OutlineItem, Slide, PresentationConfig } from "@/app/types/slides"

export function cleanJsonString(raw: string): string {
  return raw.replace(/```(json)?\s*([\s\S]*?)```/, '$2').trim();
}

// --- Chunking ---
export function chunkText(text: string, maxChunkSize: number = 8000): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + maxChunkSize
    if (end < text.length) {
      const lastNewline = text.lastIndexOf("\n", end)
      if (lastNewline > start) end = lastNewline
    }
    chunks.push(text.slice(start, end).trim())
    start = end
  }
  return chunks;
}

// TODO: delete extract pdf method
// // --- PDF Text Extraction ---
// export async function extractPdfText(fileBuffer: Uint8Array): Promise<string> {
//   const text = await geminiVision(fileBuffer, PDF_EXTRACT_PROMPT);
//   if (!text) throw new Error("Gemini returned no text for PDF")
//   return text;
// }

// --- Parse Sections ---
export async function parseSections(text: string) {
  const prompt = SECTION_PROMPT(text);
  const sectionJson = await geminiText(prompt);

  if (!sectionJson) {
    throw new Error("Gemini returned undefined for sections")
  }

  const cleaned = cleanJsonString(sectionJson);

  try {
    const sections = JSON.parse(cleaned);
    return sections;
  } catch (err) {
    console.error("Failed to parse sections JSON:", err);
    throw new Error("Gemini returned invalid JSON for sections");
  }
}

// --- Generate Outline ---
export async function generateOutline(
  sections: Sections,
  config?: PresentationConfig
): Promise<OutlineItem[]> {
  const promptWithConfig = OUTLINE_PROMPT(JSON.stringify(sections), config?.timeLimit) +
    (config
      ? `\nAudience Level: ${config.audienceLevel}\nTime Limit: ${config.timeLimit} minutes`
      : "");
  const outlineJson = await geminiText(promptWithConfig);

  if (!outlineJson) {
    throw new Error("Gemini returned undefined for outline")
  }

  const cleaned = cleanJsonString(outlineJson);

  try {
    const outline: OutlineItem[] = JSON.parse(cleaned)
    return outline;
  } catch (err) {
    console.error("Failed to parse outline JSON:", err)
    throw new Error("Gemini returned invalid JSON for outline")
  }
}

// --- Generate Nodes ---
// export async function generateNodes(
//   outline: OutlineItem[],
//   sections: Sections,
//   config?: PresentationConfig
// ): Promise<Slide[]>{
//   const promptWithConfig = SLIDES_PROMPT(JSON.stringify(outline), JSON.stringify(sections), config?.timeLimit) +
//     (config
//       ? `\nAudience Level: ${config.audienceLevel}\nTime Limit: ${config.timeLimit} minutes`
//       : "");
//   const nodesJson = await geminiText(promptWithConfig)

//   if (!nodesJson) {
//     throw new Error("Gemini returned undefined for nodes")
//   }

//   const cleaned = cleanJsonString(nodesJson);

//   try {
//     const nodes = JSON.parse(cleaned)
//     return nodes
//   } catch (err) {
//     console.error("Failed to parse nodes JSON:", err)
//     throw new Error("Gemini returned invalid JSON for nodes")
//   }
// }

export async function generateNodes(
  outline: OutlineItem[],
  sections: Sections,
  config?: PresentationConfig
): Promise<Slide[]> {

  const promptWithConfig =
    SLIDES_PROMPT(
      JSON.stringify(outline),
      JSON.stringify(sections),
      config?.timeLimit
    ) +
    (config
      ? `\nAudience Level: ${config.audienceLevel}\nTime Limit: ${config.timeLimit} minutes`
      : "");

  const markdown = await geminiText(promptWithConfig);

  if (!markdown) {
    throw new Error("Gemini returned undefined for slides");
  }

  return parseMarkdownSlides(markdown);
}

function parseMarkdownSlides(markdown: string): Slide[] {
  const slideBlocks = markdown.split(/\n---\n/);

  return slideBlocks.map((block) => {
    const titleMatch = block.match(/##\s*(.+)/);
    const timeMatch = block.match(/Estimated Time:\s*(\d+)/);
    const bulletMatches = block.match(/^- (.+)/gm);

    const title = titleMatch?.[1]?.trim() ?? "Untitled Slide";
    const est_time = timeMatch ? Number(timeMatch[1]) : 2;

    const speaker_notes = bulletMatches
      ? bulletMatches.map(b => b.replace(/^- /, "").trim())
      : [];

    const cleanedMarkdown = block
      .replace(/##\s*.+/, "")
      .replace(/Estimated Time:\s*\d+.*\n?/, "")
      .trim();

    return {
      title,
      est_time,
      speaker_notes,
      contentMarkdown: cleanedMarkdown,
    };
  });
}