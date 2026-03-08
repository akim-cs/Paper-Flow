export type BulletSource = {
  bulletId: string      // exact bullet text at generation time (used as match key at render time)
  normalizedSection: 'abstract' | 'introduction' | 'methodology' | 'results' | 'discussion' | 'conclusion'
  paperHeading?: string // actual section heading from the paper for THIS bullet (may differ across bullets on the same slide)
  excerpt: string       // verbatim quote from the paper for this bullet
  pageNumber?: number   // page number if available from extraction
}

/**
 * One slide from the API (mockSlides.json shape).
 */
export type Slide = {
  id: string
  title: string
  est_time: number
  contentMarkdown: string
  transcript?: string  // Generated spoken transcript
  source_section?: 'abstract' | 'introduction' | 'methodology' | 'results' | 'discussion' | 'conclusion'
  paper_heading?: string  // Actual section heading from the paper (e.g. "PRINCIPLES FOR MIXED-INITIATIVE UI")
  bulletSources?: BulletSource[]
}

/**
 * User-provided presentation configuration.
 */
export type PresentationConfig = {
  audienceLevel: 'beginner' | 'intermediate' | 'expert';
  timeLimit: number; // minutes
  researcherType: 'author' | 'academic';
};

/**
 * Outline structure for Gemini
 */
export interface OutlineItem {
  title: string
  source_section: 'abstract' | 'introduction' | 'methodology' | 'results' | 'discussion' | 'conclusion'
  paper_heading?: string  // Actual section heading from the paper
}

/**
 * Research paper sections
 */
export interface Sections {
  abstract: string
  introduction: string
  methodology: string
  results: string
  discussion: string
  conclusion: string
  headings?: {
    abstract?: string
    introduction?: string
    methodology?: string
    results?: string
    discussion?: string
    conclusion?: string
  }
}