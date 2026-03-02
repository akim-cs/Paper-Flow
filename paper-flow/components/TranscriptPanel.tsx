'use client';

import { paperFlowTheme as theme } from '../app/lib/theme';
import type { Slide, PresentationConfig } from '../app/types/slides';

type TranscriptPanelProps = {
  isOpen: boolean;
  slides: Slide[];
  activeSlideId: string | null;
  generatingSlideId: string | null;
  onSelectSlide: (slideId: string) => void;
  onGenerateTranscript: (slideId: string) => void;
  onClose: () => void;
  config: PresentationConfig;
};

export default function TranscriptPanel({
  isOpen,
  slides,
  activeSlideId,
  generatingSlideId,
  onSelectSlide,
  onGenerateTranscript,
  onClose,
  config,
}: TranscriptPanelProps) {
  if (!isOpen) return null;

  const activeSlide = slides.find((s) => s.id === activeSlideId);
  const hasTranscript = activeSlide?.transcript && activeSlide.transcript.length > 0;
  const isGenerating = generatingSlideId === activeSlideId;

  return (
    <div className="fixed top-0 right-0 h-full w-[500px] bg-white dark:bg-zinc-900 border-l border-paper-flow-border shadow-2xl z-50 overflow-hidden flex animate-slide-in">
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
        <div className={`p-4 ${theme.expandedBorder} border-b flex items-start justify-between`}>
          <div className="flex-1 min-w-0">
            <h2 className={`text-lg font-semibold ${theme.titleText} mb-1`}>Transcript</h2>
            {activeSlide && (
              <>
                <p className={`text-sm ${theme.secondaryText} truncate`}>{activeSlide.title}</p>
                <p className={`text-xs ${theme.secondaryTextAlt} mt-1`}>
                  Time: {activeSlide.est_time} min | Audience: {config.audienceLevel}
                </p>
              </>
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
                  className={`w-full px-4 py-2 rounded ${theme.secondaryText} hover:bg-paper-flow-border/20 border border-paper-flow-border transition-colors text-sm font-medium`}
                >
                  Regenerate Transcript
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className={`text-sm ${theme.secondaryText} text-center mb-2`}>
                No transcript generated yet
              </p>
              <button
                onClick={() => onGenerateTranscript(activeSlide.id)}
                className={`px-4 py-2 rounded ${theme.secondaryText} hover:bg-paper-flow-border/20 border border-paper-flow-border transition-colors text-sm font-medium`}
              >
                Generate Transcript
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
