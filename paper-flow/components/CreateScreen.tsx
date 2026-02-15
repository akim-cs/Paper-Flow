'use client';

import { useState } from 'react';
import type { Slide, PresentationConfig } from '../app/types/slides';
import UploadScreen from './UploadScreen';
import ConfigScreen from './ConfigScreen';
import SlidesFlow from './SlidesFlow';

/**
 * Holds slides state and decides whether to show the upload screen, config, or the flow.
 * Flow: Upload → Config → Timeline
 */
export default function CreateScreen() {
  const [paperId, setPaperId] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [config, setConfig] = useState<PresentationConfig | null>(null);

  // Step 1: Upload screen
  if (!paperId) {
    return (
      <UploadScreen
        onUploadComplete={(newPaperId: string) => {
          setPaperId(newPaperId);
        }}
      />
    );
  }

  // Step 2: Config screen
  if (!config) {
    return (
      <ConfigScreen
        paperId={paperId}
        onComplete={(userConfig, generatedSlides) => {
          setConfig(userConfig)
          setSlides(generatedSlides);
        }}
      />
    );
  }

  // Step 3: Timeline flow
  return (
    <SlidesFlow
      slides={slides || []}
      onSlidesChange={(newSlides) => setSlides(newSlides)}
    />
  );
}
