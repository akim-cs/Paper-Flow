# Paper Flow

An AI-powered tool that transforms academic research papers into interactive presentation slide timelines. Upload a PDF, configure your presentation parameters, and receive automatically-generated slides with speaker notes—all visualized in a draggable, rearrangeable flow diagram.

## Features

- **PDF Upload & Processing** - Upload research papers as PDF files for automatic text extraction
- **AI-Powered Slide Generation** - Converts paper content into structured presentation slides using Google Gemini AI
- **Presentation Configuration** - Customize for your audience level (beginner, intermediate, expert) and time limit (5-120 minutes)
- **Interactive Timeline** - Slides displayed as draggable, connectable nodes in a visual flow diagram
- **Expandable Slide Nodes** - View slide titles, time estimates, and expandable talking points
- **Rich Text Editing** - Edit slide content with MDXEditor (markdown support, formatting toolbar)
- **Smart Time Distribution** - Automatically allocates speaking time across slides based on your time constraints
- **Google Authentication** - Sign in with Google account
- **Project Persistence** - Save and load projects from Firebase Firestore
- **Project Management** - View, open, and delete saved projects from dashboard

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

- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Flow Diagrams**: @xyflow/react
- **Rich Text**: MDXEditor
- **AI**: Google Gemini API (gemini-2.0-flash, gemini-2.5-flash-preview)
- **Auth & Database**: Firebase (Authentication, Firestore)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+ (for backend)
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd paper-flow
```
### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with your API keys:
```env
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

3. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Setup

Open a new terminal

1. Navigate to backend
```bash
cd backend
```

2. Make setup script executable (Mac/Linux only)
```bash
chmod +x setup.sh
```
Windows users can skip this step

3. Run the setup script

Mac/Linux:

```bash
./setup.sh
```

If the virtual environment is not automatically activated:

```bash
source venv/bin/activate
```

Windows:

```bash
.\setup.ps1
.\venv\Scripts\Activate.ps1
```

4. Run the backend server

```bash
uvicorn main:app --reload
```

The backend will run at http://localhost:8000

## Project Structure

```
paper-flow/
├── app/
│   ├── page.tsx                    # Landing/redirect page
│   ├── login/page.tsx              # Google sign-in page
│   ├── projects/
│   │   ├── page.tsx                # Projects dashboard
│   │   ├── new/page.tsx            # New project flow
│   │   └── [id]/page.tsx           # Edit existing project
│   ├── api/
│   │   ├── upload-paper/           # PDF upload endpoint
│   │   └── generate-nodes/         # Slide generation endpoint
│   ├── lib/
│   │   ├── firebase/               # Firebase config, auth, firestore
│   │   ├── gemini/                 # Gemini AI client, helpers, prompts
│   │   └── slidesToFlowNodes.ts    # Converts slides to React Flow nodes
│   └── types/
│       ├── slides.ts               # Slide type definitions
│       └── project.ts              # Project type definitions
├── components/
│   ├── auth/AuthGuard.tsx          # Protected route wrapper
│   ├── projects/                   # Project list and card components
│   ├── CreateScreen.tsx            # Main orchestrator (3-step flow)
│   ├── UploadScreen.tsx            # PDF upload UI
│   ├── ConfigScreen.tsx            # Presentation settings form
│   ├── SlidesFlow.tsx              # React Flow canvas
│   ├── SlideNode.tsx               # Custom slide node component
│   └── SlideNodeEditor.tsx         # MDXEditor wrapper for slide content
├── backend/
│   ├── main.py
│   ├── services/
│   │   ├── pdf_service.py
│   ├── requirements.txt
│   ├── setup.sh
│   ├── setup.ps1
└── public/
    └── lineart_boat.png            # App logo
```

## License

MIT
