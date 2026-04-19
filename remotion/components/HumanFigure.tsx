import React from "react";
import type { Pose } from "../../lib/schemas/pose";

// ── SKELETON DEFINITION ──────────────────────────────────────────────────────
// Each entry: the joint's parent, the segment length (px), and default angle.
// Root is the pelvis center — its world position comes from pose.root_x/y.

export const SKELETON_DEF = [
  // spine
  { name: "spine_lower", parent: "root",        length: 55,  defaultAngle: 270 },
  { name: "spine_upper", parent: "spine_lower",  length: 65,  defaultAngle: 270 },
  { name: "neck",        parent: "spine_upper",  length: 24,  defaultAngle: 270 },
  // shoulder branches
  { name: "shoulder_R",  parent: "spine_upper",  length: 32,  defaultAngle: 180 },
  { name: "shoulder_L",  parent: "spine_upper",  length: 32,  defaultAngle: 0   },
  // hip branches
  { name: "hip_R",       parent: "root",         length: 24,  defaultAngle: 180 },
  { name: "hip_L",       parent: "root",         length: 24,  defaultAngle: 0   },
  // arms
  { name: "elbow_R",     parent: "shoulder_R",   length: 75,  defaultAngle: 90  },
  { name: "elbow_L",     parent: "shoulder_L",   length: 75,  defaultAngle: 90  },
  { name: "wrist_R",     parent: "elbow_R",      length: 65,  defaultAngle: 90  },
  { name: "wrist_L",     parent: "elbow_L",      length: 65,  defaultAngle: 90  },
  // legs
  { name: "knee_R",      parent: "hip_R",        length: 88,  defaultAngle: 90  },
  { name: "knee_L",      parent: "hip_L",        length: 88,  defaultAngle: 90  },
  { name: "ankle_R",     parent: "knee_R",       length: 83,  defaultAngle: 90  },
  { name: "ankle_L",     parent: "knee_L",       length: 83,  defaultAngle: 90  },
] as const;

type JointPositions = Record<string, { x: number; y: number }>;

export function computeFK(pose: Pose, rootX = 400, rootY = 330): JointPositions {
  const rx = pose.root_x ?? rootX;
  const ry = pose.root_y ?? rootY;
  const pos: JointPositions = { root: { x: rx, y: ry } };

  for (const joint of SKELETON_DEF) {
    const parent = pos[joint.parent];
    const angleDeg =
      (pose[joint.name as keyof Pose] as number | undefined) ??
      joint.defaultAngle;
    const rad = (angleDeg * Math.PI) / 180;
    pos[joint.name] = {
      x: parent.x + joint.length * Math.cos(rad),
      y: parent.y + joint.length * Math.sin(rad),
    };
  }

  return pos;
}

// ── RENDER SEGMENT DEFINITIONS ───────────────────────────────────────────────
// zLayer: lower = drawn first (behind). L (far) side < R (near) side.

export const RENDER_SEGMENTS = [
  { id: "thigh_L",     from: "hip_L",     to: "knee_L",   width: 26, zLayer: 1 },
  { id: "shin_L",      from: "knee_L",    to: "ankle_L",  width: 22, zLayer: 1 },
  { id: "upper_arm_L", from: "shoulder_L",to: "elbow_L",  width: 20, zLayer: 2 },
  { id: "lower_arm_L", from: "elbow_L",   to: "wrist_L",  width: 17, zLayer: 2 },
  { id: "torso",       from: "root",      to: "spine_upper", width: 64, zLayer: 5 },
  { id: "thigh_R",     from: "hip_R",     to: "knee_R",   width: 32, zLayer: 7 },
  { id: "shin_R",      from: "knee_R",    to: "ankle_R",  width: 28, zLayer: 7 },
  { id: "upper_arm_R", from: "shoulder_R",to: "elbow_R",  width: 26, zLayer: 9 },
  { id: "lower_arm_R", from: "elbow_R",   to: "wrist_R",  width: 22, zLayer: 9 },
] as const;

