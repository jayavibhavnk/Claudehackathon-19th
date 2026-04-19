import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { extractPTExercises } from "@/lib/claude/extract-pt";
import { generateExerciseAnimation } from "@/lib/claude/extract-pt";

export const maxDuration = 120; // Vercel function timeout (seconds)

export async function POST(request: Request) {
  let tmpPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return Response.json({ error: "No image provided." }, { status: 400 });
    }

    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    // Write to a temp file so extractPTExercises can read it
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    tmpPath = path.join(os.tmpdir(), `steplet-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tmpPath, buffer);

    // Step 1: Vision extraction
    const extractResult = await extractPTExercises(tmpPath);

    if (!extractResult.success) {
      return Response.json(
        { error: `Extraction failed: ${extractResult.error}` },
        { status: 500 }
      );
    }

    if (extractResult.exercises.length === 0) {
      return Response.json(
        {
          error:
            "No PT exercises found. Please upload a physical therapy prescription or exercise sheet.",
          reason: extractResult.reason,
        },
        { status: 422 }
      );
    }

    // Step 2: Generate animations in parallel (one Claude call per exercise)
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
    console.error("[/api/extract]", err);
    return Response.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  } finally {
    if (tmpPath) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // best-effort cleanup
      }
    }
  }
}
