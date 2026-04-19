import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { HumanFigure, PART_TO_SEGMENTS } from "../components/HumanFigure";
import type { Keyframe, Pose } from "../../lib/schemas/pose";
import { JOINT_NAMES } from "../../lib/schemas/pose";

type Props = {
  keyframes: Keyframe[];
  durationSeconds?: number;
  label?: string;
  highlightParts?: string[];
  supportObject?: "chair" | "bench" | "floor" | "wall" | null;
  accent?: string;
};

const CHAIR_COLOR = "#94A3B8";
const CHAIR_DARK = "#64748B";
const FLOOR_COLOR = "#CBD5E1";

// ── POSE INTERPOLATION ───────────────────────────────────────────────────────

function interpolatePose(keyframes: Keyframe[], t: number): Pose {
  if (keyframes.length === 0) return {};
  if (keyframes.length === 1) return keyframes[0].pose;

  const times = keyframes.map((kf) => kf.time);
  const result: Pose = {};

  // root position
  const allKeys: Array<"root_x" | "root_y"> = ["root_x", "root_y"];
  for (const key of allKeys) {
    const vals = keyframes.map((kf) => kf.pose[key] ?? (key === "root_x" ? 400 : 330));
    result[key] = interpolate(t, times, vals, {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
  }

  // joint angles
  for (const joint of JOINT_NAMES) {
    const skeleton = SKELETON_DEFAULTS[joint];
    const vals = keyframes.map((kf) => kf.pose[joint] ?? skeleton);
    result[joint] = interpolate(t, times, vals, {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
  }

  return result;
}

// Default angles matching HumanFigure's SKELETON_DEF
const SKELETON_DEFAULTS: Record<(typeof JOINT_NAMES)[number], number> = {
  spine_lower: 270,
  spine_upper: 270,
  neck:        270,
  shoulder_R:  180,
  shoulder_L:  0,
  hip_R:       180,
  hip_L:       0,
  elbow_R:     90,
  elbow_L:     90,
  wrist_R:     90,
  wrist_L:     90,
  knee_R:      90,
  knee_L:      90,
  ankle_R:     90,
  ankle_L:     90,
};

// ── SUPPORT OBJECT RENDERERS ─────────────────────────────────────────────────

function Chair({ rootY }: { rootY: number }) {
  const seatY = rootY + 2;
  return (
    <>
      {/* Backrest post */}
      <rect x={514} y={seatY - 136} width={24} height={140} rx={9} fill={CHAIR_DARK} />
      {/* Seat */}
      <rect x={258} y={seatY} width={278} height={24} rx={9} fill={CHAIR_COLOR} />
      {/* Legs */}
      <rect x={266} y={seatY + 22} width={16} height={74} rx={7} fill={CHAIR_DARK} />
      <rect x={510} y={seatY + 22} width={16} height={74} rx={7} fill={CHAIR_DARK} />
    </>
  );
}

function Bench({ rootY }: { rootY: number }) {
  const seatY = rootY + 2;
  return (
    <>
      <rect x={240} y={seatY} width={320} height={22} rx={9} fill={CHAIR_COLOR} />
      <rect x={256} y={seatY + 20} width={16} height={68} rx={7} fill={CHAIR_DARK} />
      <rect x={528} y={seatY + 20} width={16} height={68} rx={7} fill={CHAIR_DARK} />
    </>
  );
}

function Floor({ rootY }: { rootY: number }) {
  return (
    <rect x={100} y={rootY + 174} width={600} height={14} rx={6} fill={FLOOR_COLOR} />
  );
}

function Wall() {
  return (
    <>
      <rect x={582} y={150} width={18} height={330} rx={7} fill={FLOOR_COLOR} />
      <rect x={540} y={462} width={120} height={14} rx={6} fill={FLOOR_COLOR} />
    </>
  );
}

// ── MAIN COMPOSITION ─────────────────────────────────────────────────────────

export function ExerciseAnimation({
  keyframes,
  durationSeconds = 6,
  label = "",
  highlightParts = [],
  supportObject = null,
  accent = "#4F46E5",
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = fps * durationSeconds;
  const t = (frame % totalFrames) / totalFrames;

  const pose = interpolatePose(keyframes, t);

  // Expand high-level body part names → segment IDs
  const highlightSegments = highlightParts.flatMap(
    (part) => PART_TO_SEGMENTS[part.toLowerCase()] ?? []
  );

  // Derive root Y for support object placement
  const rootY = pose.root_y ?? 330;

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8F7F4" }}>
      <svg width={800} height={600} viewBox="0 0 800 600">
        {/* Support object behind figure */}
        {supportObject === "chair" && <Chair rootY={rootY} />}
        {supportObject === "bench" && <Bench rootY={rootY} />}
        {supportObject === "floor" && <Floor rootY={rootY} />}
        {supportObject === "wall" && <Wall />}

        {/* Figure */}
        <HumanFigure
          pose={pose}
          accent={accent}
          highlightSegments={highlightSegments}
        />

        {/* Label */}
        {label && (
          <text
            x={400}
            y={548}
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize={17}
            fontWeight={600}
            fill="#64748B"
            letterSpacing="0.06em"
          >
            {label.toUpperCase()}
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
}
