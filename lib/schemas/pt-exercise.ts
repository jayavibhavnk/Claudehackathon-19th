import { z } from "zod";

export const PTExerciseSchema = z.object({
  step_number: z.number().int().positive(),
  name: z.string(),
  reps: z.string().nullable(),
  sets: z.string().nullable(),
  duration_seconds: z.number().nullable(),
  position: z.enum([
    "seated",
    "standing",
    "lying_supine",
    "lying_prone",
    "side_lying",
    "other",
  ]),
  primary_body_parts: z.array(z.string()),
  form_cues: z.array(z.string()),
  equipment: z.array(z.string()),
  bilateral: z.boolean(),
});

export type PTExercise = z.infer<typeof PTExerciseSchema>;

export const PTExtractionResultSchema = z.union([
  z.object({
    exercises: z.array(PTExerciseSchema),
    reason: z.string().optional(),
  }),
  z.object({
    exercises: z.literal(null),
    reason: z.string(),
  }),
]);

export type PTExtractionResult = z.infer<typeof PTExtractionResultSchema>;
