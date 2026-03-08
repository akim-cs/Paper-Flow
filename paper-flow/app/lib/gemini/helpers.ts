import { geminiText } from "./client";
import { SECTION_PROMPT, OUTLINE_PROMPT, SLIDES_PROMPT, REPAIR_SLIDES_PROMPT, ATTRIBUTE_SOURCES_PROMPT, TRANSCRIPT_PROMPT } from "./prompts";
import { Sections, OutlineItem, Slide, PresentationConfig, BulletSource } from "@/app/types/slides"

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
  const promptWithConfig = OUTLINE_PROMPT(JSON.stringify(sections), config?.researcherType, config?.presentationSize) +
    (config
      ? `\nAudience Level: ${config.audienceLevel}`
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

// --- Attribution fallback: maps bullet texts → verbatim excerpts via a structured call ---
// Used when inline [src:...] markers were not present in the generated markdown.
async function attributeBulletSources(
  slides: Slide[],
  sections: Sections
): Promise<Map<number, BulletSource[]>> {
  // Build per-slide bullet lists from already-clean contentMarkdown
  const slidesForPrompt = slides.map((slide, index) => ({
    index,
    title: slide.title,
    bullets: slide.contentMarkdown
      .split('\n')
      .filter((l) => BULLET_LINE_RE.test(l))
      .map((l) => { const m = l.match(BULLET_LINE_RE); return m ? m[3].trim() : ''; })
      .filter(Boolean),
  })).filter((s) => s.bullets.length > 0);

  if (slidesForPrompt.length === 0) return new Map();

  // Format sections as plain text (easier for the model to search than JSON)
  const sectionText = (
    ['abstract', 'introduction', 'methodology', 'results', 'discussion', 'conclusion'] as const
  )
    .filter((key) => sections[key])
    .map((key) => `${key}:\n${sections[key]}`)
    .join('\n\n');

  const prompt = ATTRIBUTE_SOURCES_PROMPT(slidesForPrompt, sectionText);
  const raw = await geminiText(prompt);
  if (!raw) return new Map();

  try {
    const cleaned = cleanJsonString(raw);
    const attributions: Array<{
      slideIndex: number;
      bulletId: string;
      normalizedSection: BulletSource['normalizedSection'];
      excerpt: string;
    }> = JSON.parse(cleaned);

    const result = new Map<number, BulletSource[]>();
    for (const attr of attributions) {
      if (
        typeof attr.slideIndex !== 'number' ||
        !attr.bulletId ||
        !attr.normalizedSection ||
        !attr.excerpt
      ) continue;
      const paperHeading = sections.headings?.[attr.normalizedSection] ?? undefined;
      const existing = result.get(attr.slideIndex) ?? [];
      existing.push({
        bulletId: attr.bulletId,
        normalizedSection: attr.normalizedSection,
        excerpt: attr.excerpt.trim().replace(/^["']|["']$/g, ''),
        ...(paperHeading ? { paperHeading } : {}),
      });
      result.set(attr.slideIndex, existing);
    }
    return result;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[attributeBulletSources] Failed to parse attribution JSON:', err);
    }
    return new Map();
  }
}

// --- Generate Nodes ---
export async function generateNodes(
  outline: OutlineItem[],
  sections: Sections,
  config?: PresentationConfig
): Promise<Slide[]> {

  const sectionsJson = JSON.stringify(sections);

  const promptWithConfig =
    SLIDES_PROMPT(
      JSON.stringify(outline),
      sectionsJson,
      config?.researcherType,
      config?.presentationSize
    ) +
    (config
      ? `\nAudience Level: ${config.audienceLevel}`
      : "");

  let markdown = await geminiText(promptWithConfig);

  if (!markdown) {
    throw new Error("Gemini returned undefined for slides");
  }

  // Dev logging: show whether raw markdown contains [src:...] markers
  if (process.env.NODE_ENV === 'development') {
    const { valid, missing, total } = validateBulletCitations(markdown);
    console.log(`[generateNodes] Raw markdown length: ${markdown.length} chars`);
    console.log(`[generateNodes] Citation check — bullets: ${total}, missing: ${missing}, valid: ${valid}`);
    if (!valid) {
      console.warn(`[generateNodes] ${missing}/${total} bullets lack [src:...] — triggering repair pass`);
    }
  }

  // Pass 1: if any bullet is missing a [src:...] marker, attempt one inline repair
  const { valid: validAfterGen } = validateBulletCitations(markdown);
  if (!validAfterGen) {
    const repaired = await geminiText(REPAIR_SLIDES_PROMPT(markdown, sectionsJson));
    if (repaired) {
      markdown = repaired;
      if (process.env.NODE_ENV === 'development') {
        const after = validateBulletCitations(markdown);
        console.log(`[generateNodes] After repair pass — bullets: ${after.total}, missing: ${after.missing}, valid: ${after.valid}`);
      }
    } else {
      console.warn('[generateNodes] Repair call returned empty; proceeding with original markdown');
    }
  }

  // Parse inline markers → bulletSources + clean markdown
  let slides = parseMarkdownSlides(markdown, sections.headings);

  if (process.env.NODE_ENV === 'development') {
    slides.forEach((s) => {
      console.log(`[generateNodes] After inline parse — Slide "${s.title}": ${s.bulletSources?.length ?? 0} bulletSources`);
    });
  }

  // Pass 2 (attribution fallback): for slides that still have no bulletSources,
  // make one structured call to retrieve them as JSON — much more reliable than
  // inline markers because it's a pure retrieval task with clear input/output.
  const missingAttribution = slides
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.bulletSources?.length);

  if (missingAttribution.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[generateNodes] Attribution fallback for ${missingAttribution.length} slides without bulletSources`);
    }

    // Pass only the slides that need attribution, re-indexed 0…n locally
    const slidesForAttribution = missingAttribution.map(({ s }) => s);
    const attributions = await attributeBulletSources(slidesForAttribution, sections);

    if (process.env.NODE_ENV === 'development') {
      attributions.forEach((sources, localIdx) => {
        console.log(`[generateNodes] Attribution result — local slide ${localIdx}: ${sources.length} sources`);
      });
    }

    // Merge attributions back using local index → original position mapping
    slides = slides.map((slide, globalIdx) => {
      const localIdx = missingAttribution.findIndex(({ i }) => i === globalIdx);
      if (localIdx === -1 || (slide.bulletSources?.length ?? 0) > 0) return slide;
      const sources = attributions.get(localIdx);
      return sources?.length ? { ...slide, bulletSources: sources } : slide;
    });

    if (process.env.NODE_ENV === 'development') {
      slides.forEach((s) => {
        console.log(`[generateNodes] Final — Slide "${s.title}": ${s.bulletSources?.length ?? 0} bulletSources`);
      });
    }
  }

  // Zip slide-level source_section and paper_heading from the outline (1:1 correspondence by position)
  return slides.map((slide, i) => ({
    ...slide,
    ...(outline[i]?.source_section ? { source_section: outline[i].source_section } : {}),
    ...(outline[i]?.paper_heading ? { paper_heading: outline[i].paper_heading } : {}),
  }));
}

// Matches [src:section|excerpt] — used per-line for structured parsing
const SRC_MARKER_RE = /\s*\[src:([a-zA-Z]+)\|([^\]]+)\]\s*$/;
// Matches any [src:...] marker anywhere in a string — used for global safety strip
const SRC_MARKER_GLOBAL_RE = /\s*\[src:[a-zA-Z]+\|[^\]]*\]/g;
const BULLET_LINE_RE = /^(\s*)([-*+])\s+(.*)/;

/**
 * Returns true if every bullet line in the markdown ends with a [src:...] marker.
 * Used to decide whether to trigger a repair retry.
 */
export function validateBulletCitations(markdown: string): { valid: boolean; missing: number; total: number } {
  const lines = markdown.split('\n');
  const bulletLines = lines.filter((l) => BULLET_LINE_RE.test(l));
  if (bulletLines.length === 0) return { valid: false, missing: 0, total: 0 };
  const missing = bulletLines.filter((l) => !/\[src:[a-zA-Z]+\|[^\]]+\]/.test(l)).length;
  return { valid: missing === 0, missing, total: bulletLines.length };
}

function parseBulletAnnotations(
  rawMarkdown: string,
  headings?: Sections['headings']
): {
  cleanMarkdown: string;
  bulletSources: BulletSource[];
} {
  const bulletSources: BulletSource[] = [];

  const cleanLines = rawMarkdown.split('\n').map((line) => {
    if (BULLET_LINE_RE.test(line)) {
      const srcMatch = line.match(SRC_MARKER_RE);
      if (srcMatch) {
        const cleanLine = line.replace(SRC_MARKER_RE, '');
        // Capture bullet text from the clean line (marker already stripped)
        const bulletMatch = cleanLine.match(BULLET_LINE_RE);
        const bulletText = bulletMatch ? bulletMatch[3].trim() : '';
        const normalizedSection = srcMatch[1].toLowerCase() as BulletSource['normalizedSection'];
        // Look up the actual paper heading for THIS bullet's section — may differ per bullet
        const paperHeading = headings?.[normalizedSection] ?? undefined;
        bulletSources.push({
          bulletId: bulletText,
          normalizedSection,
          ...(paperHeading ? { paperHeading } : {}),
          // strip surrounding quotes Gemini sometimes adds
          excerpt: srcMatch[2].trim().replace(/^["']|["']$/g, ''),
        });
        return cleanLine;
      }
    }
    return line;
  });

  // Global safety strip: remove any [src:...] markers that survived the per-line pass.
  // This catches markers on continuation lines, non-bullet lines, and edge cases from
  // Gemini formatting variation (multiline bullets, bold labels, escaped newlines, etc.).
  const cleanMarkdown = cleanLines.join('\n').replace(SRC_MARKER_GLOBAL_RE, '');

  return { cleanMarkdown, bulletSources };
}

export function parseMarkdownSlides(markdown: string, headings?: Sections['headings']): Slide[] {
  const blocks = markdown.split(/\n---\n/);

  return blocks.map((block, index) => {
    const titleMatch = block.match(/##\s*(.+)/);
    const timeMatch = block.match(/Estimated Time:\s*([\d.]+)/);

    const title = titleMatch?.[1]?.trim() ?? "Untitled Slide";
    const est_time = timeMatch ? Number(timeMatch[1]) : 2;

    const rawContent = block
      .replace(/##\s*.+\n?/, "")
      .replace(/Estimated Time:\s*[\d.]+.*\n?/, "")
      .trim();

    // Pass headings so each bullet can record its own paperHeading
    const { cleanMarkdown, bulletSources } = parseBulletAnnotations(rawContent, headings);

    return {
      id: `slide-${index}`,
      title,
      est_time,
      contentMarkdown: cleanMarkdown,
      ...(bulletSources.length > 0 ? { bulletSources } : {}),
    };
  });
}

// --- Stage-level exports for SSE streaming route ---
// These expose the individual sub-steps of generateNodes so the API route can
// emit progress events between each Gemini call rather than blocking on all three.

/**
 * Runs SLIDES_PROMPT and checks whether every bullet got an inline [src:...] marker.
 * Returns the raw markdown and whether a repair pass is needed.
 */
export async function generateSlidesMarkdown(
  outline: OutlineItem[],
  sections: Sections,
  config?: PresentationConfig
): Promise<{ markdown: string; citationsValid: boolean }> {
  const sectionsJson = JSON.stringify(sections);
  const promptWithConfig =
    SLIDES_PROMPT(JSON.stringify(outline), sectionsJson, config?.researcherType, config?.presentationSize) +
    (config ? `\nAudience Level: ${config.audienceLevel}` : '');

  const markdown = await geminiText(promptWithConfig);
  if (!markdown) throw new Error('Gemini returned undefined for slides');

  if (process.env.NODE_ENV === 'development') {
    const { valid, missing, total } = validateBulletCitations(markdown);
    console.log(`[generateSlidesMarkdown] length=${markdown.length} bullets=${total} missing=${missing} valid=${valid}`);
  }

  const { valid: citationsValid } = validateBulletCitations(markdown);
  return { markdown, citationsValid };
}

/**
 * Runs REPAIR_SLIDES_PROMPT to add missing [src:...] markers.
 * Falls back to the original markdown if the repair call returns nothing.
 */
export async function repairSlidesMarkdown(
  markdown: string,
  sections: Sections
): Promise<string> {
  const repaired = await geminiText(REPAIR_SLIDES_PROMPT(markdown, JSON.stringify(sections)));
  if (!repaired) {
    console.warn('[repairSlidesMarkdown] Repair returned empty; keeping original markdown');
    return markdown;
  }
  if (process.env.NODE_ENV === 'development') {
    const after = validateBulletCitations(repaired);
    console.log(`[repairSlidesMarkdown] After repair — bullets=${after.total} missing=${after.missing} valid=${after.valid}`);
  }
  return repaired;
}

/**
 * Runs the ATTRIBUTE_SOURCES_PROMPT attribution fallback for any slides that
 * still have no bulletSources after the inline marker pipeline.
 */
export async function runAttributionFallback(
  slides: Slide[],
  sections: Sections
): Promise<Slide[]> {
  const missingAttribution = slides
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.bulletSources?.length);

  if (missingAttribution.length === 0) return slides;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[runAttributionFallback] Running for ${missingAttribution.length} slides without bulletSources`);
  }

  const slidesForAttribution = missingAttribution.map(({ s }) => s);
  const attributions = await attributeBulletSources(slidesForAttribution, sections);

  return slides.map((slide, globalIdx) => {
    const localIdx = missingAttribution.findIndex(({ i }) => i === globalIdx);
    if (localIdx === -1 || (slide.bulletSources?.length ?? 0) > 0) return slide;
    const sources = attributions.get(localIdx);
    return sources?.length ? { ...slide, bulletSources: sources } : slide;
  });
}

// --- Generate Transcript ---
export async function generateTranscript(
  slides: Slide[],
  slideIndex: number,
  config: PresentationConfig
): Promise<string> {
  const prompt = TRANSCRIPT_PROMPT(slides, slideIndex, config.audienceLevel, config.researcherType);
  const transcript = await geminiText(prompt);

  if (!transcript) {
    throw new Error("Gemini returned undefined for transcript");
  }

  return transcript;
}