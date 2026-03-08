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
- If a section is missing, return an empty string for the text and null for the heading.
- Exclude references, appendix, acknowledgements, funding, ethics statements, and extended derivations.
- Do NOT mention excluded sections.
- Output ONLY valid JSON with these keys:
  - abstract, introduction, methodology, results, discussion, conclusion (section text, verbatim)
  - headings: an object with the same keys, where each value is the EXACT heading string as it appears in the paper (e.g. "3. PRINCIPLES FOR MIXED-INITIATIVE UI", "Results and Discussion", "2.1 Methodology"). Use null if the section is absent or has no explicit heading.

Example output shape:
{
  "abstract": "...",
  "introduction": "...",
  "methodology": "...",
  "results": "...",
  "discussion": "...",
  "conclusion": "...",
  "headings": {
    "abstract": "Abstract",
    "introduction": "1. Introduction",
    "methodology": "3. System Design",
    "results": "4. Evaluation",
    "discussion": "5. Discussion",
    "conclusion": "6. Conclusion"
  }
}

TEXT:
${text}
`

// ============================
// 2) PRESENTATION OUTLINE PROMPT
// ============================
export const OUTLINE_PROMPT = (sections: string, timeLimit?: number, researcherType?: 'author' | 'academic') => {
  const maxSlides = timeLimit ? Math.max(3, Math.floor(timeLimit / 2.5)) : 8;

  const perspectiveNote = researcherType === 'author'
    ? `NOTE: The presenter is the AUTHOR of this research. Frame slides around first-person narrative.`
    : researcherType === 'academic'
    ? `NOTE: The presenter is an ACADEMIC presenting others' research. Frame slides for third-person analysis.`
    : '';

  return `
You are an expert scientific presenter.

${perspectiveNote}

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
  - paper_heading: the exact heading string from sections.headings[source_section]; omit the field if headings is absent or the heading is null
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
  timeLimit?: number,
  researcherType?: 'author' | 'academic'
) => {
  const maxSlides = timeLimit ? Math.max(3, Math.floor(timeLimit / 2.5)) : 8;
  const totalTime = timeLimit || 15;

  const perspectiveGuidance = researcherType === 'author'
    ? `PRESENTER PERSPECTIVE: You are the AUTHOR presenting your own work.
       - Frame content as YOUR research and YOUR findings
       - Focus on rationale behind methodological choices
       - Structure should support first-person delivery ("we found", "our approach")`
    : researcherType === 'academic'
    ? `PRESENTER PERSPECTIVE: You are an ACADEMIC presenting someone else's research.
       - Frame content for third-person delivery ("the authors found", "this study")
       - Focus on critical analysis and interpretation
       - Include contextual framing within the broader field`
    : '';

  return `
You are generating structured presentation slides in Markdown.

${perspectiveGuidance}

════════════════════════════════════════════════════════
⚠️  MANDATORY CITATION RULE — THIS IS THE MOST IMPORTANT REQUIREMENT
════════════════════════════════════════════════════════
EVERY bullet line (any line starting with -, *, or +, including sub-bullets) MUST end with:
  [src:section_name|verbatim excerpt]

