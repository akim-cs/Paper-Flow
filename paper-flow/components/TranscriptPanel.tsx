'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { paperFlowTheme as theme } from '../app/lib/theme';
import type { Slide, PresentationConfig, Sections } from '../app/types/slides';

const WPM: Record<PresentationConfig['audienceLevel'], number> = {
  beginner: 130,
  intermediate: 140,
  expert: 150,
};

type TranscriptPanelProps = {
  isOpen: boolean;
  slides: Slide[];
  activeSlideId: string | null;
  generatingSlideId: string | null;
  onSelectSlide: (slideId: string) => void;
  onGenerateTranscript: (slideId: string) => void;
  onClose: () => void;
  onUpdateEstTime: (slideId: string, estTime: number) => void;
  config: PresentationConfig;
  sections?: Sections;
};

const SOURCE_SECTION_LABELS: Record<string, string> = {
  abstract: 'Abstract',
  introduction: 'Introduction',
  methodology: 'Methodology',
  results: 'Results',
  discussion: 'Discussion',
  conclusion: 'Conclusion',
};

const SOURCE_SECTION_STYLES: Record<string, { bg: string; text: string; border: string; headerBg: string }> = {
  abstract:     { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   headerBg: 'bg-rose-100' },
  introduction: { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200',    headerBg: 'bg-sky-100' },
  methodology:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  headerBg: 'bg-amber-100' },
  results:      { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  headerBg: 'bg-green-100' },
  discussion:   { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', headerBg: 'bg-violet-100' },
  conclusion:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   headerBg: 'bg-teal-100' },
};

