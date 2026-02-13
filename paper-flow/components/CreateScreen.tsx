'use client';

import { useState } from 'react';
import type { Slide } from '../app/types/slides';
import UploadScreen from './UploadScreen'
import SlidesFlow from './SlidesFlow';

/**
 * Holds slides state and decides whether to show the upload screen or the flow.
 */
export default function CreateScreen() {

  // Master state to handle the current slides state
  const [slides, setSlides] = useState<Slide[] | null>(null);

  // If no slides have been parsed from a research paper, show upload
  // to start parsing process
  if (slides === null) {
    return (
      <UploadScreen
        onUploadComplete={(newSlides) => {
          setSlides(newSlides);
        }}
      />
    );
  }

  // If slides have been parsed from a research paper,
  // render the React Flow ordering
  return (
    <SlidesFlow
      slides={slides}
      onSlidesChange={(newSlides) => setSlides(newSlides)}
    />
  );
}
