# Config Screen Implementation

## Summary
Added the **Audience & Time Constraint Screen** between upload and timeline views. This collects user preferences before generating the presentation timeline.

---

## Files Changed

| File | Change |
|------|--------|
| `components/ConfigScreen.tsx` | **Created** — New config form component |
| `components/CreateScreen.tsx` | **Modified** — Added config step to flow |
| `app/types/slides.ts` | **Modified** — Added `PresentationConfig` type |

---

## New Type

```ts
// app/types/slides.ts

export type PresentationConfig = {
  audienceLevel: 'beginner' | 'intermediate' | 'expert';
  timeLimit: number; // minutes
};
```

---

## User Flow

```
UploadScreen → ConfigScreen → SlidesFlow
     ↓              ↓             ↓
  slides        config       timeline
```

1. User uploads/loads paper → `slides` state is set
2. User selects audience level + time → `config` state is set
3. Timeline renders with ReactFlow

---

## ConfigScreen UI

- **Audience Level**: Segmented bar with 3 options (beginner / intermediate / expert)
- **Time Limit**: Number input (5–120 minutes)
- **Continue Button**: Proceeds to timeline

---

## Current State

The `config` object is captured in `CreateScreen` state but **not yet consumed** by downstream components.

### For teammates working on timeline logic:

The config is available in `CreateScreen.tsx`:

```tsx
const [config, setConfig] = useState<PresentationConfig | null>(null);
```

To use it, pass `config` to your timeline builder:

```tsx
// Example future usage in CreateScreen.tsx
return (
  <SlidesFlow
    slides={slides}
    config={config}  // ← pass config here
    onSlidesChange={(newSlides) => setSlides(newSlides)}
  />
);
```

### For teammates working on Gemini parsing:

No changes needed. Your JSON output feeds into `slides` state via `UploadScreen.onUploadComplete()`. The config screen appears after upload completes.

---

## Data Persistence

- Config lives in React state (memory only)
- **Lost on page refresh** — no local storage yet
- Add persistence later if needed