// Maps high-level body part names → segment IDs for highlight coloring
export const PART_TO_SEGMENTS: Record<string, string[]> = {
  hamstring:  ["thigh_R", "shin_R", "thigh_L", "shin_L"],
  quad:       ["thigh_R", "thigh_L"],
  calf:       ["shin_R", "shin_L"],
  glute:      ["thigh_R", "thigh_L"],
  hip_flexor: ["thigh_R", "thigh_L"],
  knee:       ["thigh_R", "shin_R", "thigh_L", "shin_L"],
  shoulder:   ["upper_arm_R", "upper_arm_L"],
  bicep:      ["upper_arm_R", "upper_arm_L"],
  tricep:     ["upper_arm_R", "upper_arm_L", "lower_arm_R", "lower_arm_L"],
  back:       ["torso"],
  core:       ["torso"],
  chest:      ["upper_arm_R", "upper_arm_L"],
  forearm:    ["lower_arm_R", "lower_arm_L"],
};

// ── COMPONENT ────────────────────────────────────────────────────────────────

type Props = {
  pose: Pose;
  accent?: string;
  highlightColor?: string;
  highlightSegments?: string[];
};

function dim(hex: string, amount = 0.28): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * (1 - amount));
  const g = Math.round(((n >> 8) & 0xff) * (1 - amount));
  const b = Math.round((n & 0xff) * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

export function HumanFigure({
  pose,
  accent = "#4F46E5",
  highlightColor = "#F59E0B",
  highlightSegments = [],
}: Props) {
  const pos = computeFK(pose);
  const accentDark = dim(accent);
  const highlightDark = dim(highlightColor);

  const sorted = [...RENDER_SEGMENTS].sort((a, b) => a.zLayer - b.zLayer);

  function segColor(id: string) {
    return highlightSegments.includes(id) ? highlightColor : accent;
  }
  function segJoint(id: string) {
    return highlightSegments.includes(id) ? highlightDark : accentDark;
  }

  const headPos = pos["neck"]; // head circle sits at neck endpoint

  return (
    <g>
      {/* Limb segments — ordered by z-layer */}
      {sorted.map((seg) => {
        const a = pos[seg.from];
        const b = pos[seg.to];
        if (!a || !b) return null;
        const color = segColor(seg.id);
        return (
          <line
            key={seg.id}
            x1={a.x} y1={a.y}
            x2={b.x} y2={b.y}
            stroke={color}
            strokeWidth={seg.width}
            strokeLinecap="round"
          />
        );
      })}

      {/* Joint articulation dots */}
      {(["knee_R", "knee_L", "elbow_R", "elbow_L"] as const).map((j) => {
        const p = pos[j];
        if (!p) return null;
        const isR = j.endsWith("_R");
        const isKnee = j.startsWith("knee");
        const segId = isKnee
          ? isR ? "thigh_R" : "thigh_L"
          : isR ? "upper_arm_R" : "upper_arm_L";
        return (
          <circle
            key={j}
            cx={p.x} cy={p.y}
            r={isKnee ? (isR ? 14 : 12) : (isR ? 11 : 10)}
            fill={segJoint(segId)}
          />
        );
      })}

      {/* Wrist / hand dots */}
      {(["wrist_R", "wrist_L"] as const).map((j) => {
        const p = pos[j];
        if (!p) return null;
        const segId = j === "wrist_R" ? "lower_arm_R" : "lower_arm_L";
        return (
          <circle key={j} cx={p.x} cy={p.y} r={j === "wrist_R" ? 10 : 8} fill={segJoint(segId)} />
        );
      })}

      {/* Ankle / foot dots */}
      {(["ankle_R", "ankle_L"] as const).map((j) => {
        const p = pos[j];
        if (!p) return null;
        const segId = j === "ankle_R" ? "shin_R" : "shin_L";
        return (
          <circle key={j} cx={p.x} cy={p.y} r={j === "ankle_R" ? 11 : 9} fill={segJoint(segId)} />
        );
      })}

      {/* Head */}
      {headPos && (
        <>
          <circle cx={headPos.x} cy={headPos.y} r={34} fill={accent} />
          {/* Eyes — offset forward (left, figure faces left) */}
          <circle cx={headPos.x - 12} cy={headPos.y - 7} r={5} fill={accentDark} opacity={0.6} />
          <circle cx={headPos.x + 5}  cy={headPos.y - 7} r={5} fill={accentDark} opacity={0.6} />
        </>
      )}
    </g>
  );
}
