/**
 * Paper Flow theme for SlideNode (and other components).
 * Color aliases (hex values) are defined in app/globals.css @theme:
 *   paper-flow-text, paper-flow-border, paper-flow-canvas
 */
export const paperFlowTheme = {
  // --- Node container ---
  nodeBorder: 'border-4 border-paper-flow-border',
  nodeBorderHover: 'hover:border-paper-flow-border/80',
  nodeBg: 'bg-sky-50',
  nodeShadow: 'shadow-sm shadow-black/5',
  nodeShadowHover: 'hover:shadow-md hover:shadow-black/8',

  // --- Connection handles (use border color) ---
  handleBg: '!bg-paper-flow-border/20',
  handleBorder: '!border-paper-flow-border !border-2',

  // --- Focus ring ---
  focusRing: 'focus:ring-1 focus:ring-paper-flow-border focus:ring-inset',

  // --- Text (dark blue alias) ---
  titleText: 'text-paper-flow-text',
  titlePlaceholder: 'placeholder:text-paper-flow-border/70',

  // --- Secondary text ---
  secondaryText: 'text-paper-flow-text/70',
  secondaryTextAlt: 'text-paper-flow-text/80',

  // --- Expanded section ---
  expandedBorder: 'border-t border-paper-flow-border/30',
  expandedBg: 'bg-white/70',
  expandedLabel: 'text-paper-flow-text',

  // --- Talking points ---
  noteText: 'text-paper-flow-text/90',
  notePlaceholder: 'placeholder:text-paper-flow-border/60',
  noteBullet: 'text-paper-flow-border',
  noteDraft: 'text-paper-flow-text/70',
} as const;

/** Canvas background (pale pink alias). Use on the flow container. */
export const paperFlowCanvasBg = 'bg-paper-flow-canvas';
