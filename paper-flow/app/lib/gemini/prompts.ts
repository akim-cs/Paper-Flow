// ============================
// 0) PDF TEXT EXTRACTION PROMPT
// ============================
export const PDF_EXTRACT_PROMPT = `
Extract all readable text from this academic paper PDF.

Rules:
- Preserve reading order.
- Remove headers, footers, page numbers, and watermarks.
- Do NOT summarize, rewrite, or correct grammar.
- Include all tables and figures in text form.
- Output plain text only.
`

// ============================
// 1) SECTION CLASSIFICATION PROMPT
// ============================
export const SECTION_PROMPT = (text: string) => `
You are a strict academic document parser.

Classify the following text into research paper sections:
- abstract
- introduction
- methodology
- results
- discussion
- conclusion

Rules:
- Preserve original text verbatim.
- Do NOT summarize or rewrite.
- If a section is missing, return an empty string.
- Output ONLY valid JSON with keys: abstract, introduction, methodology, results, discussion, conclusion.
- Exclude references, appendix, acknowledgements, funding, ethics statements, and extended derivations.
- Do NOT mention excluded sections.

TEXT:
${text}
`

// ============================
// 2) PRESENTATION OUTLINE PROMPT
// ============================
export const OUTLINE_PROMPT = (sections: string, timeLimit?: number) => {
  const maxSlides = timeLimit ? Math.max(3, Math.floor(timeLimit / 2.5)) : 8;

  return `
You are an expert scientific presenter.

Transform the research paper sections into a logical presentation outline suitable for a talk.

Mapping guidance:
- abstract → hook + overview
- introduction → motivation and background
- methodology → methodology slides
- results → findings slides
- discussion → implications and limitations
- conclusion → wrap-up and future work

Rules:
- CRITICAL: Generate AT MOST ${maxSlides} slides total. This is a strict limit.
- Consolidate related concepts into single slides rather than creating many granular slides.
- Focus on major themes and key takeaways, not every detail.
- Create clear, concise slide topics in logical order.
- Output JSON array of objects with:
  - title
  - source_section (abstract | introduction | methodology | results | discussion | conclusion)
- Do NOT summarize the sections; use only information present.
- Output ONLY JSON.

SECTIONS:
${sections}
`;
};

// ============================
// 3) SLIDE NODE GENERATION PROMPT
// ============================
export const SLIDES_PROMPT = (outline: string, sections: string, timeLimit?: number) => {
  const maxSlides = timeLimit ? Math.max(3, Math.floor(timeLimit / 2.5)) : 8;
  const totalTime = timeLimit || 15;

  return `
You are generating structured presentation slide nodes.

Use the outline and research paper sections to produce slide nodes in this JSON format:

[
  {
    "title": string,
    "speaker_notes": string[],
    "est_time": number
  }
]

Rules:
- CRITICAL: Generate EXACTLY the number of slides in the outline (at most ${maxSlides} slides). Do NOT add extra slides.
- Total presentation time is ${totalTime} minutes. Distribute est_time so slides sum to approximately ${totalTime} minutes.
- Speaker notes must be short bullet points (3-5 bullets per slide), not paragraphs.
- Consolidate information - each slide should cover a major theme, not granular details.
- Include only content present in the paper.
- est_time is the estimated speaking time in minutes.
- Convert equations: inline $...$, display $$...$$. Skip derivations not referenced in the narrative.
- Convert tables to Markdown, keeping alignment and captions. Include only tables referenced in the narrative.
- Replace figures with: ![Figure X: caption].
- Keep in-text citations exactly as written (e.g., [12], (Smith et al., 2023)).
- Exclude references, appendix, acknowledgements, funding, ethics statements, extended derivations.
- Output ONLY valid JSON. Do not include commentary or markdown outside JSON.

OUTLINE:
${outline}

SECTIONS:
${sections}
`;
};