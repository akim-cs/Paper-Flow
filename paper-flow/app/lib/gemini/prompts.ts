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