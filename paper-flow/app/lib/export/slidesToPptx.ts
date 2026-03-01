import PptxGenJS from 'pptxgenjs';
import { lexer } from 'marked';
import type { Slide } from '@/app/types/slides';
import type { Token } from 'marked';

const SLIDE_WIDTH = 10;
const SLIDE_HEIGHT = 5.625;
const MARGIN = 0.5;
const CONTENT_WIDTH = SLIDE_WIDTH - 2 * MARGIN;
const CONTENT_LEFT = MARGIN;
const TITLE_TOP = 0.4;
const TITLE_FONT_SIZE = 24;
const BODY_FONT_SIZE = 14;
const LINE_HEIGHT_BODY = 0.22;
const GAP = 0.15;
/** Approximate chars per line at body font size for our content width (9") */
const CHARS_PER_LINE_BODY = 85;
const MIN_TEXT_HEIGHT = 0.28;

/**
 * Strip common markdown/citation residuals so they don't appear as literal text in the slide.
 */
function cleanMarkdownResiduals(text: string): string {
  let s = text;
  // Bold: **text** or __text__ -> text
  s = s.replace(/\*\*([^*]*)\*\*/g, '$1').replace(/__([^_]*)__/g, '$1');
  // Italic: *text* or _text_ (single) -> text (run after bold so ** is already gone)
  s = s.replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1');
  // Citation/reference: \[anything] -> remove
  s = s.replace(/\\\[[^\]]*\]/g, '');
  // LaTeX-style: \circ -> degree symbol
  s = s.replace(/\\circ/g, '°');
  // Inline math / superscript: ($18^\circ C$) -> 18°C, ($...$) -> strip $ and simplify
  s = s.replace(/\$[^$]*\$/g, (match) => {
    const inner = match.slice(1, -1).replace(/\\circ/g, '°').replace(/\^/g, '').trim();
    return inner || '';
  });
  // Leading sub-bullet asterisk: " * " at start of line (from nested list in markdown)
  s = s.replace(/^\s*\*\s+/gm, '');
  // Trim each line and collapse repeated spaces
  s = s
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .join('\n')
    .trim();
  return s;
}

/**
 * Convert marked inline tokens to PptxGenJS text runs (for bold/italic).
 */
function inlineTokensToRuns(tokens: Token[]): PptxGenJS.TextProps[] {
  const runs: PptxGenJS.TextProps[] = [];
  for (const t of tokens) {
    const token = t as Token & { text: string; tokens?: Token[] };
    if (token.type === 'strong') {
      runs.push({ text: cleanMarkdownResiduals(token.text), options: { bold: true } });
    } else if (token.type === 'em') {
      runs.push({ text: cleanMarkdownResiduals(token.text), options: { italic: true } });
    } else if (token.type === 'text' || token.type === 'escape') {
      const txt = token.type === 'text' ? (token as Token & { text: string }).text : (token as Token & { text: string }).text;
      if (txt) runs.push({ text: cleanMarkdownResiduals(txt) });
    } else if (token.type === 'link') {
      const link = token as Token & { text: string };
      runs.push({ text: cleanMarkdownResiduals(link.text) });
    } else if (token.type === 'codespan') {
      const code = token as Token & { text: string };
      runs.push({ text: code.text });
    } else if (token.tokens && token.tokens.length > 0) {
      runs.push(...inlineTokensToRuns(token.tokens));
    }
  }
  return runs;
}

/**
 * Get plain or rich text for slide: use inline tokens when available, else cleaned string.
 */
function toSlideText(
  raw: string,
  inlineTokens?: Token[]
): string | PptxGenJS.TextProps[] {
  const cleaned = cleanMarkdownResiduals(raw);
  if (inlineTokens && inlineTokens.length > 0) {
    const runs = inlineTokensToRuns(inlineTokens);
    if (runs.length === 0) return cleaned;
    if (runs.length === 1 && !runs[0].options) return (runs[0].text ?? cleaned);
    return runs;
  }
  return cleaned;
}

/**
 * Estimate how many lines the text will wrap to, then return height in inches.
 */
function estimateTextHeight(text: string, fontSize: number = BODY_FONT_SIZE): number {
  const charsPerLine =
    fontSize <= 12 ? 100 : fontSize <= 14 ? CHARS_PER_LINE_BODY : fontSize <= 18 ? 55 : 40;
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  const lineH = fontSize <= 12 ? 0.18 : fontSize <= 14 ? LINE_HEIGHT_BODY : 0.28;
  return Math.max(MIN_TEXT_HEIGHT, lines * lineH);
}

/**
 * Add content from marked tokens to a slide. Uses simple vertical layout.
 */
