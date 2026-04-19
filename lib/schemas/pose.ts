import { z } from "zod";

// Angle convention: degrees, world-space (0 = right, 90 = down, 180 = left, 270 = up).
// Figure faces LEFT. "R" joints = anatomical right = near side in 3/4 view.
// Each joint angle defines the direction of the segment FROM that joint's parent TO the joint.
//   e.g. knee_R angle = direction the thigh points (hip → knee)
//        ankle_R angle = direction the shin points (knee → ankle)

export const JOINT_NAMES = [
  "spine_lower",
  "spine_upper",
  "neck",
  "shoulder_R",
  "shoulder_L",
  "hip_R",
  "hip_L",
  "elbow_R",
  "elbow_L",
  "wrist_R",
  "wrist_L",
  "knee_R",
  "knee_L",
  "ankle_R",
  "ankle_L",
] as const;

export type JointName = (typeof JOINT_NAMES)[number];

const jointAngles = JOINT_NAMES.reduce(
  (acc, name) => ({ ...acc, [name]: z.number().optional() }),
  {} as Record<JointName, z.ZodOptional<z.ZodNumber>>
);

export const PoseSchema = z.object({
  root_x: z.number().optional(),
  root_y: z.number().optional(),
  ...jointAngles,
});

export type Pose = z.infer<typeof PoseSchema>;

export const KeyframeSchema = z.object({
  time: z.number().min(0).max(1),
  pose: PoseSchema,
});

export type Keyframe = z.infer<typeof KeyframeSchema>;

export const ExerciseAnimationSchema = z.object({
  keyframes: z.array(KeyframeSchema).min(2),
  label: z.string(),
  highlightParts: z.array(z.string()),
  supportObject: z
    .enum(["chair", "bench", "floor", "wall"])
    .nullable(),
});

export type ExerciseAnimationData = z.infer<typeof ExerciseAnimationSchema>;
