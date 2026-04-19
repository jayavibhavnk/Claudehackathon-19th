import * as fs from "fs";
import * as path from "path";
import { extractPTExercises, generateExerciseAnimation } from "@/lib/claude/extract-pt";
import { findDemoKey } from "@/lib/demo-library/shoulder-demos";
import type { PTExercise } from "@/lib/schemas/pt-exercise";

export const maxDuration = 120;

// Hardcoded shoulder exercises shown when no sample file is present
const SHOULDER_SAMPLE: PTExercise[] = [
  {
    step_number: 1,
    name: "Shoulder Shrugs",
    reps: "10",
    sets: "3",
    duration_seconds: null,
    position: "standing",
    primary_body_parts: ["shoulder", "trapezius"],
    form_cues: ["Stand tall with arms relaxed", "Raise shoulders straight up toward ears", "Hold 2 seconds at top", "Lower slowly"],
    equipment: [],
    bilateral: true,
  },
  {
    step_number: 2,
    name: "Resistive Shoulder Shrugs",
    reps: "10",
    sets: "3",
    duration_seconds: null,
    position: "standing",
    primary_body_parts: ["shoulder", "trapezius"],
    form_cues: ["Hold light dumbbells at sides", "Raise shoulders toward ears against weight", "Hold 2 seconds", "Lower with control"],
    equipment: ["dumbbells"],
    bilateral: true,
  },
  {
    step_number: 3,
    name: "Corner Stretch",
    reps: "3",
    sets: null,
    duration_seconds: 30,
    position: "standing",
    primary_body_parts: ["chest", "shoulder", "anterior deltoid"],
    form_cues: ["Stand in corner facing the wall", "Place forearms on each wall at shoulder height", "Elbows at 90°", "Lean body forward until stretch is felt across chest"],
    equipment: [],
    bilateral: false,
  },
  {
    step_number: 4,
    name: "Prone Scapular Stabilization",
    reps: "10",
    sets: "3",
    duration_seconds: 5,
    position: "lying_prone",
    primary_body_parts: ["scapula", "rhomboids", "lower trapezius"],
    form_cues: ["Lie face down on table", "Arms at sides", "Squeeze shoulder blades together", "Hold 5 seconds", "Release slowly"],
    equipment: ["table"],
    bilateral: true,
  },
];

export async function GET() {
  const samplePath = path.join(process.cwd(), "test-images", "hip-osms.png");

  // Always use hardcoded shoulder demos for the sample button — fast, reliable, showcases new rig
  const useDemoSample = true;
  if (useDemoSample || !fs.existsSync(samplePath)) {
    const results = SHOULDER_SAMPLE.map(exercise => ({
      exercise,
      animation: null,
      demoKey: findDemoKey(exercise.name),
    }));
    return Response.json({ exercises: results });
  }

  try {
    const extractResult = await extractPTExercises(samplePath);

    if (!extractResult.success) {
      return Response.json(
        { error: `Extraction failed: ${extractResult.error}` },
        { status: 500 }
      );
    }

    if (extractResult.exercises.length === 0) {
      return Response.json(
        {
          error: "No exercises found in sample file.",
          reason: extractResult.reason,
        },
        { status: 422 }
      );
    }

    const results = await Promise.all(
      extractResult.exercises.map(async (exercise) => {
        const demoKey = findDemoKey(exercise.name);
        if (demoKey) {
          return { exercise, animation: null, demoKey };
        }
        const animResult = await generateExerciseAnimation(exercise);
        return {
          exercise,
          animation: animResult.success ? animResult.animation : null,
          animationError: animResult.success ? undefined : animResult.error,
        };
      })
    );

    return Response.json({ exercises: results });
  } catch (err) {
    console.error("[/api/sample]", err);
    return Response.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
