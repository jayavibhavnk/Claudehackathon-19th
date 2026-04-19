import * as fs from "fs";
import * as path from "path";
import { PTExerciseSchema, type PTExercise } from "../schemas/pt-exercise";
import { ExerciseAnimationSchema, type ExerciseAnimationData } from "../schemas/pose";
import { z } from "zod";

const SCHEMA_DESCRIPTION = `{
  "exercises": [
    {
      "step_number": <integer, exercise order starting at 1>,
      "name": <string, exercise name>,
      "reps": <string | null, e.g. "10", "10-15", null if not specified>,
      "sets": <string | null, e.g. "3", "2-3", null if not specified>,
      "duration_seconds": <number | null, hold/duration in seconds, null if not specified>,
      "position": <"seated" | "standing" | "lying_supine" | "lying_prone" | "side_lying" | "other">,
      "primary_body_parts": <string[], e.g. ["quadriceps", "knee"]>,
      "form_cues": <string[], key technique instructions from the prescription>,
      "equipment": <string[], e.g. ["resistance band", "chair"], empty array if none>,
      "bilateral": <boolean, true if performed on both sides>
    }
  ],
  "reason": <optional string, only include if exercises array is empty>
}`;

const FEW_SHOT_EXAMPLE = `Example input: An image showing "1. Seated Knee Extension — 3 sets x 15 reps. Sit upright, extend leg until straight, hold 2 sec. Both legs. No equipment."

Example output:
{
  "exercises": [
    {
      "step_number": 1,
      "name": "Seated Knee Extension",
      "reps": "15",
      "sets": "3",
      "duration_seconds": 2,
      "position": "seated",
      "primary_body_parts": ["quadriceps", "knee"],
      "form_cues": ["sit upright", "extend leg until straight", "hold 2 seconds"],
      "equipment": [],
      "bilateral": true
    }
  ]
}`;

const SYSTEM_PROMPT = `You are a physical therapy prescription parser. Extract all exercises from the provided image into structured JSON.

Rules:
- Return ONLY valid JSON. No markdown, no prose, no code fences.
- Follow this exact schema:
${SCHEMA_DESCRIPTION}

- If the image is NOT a PT prescription or exercise sheet, return: {"exercises": [], "reason": "<brief explanation>"}
- If a field is not mentioned, use null for nullable fields or [] for arrays.
- For position: infer from context ("sit" → "seated", "lie on back" → "lying_supine", "lie on stomach" → "lying_prone", "lie on side" → "side_lying").
- For bilateral: true if the prescription says "both sides", "bilateral", "each side", or implies symmetric movement.
- Preserve exact rep/set strings as written (e.g., "10-15" not 12).

${FEW_SHOT_EXAMPLE}`;

export type ExtractionSuccess = {
  success: true;
  exercises: PTExercise[];
  reason?: string;
};

export type ExtractionFailure = {
  success: false;
  error: string;
  rawResponse: string;
  validationErrors?: z.ZodError;
};

export type ExtractionResult = ExtractionSuccess | ExtractionFailure;

function imageMediaType(
  ext: string
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | null {
  const map: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return map[ext] ?? null;
}

export async function extractPTExercises(
  imagePath: string
): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "ANTHROPIC_API_KEY is not set",
      rawResponse: "",
    };
  }

  const ext = path.extname(imagePath).toLowerCase();
  const isPdf = ext === ".pdf";
  const imgMediaType = imageMediaType(ext);

  if (!isPdf && !imgMediaType) {
    return {
      success: false,
      error: `Unsupported file type: ${ext}. Use .pdf, .jpg, .jpeg, .png, .gif, or .webp`,
      rawResponse: "",
    };
  }

  let fileData: string;
  try {
    fileData = fs.readFileSync(imagePath).toString("base64");
  } catch (err) {
    return {
      success: false,
      error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
      rawResponse: "",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBlock: any = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: fileData },
      }
    : {
        type: "image",
        source: { type: "base64", media_type: imgMediaType, data: fileData },
      };

  let rawResponse = "";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              contentBlock,
              { type: "text", text: "Extract all PT exercises from this document. Return valid JSON only." },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `API error: ${errText}`, rawResponse: "" };
    }
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    rawResponse = data.content.filter(b => b.type === "text").map(b => b.text).join("").trim();

    // Strip accidental code fences if the model adds them anyway
    const cleaned = rawResponse
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return {
        success: false,
        error: "Response was not valid JSON",
        rawResponse,
      };
    }

    // Validate top-level shape
    const topLevel = parsed as { exercises?: unknown; reason?: string };
    if (!topLevel || typeof topLevel !== "object" || !("exercises" in topLevel)) {
      return {
        success: false,
        error: "Response missing 'exercises' key",
        rawResponse,
      };
    }

    if (!Array.isArray(topLevel.exercises)) {
      return {
        success: false,
        error: "'exercises' is not an array",
        rawResponse,
      };
    }

    // Validate each exercise against the Zod schema
    const exercises: PTExercise[] = [];
    const validationErrors: z.ZodError[] = [];

    for (const item of topLevel.exercises) {
      const result = PTExerciseSchema.safeParse(item);
      if (result.success) {
        exercises.push(result.data);
      } else {
        validationErrors.push(result.error);
      }
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `${validationErrors.length} exercise(s) failed schema validation`,
        rawResponse,
        validationErrors: validationErrors[0],
      };
    }

    return {
      success: true,
      exercises,
      reason: topLevel.reason,
    };
  } catch (err) {
    return {
      success: false,
      error: `Claude API error: ${err instanceof Error ? err.message : String(err)}`,
      rawResponse,
    };
  }
}