Rules:
- section_name must be one of: abstract, introduction, methodology, results, discussion, conclusion
- section_name must match where the excerpt ACTUALLY lives in the paper (different bullets on the same slide WILL have different section_names)
- The excerpt MUST be copied verbatim from the SECTIONS below — never paraphrase
- Maximum excerpt length: 120 characters
- The marker must appear at the END of the bullet line, before the newline
- Sub-bullets require citations too
- Only non-bullet lines (headings ### or plain text) are exempt

VALID ✓ (all bullets cited, including sub-bullets):
- The system processes 10,000 queries per second [src:results|the system processes 10,000 queries per second at peak load]
  - Throughput improved 3× over the baseline [src:results|throughput improved 3× over the baseline system]
- Participants rated usability 4.7/5 [src:methodology|participants rated usability on a 5-point Likert scale]

INVALID ✗ (missing citations — output like this will be REJECTED and retried):
- The system processes 10,000 queries per second
  - Throughput improved 3× over the baseline
- Participants rated usability 4.7/5

If a bullet lacks a [src:...] marker, your output is malformed. Every bullet. No exceptions.
════════════════════════════════════════════════════════

CRITICAL RULES:
- Generate EXACTLY the number of slides in the outline (maximum ${maxSlides}).
- Total presentation time: ${totalTime} minutes.
- Distribute time approximately evenly across slides.
- Include ONLY content present in the provided paper sections.
- Exclude references, appendix, acknowledgements, funding, ethics statements.
- Output ONLY Markdown.
- Separate slides using: --- (horizontal rule)

FORMAT EACH SLIDE EXACTLY LIKE THIS:

## Slide Title
Estimated Time: X minutes

- Bullet with citation [src:section|verbatim excerpt]
  - Sub-bullet with citation [src:section|verbatim excerpt]
- Another bullet [src:section|verbatim excerpt]

FINAL CHECK (do this before outputting):
Scan every line. Count bullet lines (starting with -, *, or +). Verify each one ends with [src:section|...]. If any are missing, add them before outputting.

---

OUTLINE:
${outline}

SECTIONS:
${sections}
`;
};

// ============================
// 3b) CITATION REPAIR PROMPT
// ============================
// Used when generated markdown has bullets missing [src:...] markers.
// Takes the broken markdown and repairs ONLY the missing citations in-place.
export const REPAIR_SLIDES_PROMPT = (brokenMarkdown: string, sections: string) => `
The following slide markdown is missing [src:section|excerpt] citation markers on some bullet lines.

YOUR ONLY TASK: add the missing [src:...] markers to every bullet line that currently lacks one.

Rules:
- Format: [src:section_name|verbatim excerpt up to 120 characters]
- section_name must be one of: abstract, introduction, methodology, results, discussion, conclusion
- The excerpt MUST be verbatim text from the PAPER SECTIONS provided below — never paraphrase
- Place the marker at the END of the bullet line
- Do NOT change any other text, formatting, slide titles, or structure
- Sub-bullets also need citations if missing
- Output ONLY the corrected markdown — no explanation, no code fences

BROKEN MARKDOWN:
${brokenMarkdown}

PAPER SECTIONS (cite verbatim from this text):
${sections}
`;

// ============================
// 3c) BULLET-SOURCE ATTRIBUTION PROMPT
// ============================
// Fallback: used after generation when bulletSources are still missing.
// Asks the model to produce structured JSON mapping bullet texts to verbatim
// paper excerpts. This is a simpler retrieval task and more reliable than
// inline marker generation.
export const ATTRIBUTE_SOURCES_PROMPT = (
  slides: Array<{ index: number; title: string; bullets: string[] }>,
  sectionText: string
) => `
You are matching presentation slide bullets to verbatim source text in a research paper.

For each bullet listed below, find the section of the paper and a short verbatim excerpt that best supports that bullet's claim.

Output ONLY valid JSON — no code fences, no explanation, nothing else:
[
  {
    "slideIndex": 0,
    "bulletId": "the exact bullet text as given",
    "normalizedSection": "abstract|introduction|methodology|results|discussion|conclusion",
    "excerpt": "verbatim excerpt from the paper, max 120 characters"
  }
]

Rules:
- Only include entries where you can find a clear verbatim match in the paper
- normalizedSection MUST reflect where the excerpt actually appears in the paper
- The excerpt MUST be copied verbatim — never paraphrase
- bulletId MUST be the exact string from the bullet list below — copy it character-for-character
- Skip bullets for which no clear source exists

SLIDE BULLETS:
${JSON.stringify(slides, null, 2)}

PAPER SECTIONS:
${sectionText}
`;

// ============================
// 4) TRANSCRIPT GENERATION PROMPT
// ============================
export const TRANSCRIPT_PROMPT = (
  slides: Array<{ id: string; title: string; est_time: number; contentMarkdown: string; transcript?: string }>,
  slideIndex: number,
  audienceLevel: 'beginner' | 'intermediate' | 'expert',
  timeLimit: number,
  researcherType: 'author' | 'academic'
) => {
  const currentSlide = slides[slideIndex];
  const isFirst = slideIndex === 0;
  const isLast = slideIndex === slides.length - 1;

  const perspectiveInstructions = researcherType === 'author'
    ? `AUTHOR PERSPECTIVE:
       - ALWAYS use first-person pronouns: "we", "our", "I"
       - Examples: "We hypothesized...", "Our findings show...", "I want to highlight..."
       - Share insights: "When we designed this experiment..."
       - Express ownership: "Our approach differs from previous work..."
       - Include decision rationale: "We chose this method because..."`
    : `ACADEMIC PERSPECTIVE:
       - ALWAYS use third-person pronouns: "the authors", "the researchers", "they"
       - Examples: "The authors hypothesized...", "This study found...", "They designed..."
       - Critical analysis: "This work contributes by..."
       - Comparative framing: "Unlike previous research..."
       - Objective interpretation: "The data suggests..."`;

  return `# ROLE
You are a professional speechwriter specializing in scientific communication. Your task is to transform structured slide JSON into a natural, spoken presentation transcript.

${perspectiveInstructions}

# DYNAMIC INPUTS
- Audience Level: ${audienceLevel}
- Total Time Limit: ${timeLimit} minutes

# PRESENTATION CONTEXT

You are generating a transcript for slide ${slideIndex + 1} of ${slides.length}.

${isFirst
  ? "This is the FIRST slide - it should serve as an introduction to the presentation."
  : isLast
    ? "This is the FINAL slide - it should provide a conclusion and wrap up the presentation."
    : "This is a MIDDLE slide - it must bridge from the previous content to the current topic."}

## All Slides in Presentation (for context):
${slides.map((s, i) => `
${i + 1}. ${s.title} (${s.est_time} min)
   ${i === slideIndex ? '👉 GENERATE TRANSCRIPT FOR THIS SLIDE' : ''}
   Content: ${s.contentMarkdown.substring(0, 200)}${s.contentMarkdown.length > 200 ? '...' : ''}
`).join('\n')}

## Previously Covered Topics:
${slideIndex > 0
  ? slides.slice(0, slideIndex).map((s, i) => `- Slide ${i + 1}: ${s.title}`).join('\n')
  : "None - this is the opening slide"}

## Upcoming Topics:
${slideIndex < slides.length - 1
  ? slides.slice(slideIndex + 1).map((s, i) => `- Slide ${slideIndex + i + 2}: ${s.title}`).join('\n')
  : "None - this is the concluding slide"}

# AUDIENCE ADAPTATION RULES
1. BEGINNER:
   - Focus: Narrative and "The Big Picture."
   - Style: Use relatable analogies (e.g., compare neurons to "mini-computers").
   - Constraints: Define every technical term (e.g., explain 'salinity' or 'decentralized'). Use 130 words per minute.
2. INTERMEDIATE:
   - Focus: Process and Relationship between facts.
   - Style: Professional and balanced.
   - Constraints: Use standard technical terms but provide brief context. Focus on the "How." Use 140 words per minute.
3. EXPERT:
   - Focus: Methodology, Statistical Rigor, and Theoretical Implications.
   - Style: Academic and dense.
   - Constraints: Use high-level jargon (e.g., "brachial plexus," "chemoreceptors") without over-explaining. Discuss p-values and specific data points. Use 150 words per minute.

# TRANSCRIPT LOGIC
1. WORD COUNT TARGET: Calculate length as (est_time * [WPM based on Audience Level]). DO NOT under-write; expand the narrative to fill the time.
2. BRIDGE SENTENCES: ${isFirst ? "This is the first slide - introduce the presentation WITHOUT referencing a previous slide." : "You MUST begin with a transition sentence connecting the previous slide's content to this new topic. Reference what was just discussed."}
3. DATA INTEGRITY: You MUST include every specific number, percentage, and unit (e.g., 18°C, 22.7%, p < 0.05) found in the 'contentMarkdown'.
4. VERBAL SIGNPOSTS: Use phrases like "Moving to the next slide," "As you can see in the data," and "In conclusion."
5. VOICE: ${researcherType === 'author' ? 'Always write in the first-person ("We found," "I observed").' : 'Always write in the third-person ("The authors found," "The study observed").'}

# OUTPUT FORMAT
Generate a transcript for the current slide ONLY:

## ${currentSlide.title}
(Time: ${currentSlide.est_time} minutes | Audience: ${audienceLevel})

[Natural Paragraph Transcript]

# CURRENT SLIDE TO GENERATE TRANSCRIPT FOR

${JSON.stringify(currentSlide, null, 2)}
`;
};