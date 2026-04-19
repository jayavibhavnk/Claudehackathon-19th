import * as fs from "fs";
import * as path from "path";
import { extractPTExercises, generateExerciseAnimation } from "@/lib/claude/extract-pt";

export const maxDuration = 120;

export async function GET() {
  const samplePath = path.join(process.cwd(), "test-images", "hip-osms.png");

  if (!fs.existsSync(samplePath)) {
    return Response.json(
      {
        error:
          "Sample file not found. Add test-images/hip-osms.png to use the Try Example button.",
      },
      { status: 404 }
    );
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