export default function TranscriptPanel({
  isOpen,
  slides,
  activeSlideId,
  generatingSlideId,
  onSelectSlide,
  onGenerateTranscript,
  onClose,
  onUpdateEstTime,
  config,
  sections,
}: TranscriptPanelProps) {
  const [width, setWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Local est_time slider state — synced from the active slide
  const activeSlideEstTime = slides.find((s) => s.id === activeSlideId)?.est_time ?? 2;
  const [sliderEstTime, setSliderEstTime] = useState<number>(activeSlideEstTime);

  useEffect(() => {
    setSliderEstTime(activeSlideEstTime);
  }, [activeSlideId, activeSlideEstTime]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      // Constrain width between 400px and 80% of viewport
      const minWidth = 400;
      const maxWidth = window.innerWidth * 0.8;
      setWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!isOpen) return null;

  const activeSlide = slides.find((s) => s.id === activeSlideId);
  const hasTranscript = activeSlide?.transcript && activeSlide.transcript.length > 0;
  const isGenerating = generatingSlideId === activeSlideId;

  const sourceSection = activeSlide?.source_section;
  const paperHeading = activeSlide?.paper_heading;
  const sourceText = sourceSection && sections ? sections[sourceSection] : null;
  const sourceStyle = sourceSection ? (SOURCE_SECTION_STYLES[sourceSection] ?? { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', headerBg: 'bg-zinc-100' }) : null;

  return (
    <div
      ref={panelRef}
      className="fixed top-0 right-0 h-full bg-white border-l border-paper-flow-border shadow-2xl z-50 overflow-hidden flex animate-slide-in"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-paper-flow-border transition-colors ${
          isResizing ? 'bg-paper-flow-border' : 'bg-transparent'
        }`}
        title="Drag to resize"
      />
      {/* Slide List Sidebar */}
      <div className="w-[180px] border-r border-paper-flow-border flex flex-col flex-shrink-0">
        {/* Sidebar Header */}
        <div className={`p-3 ${theme.expandedBorder} border-b`}>
          <h3 className={`text-sm font-semibold ${theme.titleText}`}>Slides</h3>
        </div>

        {/* Slide List */}
        <div className="flex-1 overflow-y-auto">
          {slides.map((slide, index) => {
            const hasSlideTranscript = slide.transcript && slide.transcript.length > 0;
            const isActive = slide.id === activeSlideId;
            const isSlideGenerating = generatingSlideId === slide.id;

            return (
              <button
                key={slide.id}
                onClick={() => onSelectSlide(slide.id)}
                className={`w-full text-left px-3 py-2 border-b border-paper-flow-border/30 transition-colors ${
                  isActive
                    ? 'bg-paper-flow-border/20'
                    : 'hover:bg-paper-flow-border/10'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`text-xs mt-0.5 ${theme.secondaryText} flex-shrink-0`}>
                    {hasSlideTranscript ? '●' : '○'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${theme.titleText} truncate`}>
                      {index + 1}. {slide.title || 'Untitled'}
                    </p>
                    {isSlideGenerating && (
                      <p className={`text-xs ${theme.secondaryTextAlt} mt-0.5`}>
                        Generating...
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`p-4 ${theme.expandedBorder} border-b`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h2 className={`text-lg font-semibold ${theme.titleText} mb-1`}>Transcript</h2>
              {activeSlide && (
                <p className={`text-sm ${theme.secondaryText} truncate`}>{activeSlide.title}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className={`text-2xl ${theme.secondaryText} hover:opacity-80 hover:text-red-600 font-medium w-8 h-8 rounded flex items-center justify-center border border-transparent hover:border-current flex-shrink-0 ml-2`}
              title="Close transcript panel"
              aria-label="Close transcript panel"
            >
              ×
            </button>
          </div>
          {activeSlide && (() => {
            const wpm = WPM[config.audienceLevel];
            const targetWords = Math.round(sliderEstTime * wpm);
            const actualWords = activeSlide.transcript
              ? activeSlide.transcript.trim().split(/\s+/).filter(Boolean).length
              : null;
            const actualMinutes = actualWords ? (actualWords / wpm).toFixed(1) : null;
            const sliderChanged = sliderEstTime !== activeSlide.est_time;
            return (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-xs font-medium ${theme.secondaryText}`}>
                    Target speaking time
                  </label>
                  <span className={`text-xs font-semibold ${theme.titleText}`}>
                    {sliderEstTime % 1 === 0
                      ? `${sliderEstTime} min`
                      : `${Math.floor(sliderEstTime)} min ${Math.round((sliderEstTime % 1) * 60)} sec`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={5}
                  step={0.25}
                  value={sliderEstTime}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSliderEstTime(val);
                    onUpdateEstTime(activeSlide.id, val);
                  }}
                  className="w-full accent-paper-flow-border"
                />
                <div className={`flex items-center justify-between mt-1 text-xs ${theme.secondaryTextAlt}`}>
                  <span>~{targetWords} words target</span>
                  {actualWords !== null && (
                    <span className={sliderChanged ? 'opacity-50' : ''}>
                      actual: {actualWords} words (~{actualMinutes} min)
                    </span>
                  )}
                </div>
                {sliderChanged && (
                  <p className={`text-xs mt-1 ${theme.secondaryTextAlt} italic`}>
                    Regenerate transcript to apply new timing
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!activeSlide ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className={`text-sm ${theme.secondaryText} text-center`}>
                Select a slide from the list to view or generate its transcript
              </p>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-paper-flow-border"></div>
              <p className={`text-sm ${theme.secondaryText}`}>Generating transcript...</p>
            </div>
          ) : hasTranscript ? (
            <>
              <div className={`prose prose-sm max-w-none ${theme.titleText}`}>
                {activeSlide.transcript!.split('\n---\n').map((section, idx) => (
                  <div key={idx} className="mb-6">
                    {section.split('\n').map((line, lineIdx) => {
                      // Title lines starting with ##
                      if (line.startsWith('##')) {
                        return (
                          <h3 key={lineIdx} className="text-base font-semibold mb-2 mt-4">
                            {line.replace(/^##\s*/, '')}
                          </h3>
                        );
                      }
                      // Time/audience metadata
                      if (line.startsWith('(Time:')) {
                        return (
                          <p key={lineIdx} className={`text-xs ${theme.secondaryTextAlt} mb-3`}>
                            {line}
                          </p>
                        );
                      }
                      // Regular paragraph text
                      if (line.trim()) {
                        return (
                          <p key={lineIdx} className="mb-3 leading-relaxed">
                            {line}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                ))}
              </div>

              {/* Regenerate Button */}
              <div className="mt-6 pt-4 border-t border-paper-flow-border">
                <button
                  onClick={() => onGenerateTranscript(activeSlide.id)}
                  className="w-full px-4 py-2.5 rounded-lg bg-paper-flow-border text-white hover:bg-paper-flow-text transition-all text-sm font-medium shadow-sm hover:shadow-md"
                >
                  Regenerate Transcript
                </button>
              </div>

              {/* Paper Source Section */}
              {sourceSection && sourceStyle && (
                <div className={`mt-4 rounded-lg border ${sourceStyle.border} overflow-hidden`}>
                  <button
                    onClick={() => setSourceExpanded((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left ${sourceStyle.headerBg} ${sourceStyle.text} font-medium text-sm transition-colors`}
                  >
                    <span className="flex flex-col items-start gap-0.5">
                      <span>Paper Source: <span className="capitalize">{SOURCE_SECTION_LABELS[sourceSection] ?? sourceSection}</span></span>
                      {paperHeading && (
                        <span className="text-[11px] font-normal opacity-75 leading-tight">{paperHeading}</span>
                      )}
                    </span>
                    <span className="text-xs ml-2">{sourceExpanded ? '▲' : '▼'}</span>
                  </button>
                  {sourceExpanded && (
                    <div className={`${sourceStyle.bg} px-4 py-3 max-h-64 overflow-y-auto`}>
                      {sourceText ? (
                        <p className={`text-xs leading-relaxed whitespace-pre-wrap ${sourceStyle.text} opacity-90`}>
                          {sourceText}
                        </p>
                      ) : (
                        <p className={`text-xs italic ${sourceStyle.text} opacity-70`}>
                          Source text not available for this project.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className={`text-sm ${theme.secondaryText} text-center mb-2`}>
                No transcript generated yet
              </p>
              <button
                onClick={() => onGenerateTranscript(activeSlide.id)}
                className="px-6 py-3 rounded-lg bg-paper-flow-border text-white hover:bg-paper-flow-text transition-all text-sm font-medium shadow-md hover:shadow-lg"
              >
                Generate Transcript
              </button>

              {/* Paper Source Section (no transcript yet) */}
              {sourceSection && sourceStyle && (
                <div className={`w-full mt-4 rounded-lg border ${sourceStyle.border} overflow-hidden`}>
                  <button
                    onClick={() => setSourceExpanded((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left ${sourceStyle.headerBg} ${sourceStyle.text} font-medium text-sm transition-colors`}
                  >
                    <span className="flex flex-col items-start gap-0.5">
                      <span>Paper Source: <span className="capitalize">{SOURCE_SECTION_LABELS[sourceSection] ?? sourceSection}</span></span>
                      {paperHeading && (
                        <span className="text-[11px] font-normal opacity-75 leading-tight">{paperHeading}</span>
                      )}
                    </span>
                    <span className="text-xs ml-2">{sourceExpanded ? '▲' : '▼'}</span>
                  </button>
                  {sourceExpanded && (
                    <div className={`${sourceStyle.bg} px-4 py-3 max-h-64 overflow-y-auto`}>
                      {sourceText ? (
                        <p className={`text-xs leading-relaxed whitespace-pre-wrap ${sourceStyle.text} opacity-90`}>
                          {sourceText}
                        </p>
                      ) : (
                        <p className={`text-xs italic ${sourceStyle.text} opacity-70`}>
                          Source text not available for this project.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
