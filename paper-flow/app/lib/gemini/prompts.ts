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
export const SLIDES_PROMPT = (
  outline: string,
  sections: string,
  timeLimit?: number
) => {
  const maxSlides = timeLimit ? Math.max(3, Math.floor(timeLimit / 2.5)) : 8;
  const totalTime = timeLimit || 15;

  return `
You are generating structured presentation slides in Markdown.

CRITICAL RULES:
- Generate EXACTLY the number of slides in the outline (maximum ${maxSlides}).
- Total presentation time: ${totalTime} minutes.
- Distribute time approximately evenly across slides.
- Include ONLY content present in the provided paper sections.
- Keep citations exactly as written.
- Exclude references, appendix, acknowledgements, funding, ethics statements.
- Output ONLY Markdown.
- Separate slides using: --- (horizontal rule)

FORMAT EACH SLIDE EXACTLY LIKE THIS:

## Slide Title
Estimated Time: X minutes

Use clean Markdown hierarchy:
- Bullet points
- Sub-bullets where helpful
- Bold key terms
- Short structured sections if helpful (### Subheading)

---

OUTLINE:
${outline}

SECTIONS:
${sections}
`;
};