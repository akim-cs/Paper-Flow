import type { PresentationConfig, Sections, OutlineItem, Slide } from "@/app/types/slides";
import {
  generateSlidesMarkdown,
  repairSlidesMarkdown,
  parseMarkdownSlides,
  runAttributionFallback,
  validateBulletCitations,
} from "@/app/lib/gemini/helpers";

// ─── SSE event shapes ─────────────────────────────────────────────────────────

type StageEvent  = { type: 'stage';  stage: number; label: string };
type DoneEvent   = { type: 'done';   slides: Slide[] };
type ErrorEvent  = { type: 'error';  message: string };
type SseEvent    = StageEvent | DoneEvent | ErrorEvent;

// Stage index constants — these must match GENERATION_STAGES in new/page.tsx
export const STAGE = {
  MARKDOWN:    2,   // Running SLIDES_PROMPT
  REPAIR:      3,   // Running REPAIR_SLIDES_PROMPT (conditional)
  PARSE:       4,   // Parsing markdown → Slide[]
  ATTRIBUTION: 5,   // Running attribution fallback (conditional)
} as const;

/**
 * POST /api/generate-slides
 *
 * Accepts { outline, sections, config } and streams SSE events as each
 * generation stage completes, so the client can show real progress.
 *
 * Stages emitted:
 *   2 — Generating slide content  (SLIDES_PROMPT, always)
 *   3 — Repairing citations       (REPAIR_SLIDES_PROMPT, only if needed)
 *   4 — Building slide nodes      (markdown parse, always)
 *   5 — Matching sources          (attribution fallback, only if needed)
 * Final: { type: 'done', slides } — client should save + navigate
 */
export async function POST(req: Request) {
  let body: { outline?: OutlineItem[]; sections?: Sections; config?: PresentationConfig };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { outline, sections, config } = body;

  if (!outline || !sections) {
    return new Response(JSON.stringify({ error: 'Missing outline or sections' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!config?.audienceLevel || !config?.researcherType) {
    return new Response(JSON.stringify({ error: 'Missing presentation config' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        // ── Stage 2: Generate slide markdown via SLIDES_PROMPT ────────────
        send({ type: 'stage', stage: STAGE.MARKDOWN, label: 'Generating slide content' });

        const { markdown: rawMarkdown, citationsValid } =
          await generateSlidesMarkdown(outline, sections, config);

        let markdown = rawMarkdown;

        // ── Stage 3 (conditional): Repair missing [src:...] markers ──────
        if (!citationsValid) {
          send({ type: 'stage', stage: STAGE.REPAIR, label: 'Repairing citations' });
          markdown = await repairSlidesMarkdown(markdown, sections);
        }

        // ── Stage 4: Parse markdown → Slide[] ─────────────────────────────
        send({ type: 'stage', stage: STAGE.PARSE, label: 'Building slide nodes' });

        let slides = parseMarkdownSlides(markdown, sections.headings);

        // Zip outline metadata (source_section + paper_heading) by position
        slides = slides.map((slide, i) => ({
          ...slide,
          ...(outline[i]?.source_section ? { source_section: outline[i].source_section } : {}),
          ...(outline[i]?.paper_heading  ? { paper_heading:  outline[i].paper_heading  } : {}),
        }));

        if (process.env.NODE_ENV === 'development') {
          slides.forEach((s) =>
            console.log(`[generate-slides] After parse — "${s.title}": ${s.bulletSources?.length ?? 0} bulletSources`)
          );
        }

        // ── Stage 5 (conditional): Attribution fallback ───────────────────
        const needsAttribution = slides.some((s) => !s.bulletSources?.length);
        if (needsAttribution) {
          send({ type: 'stage', stage: STAGE.ATTRIBUTION, label: 'Matching sources' });
          slides = await runAttributionFallback(slides, sections);

          if (process.env.NODE_ENV === 'development') {
            slides.forEach((s) =>
              console.log(`[generate-slides] After attribution — "${s.title}": ${s.bulletSources?.length ?? 0} bulletSources`)
            );
          }
        }

        // ── Done: send final slides ────────────────────────────────────────
        send({ type: 'done', slides });
      } catch (err) {
        console.error('[generate-slides] Pipeline error:', err);
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      // Disable proxy/nginx buffering so events reach the client immediately
      'X-Accel-Buffering': 'no',
    },
  });
}
