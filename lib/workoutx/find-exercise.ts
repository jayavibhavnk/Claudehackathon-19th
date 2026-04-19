import type { PTExercise } from "@/lib/schemas/pt-exercise";

const BASE = "https://api.workoutxapp.com/v1";

function getKey(): string {
  return process.env.WORKOUTX_API_KEY ?? "";
}

type WorkoutXExercise = {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  category: string;
  equipment: string;
  gifUrl: string;
};

type WorkoutXResponse = {
  total: number;
  count: number;
  data: WorkoutXExercise[];
};

const PT_PART_TO_TARGET: Record<string, string> = {
  quadriceps: "Quads",
  quad: "Quads",
  quads: "Quads",
  hamstring: "Hamstrings",
  hamstrings: "Hamstrings",
  calf: "Calves",
  calves: "Calves",
  glute: "Glutes",
  glutes: "Glutes",
  gluteus: "Glutes",
  hip: "Glutes",
  "hip flexor": "Adductors",
  adductor: "Adductors",
  piriformis: "Glutes",
  shoulder: "Delts",
  deltoid: "Delts",
  rotator: "Delts",
  lat: "Lats",
  lats: "Lats",
  back: "Upper Back",
  "lower back": "Upper Back",
  abs: "Abs",
  core: "Abs",
  abdominal: "Abs",
  bicep: "Biceps",
  biceps: "Biceps",
  tricep: "Triceps",
  triceps: "Triceps",
  forearm: "Forearms",
  neck: "Traps",
  trap: "Traps",
  chest: "Pectorals",
  pec: "Pectorals",
  tibia: "Calves",
};

function extractNameTerms(name: string): string[] {
  // Try progressively shorter search terms from the exercise name
  const lower = name.toLowerCase();
  const words = lower
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 3 &&
        !["with", "and", "the", "from", "into", "your", "each", "both"].includes(w)
    );

  const terms: string[] = [];

  // Full name first (up to 3 words)
  if (words.length >= 2) {
    terms.push(words.slice(0, Math.min(3, words.length)).join(" "));
  }

  // Key anatomical terms
  const anatomical = [
    "hamstring",
    "quad",
    "calf",
    "glute",
    "hip",
    "shoulder",
    "neck",
    "back",
    "knee",
    "ankle",
    "wrist",
    "elbow",
    "chest",
    "core",
    "abs",
    "bicep",
    "tricep",
    "forearm",
    "piriformis",
    "adductor",
  ];

  for (const term of anatomical) {
    if (lower.includes(term)) {
      // If there's also a movement word, combine
      if (lower.includes("stretch")) terms.push(term + " stretch");
      if (lower.includes("curl")) terms.push(term + " curl");
      if (lower.includes("raise")) terms.push(term + " raise");
      if (lower.includes("extension")) terms.push(term + " extension");
      terms.push(term);
    }
  }

  return Array.from(new Set(terms));
}

async function searchByName(term: string): Promise<WorkoutXExercise | null> {
  const key = getKey();
  if (!key) return null;

  try {
    const url = `${BASE}/exercises/name/${encodeURIComponent(term)}`;
    const res = await fetch(url, {
      headers: { "X-WorkoutX-Key": key },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data: WorkoutXResponse = await res.json();
    if (!data.data?.length) return null;

    // Prefer flexibility/stretching exercises
    const sorted = [...data.data].sort((a, b) => {
      const aFlex = a.category === "flexibility" ? -1 : 0;
      const bFlex = b.category === "flexibility" ? -1 : 0;
      return aFlex - bFlex;
    });

    return sorted[0];
  } catch {
    return null;
  }
}

async function searchByTarget(target: string): Promise<WorkoutXExercise | null> {
  const key = getKey();
  if (!key) return null;

  try {
    const url = `${BASE}/exercises/target/${encodeURIComponent(target)}?limit=10`;
    const res = await fetch(url, {
      headers: { "X-WorkoutX-Key": key },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data: WorkoutXResponse = await res.json();
    if (!data.data?.length) return null;

    // Prefer flexibility, then bodyweight
    const sorted = [...data.data].sort((a, b) => {
      const score = (e: WorkoutXExercise) =>
        (e.category === "flexibility" ? -2 : 0) +
        (e.equipment === "Body Weight" ? -1 : 0);
      return score(a) - score(b);
    });

    return sorted[0];
  } catch {
    return null;
  }
}

export async function findExerciseGif(
  exercise: PTExercise
): Promise<string | null> {
  const key = getKey();
  if (!key) return null;

  // 1. Try name-based search
  const nameTerms = extractNameTerms(exercise.name);
  for (const term of nameTerms) {
    const result = await searchByName(term);
    if (result) {
      // Return proxied URL (id without leading zeros for brevity)
      return `/api/gif/${result.id}`;
    }
  }

  // 2. Fall back to target-muscle search
  for (const part of exercise.primary_body_parts) {
    const lower = part.toLowerCase();
    for (const [key, target] of Object.entries(PT_PART_TO_TARGET)) {
      if (lower.includes(key)) {
        const result = await searchByTarget(target);
        if (result) return `/api/gif/${result.id}`;
        break;
      }
    }
  }

  return null;
}
