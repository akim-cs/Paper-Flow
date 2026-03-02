/**
 * One slide from the API (mockSlides.json shape).
 */
export type Slide = {
  id: string
  title: string
  est_time: number
  contentMarkdown: string
  transcript?: string  // Generated spoken transcript
}

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