function addMarkdownContentToSlide(
  slide: PptxGenJS.Slide,
  markdown: string,
  startY: number
): number {
  if (!markdown.trim()) return startY;
  const tokens = lexer(markdown) as Token[];
  let y = startY;

  for (const token of tokens) {
    if (token.type === 'heading') {
      const heading = token as Token & { depth: number; text: string; tokens?: Token[] };
      const fontSize = heading.depth === 1 ? 20 : heading.depth === 2 ? 16 : 14;
      const content = toSlideText(heading.text, heading.tokens);
      slide.addText(content, {
        x: CONTENT_LEFT,
        y,
        w: CONTENT_WIDTH,
        h: 0.35,
        fontSize,
        bold: true,
      });
      y += 0.4;
    } else if (token.type === 'paragraph') {
      const para = token as Token & { text: string; tokens?: Token[] };
      const hasImage = para.tokens?.some((t) => t.type === 'image');
      if (hasImage && para.tokens) {
        for (const t of para.tokens) {
          if (t.type === 'image') {
            const img = t as Token & { href: string; text: string };
            slide.addImage({
              path: img.href,
              x: CONTENT_LEFT,
              y,
              w: Math.min(4, CONTENT_WIDTH),
              h: 2.5,
              altText: img.text || 'Image',
            });
            y += 2.6;
          } else if (t.type === 'text') {
            const textToken = t as Token & { text: string };
            if (textToken.text.trim()) {
              const plain = cleanMarkdownResiduals(textToken.text);
              const h = estimateTextHeight(plain);
              slide.addText(plain, {
                x: CONTENT_LEFT,
                y,
                w: CONTENT_WIDTH,
                h,
                fontSize: BODY_FONT_SIZE,
              });
              y += h + GAP;
            }
          }
        }
      } else {
        const content = toSlideText(para.text, para.tokens);
        const str = typeof content === 'string' ? content : content.map((r) => (r as { text?: string }).text ?? '').join('');
        if (!str.trim()) continue;
        const h = estimateTextHeight(str);
        slide.addText(content, {
          x: CONTENT_LEFT,
          y,
          w: CONTENT_WIDTH,
          h,
          fontSize: BODY_FONT_SIZE,
        });
        y += h + GAP;
      }
    } else if (token.type === 'list') {
      const list = token as Token & { items: Array<{ text: string; tokens?: Token[] }> };
      for (const item of list.items) {
        const raw = (item as { text: string; tokens?: Token[] }).text.trim();
        if (!raw) continue;
        const inlineTokens = (item as { tokens?: Token[] }).tokens?.[0] as (Token & { tokens?: Token[] }) | undefined;
        const itemInline = inlineTokens?.type === 'paragraph' ? inlineTokens.tokens : undefined;
        const content = toSlideText(raw, itemInline);
        const str = typeof content === 'string' ? content : content.map((r) => r.text).join('');
        const h = estimateTextHeight(str);
        slide.addText(content, {
          x: CONTENT_LEFT,
          y,
          w: CONTENT_WIDTH,
          h,
          fontSize: BODY_FONT_SIZE,
          bullet: true,
        });
        y += h + 0.08;
      }
      y += GAP;
    } else if (token.type === 'code') {
      const code = token as Token & { text: string };
      const codeLines = code.text.split(/\r?\n/).length;
      const codeH = Math.max(0.4, codeLines * 0.22);
      slide.addText(code.text, {
        x: CONTENT_LEFT,
        y,
        w: CONTENT_WIDTH,
        h: codeH,
        fontSize: 12,
        fontFace: 'Consolas',
      });
      y += codeH + GAP;
    } else if (token.type === 'hr') {
      y += 0.2;
    }
    if (y > SLIDE_HEIGHT - MARGIN) break;
  }
  return y;
}

/**
 * Build a PptxGenJS presentation from slides. Does not trigger download.
 */
export function buildPptxFromSlides(slides: Slide[], title?: string): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.title = title ?? 'Paper Flow';
  pptx.author = 'Paper Flow';
  pptx.layout = 'LAYOUT_16x9';

  for (const slideData of slides) {
    const slide = pptx.addSlide();

    let y = TITLE_TOP;

    slide.addText(cleanMarkdownResiduals(slideData.title), {
      x: CONTENT_LEFT,
      y,
      w: CONTENT_WIDTH,
      h: 0.5,
      fontSize: TITLE_FONT_SIZE,
      bold: true,
    });
    y += 0.55;

    if (slideData.est_time > 0) {
      slide.addText(`${slideData.est_time} min`, {
        x: CONTENT_LEFT,
        y,
        w: CONTENT_WIDTH,
        h: 0.25,
        fontSize: 11,
        color: '666666',
      });
      y += 0.35;
    }

    y = addMarkdownContentToSlide(slide, slideData.contentMarkdown, y);
  }

  return pptx;
}

const DEFAULT_FILE_NAME = 'PaperFlow.pptx';

/**
 * Build a .pptx from the given slides and trigger a browser download.
 */
export function downloadSlidesAsPptx(
  slides: Slide[],
  fileName: string = DEFAULT_FILE_NAME
): void {
  if (slides.length === 0) return;
  const pptx = buildPptxFromSlides(slides);
  pptx.writeFile({ fileName });
}
