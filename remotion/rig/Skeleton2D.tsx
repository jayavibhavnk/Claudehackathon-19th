import React from "react";

// Segment lengths (px)
const HEAD_R = 14;
const NECK = 20;
const SPINE = 40;
const SHOULDER_W = 18; // half of 36
const HIP_W = 14;      // half of 28
const UPPER_ARM = 38;
const FOREARM = 32;
const THIGH = 46;
const SHIN = 42;

export interface Skeleton2DPose {
  shoulder_L_elev?: number;  // px, positive = shrug up
  shoulder_R_elev?: number;
  upper_arm_L?: number;      // degrees from vertical, CW positive
  upper_arm_R?: number;
  forearm_L?: number;
  forearm_R?: number;
  thigh_L?: number;
  thigh_R?: number;
  shin_L?: number;
  shin_R?: number;
}

export interface Skeleton2DKeyframe {
  time: number;
  pose: Skeleton2DPose;
}

interface Pt { x: number; y: number; }

function tip(from: Pt, deg: number, len: number): Pt {
  const r = (deg * Math.PI) / 180;
  return { x: from.x + len * Math.sin(r), y: from.y + len * Math.cos(r) };
}

function dimHex(hex: string, factor = 0.62): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 0xff) * factor);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

interface Props {
  rootX?: number;
  rootY?: number;
  pose?: Skeleton2DPose;
  accent?: string;
  highlightParts?: string[];
  heldObject?: "dumbbell" | null;
}

export function Skeleton2D({
  rootX = 400,
  rootY = 90,
  pose = {},
  accent = "#4F46E5",
  highlightParts = [],
  heldObject = null,
}: Props) {
  const hl = new Set(highlightParts);
  const hlColor = "#F59E0B";
  const dimC = dimHex(accent);
  const isHl = (...keys: string[]) => keys.some(k => hl.has(k));
  const armColor = isHl("shoulder", "arms") ? hlColor : accent;
  const armDim   = isHl("shoulder", "arms") ? dimHex(hlColor) : dimC;

  // Anchor positions
  const head: Pt = { x: rootX, y: rootY + HEAD_R };
  const sSrc: Pt = { x: rootX, y: rootY + HEAD_R * 2 + NECK };
  const pelv: Pt = { x: rootX, y: sSrc.y + SPINE };

  // Shoulder joints (elevate for shrug)
  const lElev = pose.shoulder_L_elev ?? 0;
  const rElev = pose.shoulder_R_elev ?? 0;
  const sL: Pt = { x: sSrc.x - SHOULDER_W, y: sSrc.y - lElev };
  const sR: Pt = { x: sSrc.x + SHOULDER_W, y: sSrc.y - rElev };

  // Arms
  const eL = tip(sL, pose.upper_arm_L ?? 0, UPPER_ARM);
  const eR = tip(sR, pose.upper_arm_R ?? 0, UPPER_ARM);
  const wL = tip(eL, pose.forearm_L ?? 0, FOREARM);
  const wR = tip(eR, pose.forearm_R ?? 0, FOREARM);

  // Legs
  const hL: Pt = { x: pelv.x - HIP_W, y: pelv.y };
  const hR: Pt = { x: pelv.x + HIP_W, y: pelv.y };
  const kL = tip(hL, pose.thigh_L ?? 0, THIGH);
  const kR = tip(hR, pose.thigh_R ?? 0, THIGH);
  const aL = tip(kL, pose.shin_L ?? 0, SHIN);
  const aR = tip(kR, pose.shin_R ?? 0, SHIN);

  const seg = (a: Pt, b: Pt, color: string, w: number) => (
    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
      stroke={color} strokeWidth={w} strokeLinecap="round" />
  );
  const dot = (p: Pt, r: number, color: string) => (
    <circle cx={p.x} cy={p.y} r={r} fill={color} />
  );

  return (
    <g>
      {/* Far (L) limbs — drawn first so near (R) limbs appear in front */}
      {seg(hL, kL, dimC, 12)} {seg(kL, aL, dimC, 12)}
      {seg(sL, eL, armDim, 12)} {seg(eL, wL, armDim, 12)}

      {/* Torso */}
      {seg(sL, sR, accent, 20)}
      {seg(sSrc, pelv, accent, 22)}
      {seg(hL, hR, accent, 16)}

      {/* Near (R) limbs */}
      {seg(hR, kR, accent, 16)} {seg(kR, aR, accent, 16)}
      {seg(sR, eR, armColor, 14)} {seg(eR, wR, armColor, 14)}

      {/* Joint dots */}
      {dot(eL, 5, dimC)} {dot(eR, 6, dimC)}
      {dot(kL, 5, dimC)} {dot(kR, 6, dimC)}
      {dot(wL, 4, dimC)} {dot(wR, 5, dimC)}
      {dot(aL, 5, dimC)} {dot(aR, 6, dimC)}

      {/* Dumbbells */}
      {heldObject === "dumbbell" && [wL, wR].map((w, i) => (
        <g key={i} transform={`translate(${w.x},${w.y})`}>
          <rect x={-12} y={-4} width={24} height={8} rx={4} fill="#94A3B8" />
          <rect x={-15} y={-7} width={7} height={14} rx={3} fill="#64748B" />
          <rect x={8} y={-7} width={7} height={14} rx={3} fill="#64748B" />
        </g>
      ))}

      {/* Head */}
      <circle cx={head.x} cy={head.y} r={HEAD_R} fill={accent} />
    </g>
  );
}