// ── ANIMATION GENERATION ─────────────────────────────────────────────────────

const SKELETON_PROMPT = `
## Skeleton rig (forward kinematics)

Joints and their parent → child order:
  root (pelvis) → spine_lower (waist) → spine_upper (shoulder height) → neck → [head: circle]
  spine_upper → shoulder_R (near arm) → elbow_R → wrist_R
  spine_upper → shoulder_L (far arm)  → elbow_L → wrist_L
  root → hip_R (near hip) → knee_R (near thigh end) → ankle_R (near shin end)
  root → hip_L (far hip)  → knee_L → ankle_L

Each joint angle (degrees) = world-space direction of the segment FROM parent TO that joint.
  0° = right (+X), 90° = down (+Y), 180° = left (−X), 270° = up (−Y)

Figure faces LEFT. R = anatomical right = near (front) side of 3/4 view.

### Neutral reference angles
| Joint      | Standing | Seated (chair) |
|------------|----------|----------------|
| spine_lower| 270      | 270            |
| spine_upper| 270      | 270            |
| neck       | 270      | 270            |
| shoulder_R | 180      | 180            |
| shoulder_L | 0        | 0              |
| hip_R      | 180      | 180            |
| hip_L      | 0        | 0              |
| elbow_R    | 90       | 90             |
| elbow_L    | 90       | 90             |
| wrist_R    | 90       | 90             |
| wrist_L    | 90       | 90             |
| knee_R     | 90       | 180 (horiz)    |
| knee_L     | 90       | 0   (horiz)    |
| ankle_R    | 90       | 90             |
| ankle_L    | 90       | 90             |
| root_y     | 290      | 355            |

### Key motion examples
- Spine forward lean 35°: spine_lower=238, spine_upper=233
- Quad stretch (heel to glute): ankle_R=302 (shin goes behind and up)
- Shoulder ER (forearm pivots up): elbow_R=180, wrist_R=270 (full ER) vs wrist_R=90 (start)
- Hip abduction: knee_R=162 (thigh angles away from body in seated)
`;

const ANIMATION_SYSTEM_PROMPT = `
You are a physical therapy animation keyframe generator.
Given a PT exercise description, output a JSON object with Remotion animation keyframes.

${SKELETON_PROMPT}

### Output schema (valid JSON only, no prose, no code fences)
{
  "keyframes": [
    { "time": 0, "pose": { <joint angles> } },
    { "time": 0.35, "pose": { <joint angles at peak stretch> } },
    { "time": 0.65, "pose": { <same as peak - hold stretch> } },
    { "time": 1, "pose": { <same as time:0 - seamless loop> } }
  ],
  "label": "<Exercise name>",
  "highlightParts": ["<one of: hamstring, quad, calf, glute, hip_flexor, knee, shoulder, bicep, tricep, back, core, chest, forearm>"],
  "supportObject": <"chair" | "bench" | "floor" | "wall" | null>
}

Rules:
- 3–5 keyframes. First and last pose must be identical for seamless loop.
- Only include joints that CHANGE from neutral. Omit static joints.
- Always include root_x (400) and root_y (290 standing / 355 seated) in every keyframe pose.
- Angles must be realistic: spine lean < 50° from 270, arm reaches within segment length limits.
- highlightParts: the primary muscles being stretched or targeted.
- supportObject: what the patient is in contact with.
`.trim();

export type AnimationGenSuccess = {
  success: true;
  animation: ExerciseAnimationData;
};

export type AnimationGenFailure = {
  success: false;
  error: string;
  rawResponse: string;
};

export async function generateExerciseAnimation(
  exercise: PTExercise
): Promise<AnimationGenSuccess | AnimationGenFailure> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, error: "ANTHROPIC_API_KEY is not set", rawResponse: "" };
  }

  const userPrompt = `Generate animation keyframes for this PT exercise:

Name: ${exercise.name}
Position: ${exercise.position}
Reps: ${exercise.reps ?? "not specified"}
Sets: ${exercise.sets ?? "not specified"}
Duration: ${exercise.duration_seconds ? `${exercise.duration_seconds}s hold` : "not specified"}
Body parts: ${exercise.primary_body_parts.join(", ")}
Form cues: ${exercise.form_cues.join("; ")}
Equipment: ${exercise.equipment.length ? exercise.equipment.join(", ") : "none"}
Bilateral: ${exercise.bilateral}

Produce the JSON animation object.`;

  let rawResponse = "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: ANIMATION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `API error: ${errText}`, rawResponse: "" };
    }
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    rawResponse = data.content.filter(b => b.type === "text").map(b => b.text).join("").trim();

    const cleaned = rawResponse
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return { success: false, error: "Response was not valid JSON", rawResponse };
    }

    const result = ExerciseAnimationSchema.safeParse(parsed);
    if (!result.success) {
      return {
        success: false,
        error: `Schema validation failed: ${result.error.issues.map((i) => i.message).join("; ")}`,
        rawResponse,
      };
    }

    return { success: true, animation: result.data };
  } catch (err) {
    return {
      success: false,
      error: `Claude API error: ${err instanceof Error ? err.message : String(err)}`,
      rawResponse,
    };
  }
}
