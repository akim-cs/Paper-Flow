/**
 * One slide from the API (mockSlides.json shape).
 */
export type Slide = {
  title: string;
  speaker_notes?: string[];
  est_time: number;
  /** Richtext markdown body (e.g. from MDXEditor in slide node). Optional so we can switch out later*/
  contentMarkdown?: string;
};

/**
 * User-provided presentation configuration.
 */
export type PresentationConfig = {
  audienceLevel: 'beginner' | 'intermediate' | 'expert';
  timeLimit: number; // minutes
};

/**
 * Outline structure for Gemini
 */
export interface OutlineItem {
  title: string
  source_section: 'abstract' | 'introduction' | 'methodology' | 'results' | 'discussion' | 'conclusion'
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
}