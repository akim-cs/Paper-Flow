# Paper Flow

An AI-powered tool that transforms academic research papers into interactive presentation slide timelines. Upload a PDF, configure your presentation parameters, and receive automatically-generated slides with speaker notes—all visualized in a draggable, rearrangeable flow diagram.

## Features

- **PDF Upload & Processing** - Upload research papers as PDF files for automatic text extraction
- **AI-Powered Slide Generation** - Converts paper content into structured presentation slides using Google Gemini AI
- **Presentation Configuration** - Customize for your audience level (beginner, intermediate, expert) and time limit (5-120 minutes)
- **Interactive Timeline** - Slides displayed as draggable, connectable nodes in a visual flow diagram
- **Expandable Slide Nodes** - View slide titles, time estimates, and expandable speaker notes
- **Smart Time Distribution** - Automatically allocates speaking time across slides based on your time constraints

## How It Works

1. **Upload** - Select and upload a PDF research paper
2. **Configure** - Set your audience level and presentation time limit
3. **Generate** - AI processes the paper through multiple stages:
   - Extracts and chunks text from PDF
   - Classifies content into sections (Abstract, Introduction, Methodology, Results, Discussion, Conclusion)
   - Generates a presentation outline with appropriate slide count
   - Creates detailed slide content with speaker notes
4. **Visualize & Edit** - Interact with your presentation timeline:
   - Drag nodes to reorder slides
   - Click nodes to expand/collapse speaker notes
   - Delete edges with Delete/Backspace keys
   - Use mini-map and navigation controls

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Flow Diagrams**: @xyflow/react
- **AI**: Google Gemini API (gemini-2.5-flash, gemini-3-flash-preview)

## Getting Started

### Prerequisites

- Node.js 18+
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd paper-flow
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your Gemini API key:
```env
GOOGLE_GEMINI_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
paper-flow/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── api/
│   │   ├── upload-paper/           # PDF upload endpoint
│   │   └── generate-nodes/         # Slide generation endpoint
│   ├── lib/
│   │   ├── gemini/                 # Gemini AI client, helpers, prompts
│   │   └── slidesToFlowNodes.ts    # Converts slides to React Flow nodes
│   └── types/
│       └── slides.ts               # TypeScript type definitions
├── components/
│   ├── CreateScreen.tsx            # Main orchestrator (3-step flow)
│   ├── UploadScreen.tsx            # PDF upload UI
│   ├── ConfigScreen.tsx            # Presentation settings form
│   ├── SlidesFlow.tsx              # React Flow canvas
│   └── SlideNode.tsx               # Custom slide node component
└── public/
    └── icon.png                    # App favicon
```

## License

MIT
