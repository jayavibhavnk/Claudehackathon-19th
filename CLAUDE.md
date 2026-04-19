# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Steplet

AI-powered instructional animation platform. Converts multi-step instructions (physical therapy exercises, origami) into animated step-by-step visual tutorials using Claude for parsing and Remotion for rendering.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS
- **Animation:** Remotion + `@remotion/player`
- **AI:** Claude API (`claude-opus-4-7`) via Anthropic SDK
- **Backend:** Next.js API routes, deployed to Vercel
- **PDF parsing:** `pdf-parse` or `pdf.js`
- **Voiceover:** Web Speech API (native browser)

## Commands

Once scaffolded, expected commands:

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Run production build
npm run lint         # ESLint
npm run remotion     # Remotion Studio preview
```

## Architecture

### Core Pattern: Claude parses → Remotion renders

Claude's sole job is transforming unstructured input into structured JSON. Remotion renders deterministic template-based animations from that JSON. There is **no AI-generated video** — all animation is parameterized React components.

**Data flow:**
```
User input (PDF/text/image)
  → /api/parse (Claude API)
  → Structured Step JSON
  → Remotion <Composition> components
  → Animated playback in browser
```

### Claude API Jobs (4 responsibilities)

1. **Instruction parsing** — PDF/text → typed JSON per schemas below
2. **Safety flagging** — detect post-surgical or supervision-required exercises
3. **Plain-language descriptions** — multi-language step explanations
4. **Adaptive modifications** — suggest variants based on user constraints

### Step JSON Schemas

**PT Exercise step:**
```ts
{
  id: string;
  action: string;           // e.g., "extend", "hold", "rotate"
  bodyPart: string;         // e.g., "left_knee", "shoulder"
  parameters: {
    reps?: number;
    sets?: number;
    hold_seconds?: number;
    angle_degrees?: number;
  };
  safetyFlag?: string;
  description: string;
}
```

**Origami step:**
```ts
{
  id: string;
  foldType: "valley" | "mountain" | "squash" | "petal" | "reverse" | "pleat";
  targetEdge: string;
  direction: "up" | "down" | "left" | "right";
  description: string;
}
```

### Remotion Compositions (MVP scope)

**PT (4 for MVP):** seated hamstring stretch, standing quad stretch, bird dog, shoulder external rotation

**Origami (3 for MVP):** valley fold, mountain fold, squash fold

Each composition lives in `src/compositions/` and accepts typed props derived from the step JSON. Visual style is stylized/diagrammatic (not photoreal).

### Directory Layout (target)

```
src/
  app/                  # Next.js App Router pages and API routes
    api/
      parse/route.ts    # Claude parsing endpoint
  compositions/         # Remotion compositions
    pt/                 # PT exercise animations
    origami/            # Origami fold animations
  components/           # UI components (player, upload, controls)
  lib/
    claude.ts           # Anthropic SDK client and prompt templates
    schemas.ts          # Zod schemas for step JSON validation
```

## Demo Reliability

Two demo sheets are hardcoded as fallbacks in case Claude parsing fails during live demo. Pre-recorded backup video exists as final fallback.

## MVP Scope

**In:** web app, PDF/image upload, text input, 4 PT + 3 origami compositions, playback controls, voiceover toggle

**Deferred:** camera angle toggle, adaptive UI, user accounts, full composition library, video export, mobile app
