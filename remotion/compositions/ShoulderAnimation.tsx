import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Skeleton2D } from "../rig/Skeleton2D";
import type { Skeleton2DKeyframe, Skeleton2DPose } from "../rig/Skeleton2D";

const POSE_KEYS: (keyof Skeleton2DPose)[] = [
  "shoulder_L_elev", "shoulder_R_elev",
  "upper_arm_L", "upper_arm_R",
  "forearm_L", "forearm_R",
  "thigh_L", "thigh_R",
  "shin_L", "shin_R",
];

function lerpPose(kfs: Skeleton2DKeyframe[], t: number): Skeleton2DPose {
  if (kfs.length === 1) return kfs[0].pose;
  const times = kfs.map(k => k.time);
  const result: Skeleton2DPose = {};
  for (const key of POSE_KEYS) {
    const vals = kfs.map(k => k.pose[key] ?? 0);
    result[key] = interpolate(t, times, vals, {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
  }
  return result;
}

const MUTED = "#CBD5E1";

type Props = {
  keyframes: Skeleton2DKeyframe[];
  durationSeconds?: number;
  label?: string;
  highlightParts?: string[];
  supportObject?: "wall" | "floor" | null;
  heldObject?: "dumbbell" | null;
  accent?: string;
};

export function ShoulderAnimation({
  keyframes,
  durationSeconds = 6,
  label = "",
  highlightParts = [],
  supportObject = null,
  heldObject = null,
  accent = "#4F46E5",
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = fps * durationSeconds;
  const t = (frame % totalFrames) / totalFrames;
  const pose = lerpPose(keyframes, t);

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8F7F4" }}>
      <svg width={800} height={600} viewBox="0 0 800 600">

        {/* Wall lines for corner stretch */}
        {supportObject === "wall" && (
          <>
            <rect x={304} y={120} width={14} height={260} rx={6} fill={MUTED} />
            <rect x={482} y={120} width={14} height={260} rx={6} fill={MUTED} />
            {/* Corner angle hint */}
            <rect x={80} y={370} width={640} height={10} rx={4} fill={MUTED} opacity={0.4} />
          </>
        )}

        {/* Mat for prone exercises */}
        {supportObject === "floor" && (
          <>
            <rect x={180} y={330} width={440} height={36} rx={10} fill="#E2E8F0" />
            <text x={400} y={354} textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize={11} fontWeight={600} fill="#94A3B8" letterSpacing="0.05em">
              LYING FACE DOWN — SCAPULAR RETRACTION
            </text>
          </>
        )}

        <Skeleton2D
          rootX={400}
          rootY={90}
          pose={pose}
          accent={accent}
          highlightParts={highlightParts}
          heldObject={heldObject}
        />

        {label && (
          <text x={400} y={548} textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize={17} fontWeight={600} fill="#64748B" letterSpacing="0.06em">
            {label.toUpperCase()}
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
}
