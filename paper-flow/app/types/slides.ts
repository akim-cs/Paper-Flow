/**
 * One slide from the API (mockSlides.json shape).
 */
export type Slide = {
  title: string;
  speaker_notes: string[];
  est_time: number;
};

/**
 * User-provided presentation configuration.
 */
export type PresentationConfig = {
  audienceLevel: 'beginner' | 'intermediate' | 'expert';
  timeLimit: number; // minutes
};
