import {
  SHOULDER_SHRUGS,
  RESISTIVE_SHOULDER_SHRUGS,
  CORNER_STRETCH,
  PRONE_SCAPULAR,
} from "@/remotion/rig/shoulder-animations";
import type { Skeleton2DKeyframe } from "@/remotion/rig/Skeleton2D";

export type DemoEntry = {
  keyframes: Skeleton2DKeyframe[];
  supportObject: "wall" | "floor" | null;
  heldObject: "dumbbell" | null;
  highlightParts: string[];
};

export const demoExerciseMap: Record<string, DemoEntry> = {
  "shoulder-shrugs": {
    keyframes: SHOULDER_SHRUGS,
    supportObject: null,
    heldObject: null,
    highlightParts: ["shoulder"],
  },
  "resistive-shoulder-shrugs": {
    keyframes: RESISTIVE_SHOULDER_SHRUGS,
    supportObject: null,
    heldObject: "dumbbell",
    highlightParts: ["shoulder"],
  },
  "corner-stretch": {
    keyframes: CORNER_STRETCH,
    supportObject: "wall",
    heldObject: null,
    highlightParts: ["shoulder", "arms"],
  },
  "prone-scapular": {
    keyframes: PRONE_SCAPULAR,
    supportObject: "floor",
    heldObject: null,
    highlightParts: ["shoulder"],
  },
};

// Check order matters: resistive must come before generic shrug
const PATTERNS: [string, string[]][] = [
  ["resistive-shoulder-shrugs", ["resistive shoulder shrug", "phase ii"]],
  ["shoulder-shrugs", ["shoulder shrug", "phase i"]],
  ["corner-stretch", ["corner stretch"]],
  ["prone-scapular", ["prone scapular", "scapular stabiliz"]],
];

export function findDemoKey(exerciseName: string): string | null {
  const lower = exerciseName.toLowerCase();
  for (const [key, patterns] of PATTERNS) {
    if (patterns.some(p => lower.includes(p))) return key;
  }
  return null;
}
