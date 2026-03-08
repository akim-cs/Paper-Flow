'use client';

import { useMemo } from 'react';
import TranscriptEditor from './TranscriptEditor';

type TranscriptWithTimestampsProps = {
  transcript: string;
  onTranscriptChange: (transcript: string) => void;
  wordsPerMinute: number;
  className?: string;
};

/**
 * Calculates timestamp markers based on word count and WPM.
 * Returns array of { time: string, wordIndex: number }
 */
function calculateTimestamps(text: string, wpm: number, intervalSeconds: number = 15) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const wordsPerSecond = wpm / 60;
  const wordsPerInterval = wordsPerSecond * intervalSeconds;

  const timestamps: { time: string; wordIndex: number }[] = [];

  for (let wordIdx = 0; wordIdx < totalWords; wordIdx += wordsPerInterval) {
    const seconds = Math.floor(wordIdx / wordsPerSecond);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeStr = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;

    timestamps.push({
      time: timeStr,
      wordIndex: Math.floor(wordIdx),
    });
  }

  return timestamps;
}

/**
 * Estimates line/paragraph positions for timestamp placement.
 * Returns percentage positions (0-100) based on word distribution.
 */
function estimateTimestampPositions(
  text: string,
  timestamps: { time: string; wordIndex: number }[]
): { time: string; position: number }[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  if (totalWords === 0) return [];

  return timestamps.map(({ time, wordIndex }) => ({
    time,
    position: (wordIndex / totalWords) * 100,
  }));
}

export default function TranscriptWithTimestamps({
  transcript,
  onTranscriptChange,
  wordsPerMinute,
  className = '',
}: TranscriptWithTimestampsProps) {
  const timestampMarkers = useMemo(() => {
    if (!transcript || transcript.trim().length === 0) return [];

    const timestamps = calculateTimestamps(transcript, wordsPerMinute, 15);
    return estimateTimestampPositions(transcript, timestamps);
  }, [transcript, wordsPerMinute]);

  return (
    <div className={`relative ${className}`}>
      {/* Timestamp margin */}
      <div className="absolute left-0 top-0 bottom-0 w-12 pointer-events-none z-10">
        {timestampMarkers.map((marker, idx) => (
          <div
            key={idx}
            className="absolute left-0 text-[10px] font-mono text-paper-flow-border/70 font-medium"
            style={{
              top: `${marker.position}%`,
              transform: 'translateY(-50%)',
            }}
            title={`Estimated timestamp at ${marker.time}`}
          >
            {marker.time}
          </div>
        ))}
      </div>

      {/* Editor with left padding for timestamp margin */}
      <div className="pl-14">
        <TranscriptEditor
          transcript={transcript}
          onTranscriptChange={onTranscriptChange}
        />
      </div>
    </div>
  );
}
