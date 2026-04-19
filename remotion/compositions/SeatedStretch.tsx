import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

type Side = "left" | "right" | "both";
type Target = "hamstring" | "quad" | "calf";
type HandPos = "toes" | "shin" | "knee";

type Props = {
  side?: Side;
  target?: Target;
  durationSeconds?: number;
  handPosition?: HandPos;
  defaultAccent?: string;
};

// Hip is the pivot point for the torso lean
const HIP_X = 400;
const HIP_Y = 354;
const CHAIR_COLOR = "#94A3B8";
const CHAIR_DARK = "#64748B";

function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lp(
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number
) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

// Darken a hex color by blending toward black
function dim(hex: string, amount = 0.28): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * (1 - amount));
  const g = Math.round(((n >> 8) & 0xff) * (1 - amount));
  const b = Math.round((n & 0xff) * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

export function SeatedStretch({
  side = "right",
  target = "hamstring",
  durationSeconds = 6,
  handPosition = "shin",
  defaultAccent = "#4F46E5",
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = fps * durationSeconds;
  const loopFrame = frame % totalFrames;

  // Animation curve: hold neutral → ease into stretch → hold stretch → ease back → hold
  const t = interpolate(
    loopFrame,
    [
      0,
      totalFrames * 0.15,
      totalFrames * 0.47,
      totalFrames * 0.68,
      totalFrames * 0.90,
      totalFrames - 1,
    ],
    [0, 0, 1, 1, 0, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );

  // Lean angle depends on which muscle is targeted
  const leanTarget =
    target === "quad" ? 8 : target === "calf" ? -22 : -40;
  const leanAngle = lerp(0, leanTarget, t);

  const accent = defaultAccent;
  const accentDark = dim(accent);
  const highlight = "#F59E0B";
  const highlightDark = dim(highlight);

  // Color each limb based on which side is stretching
  const nearColor = side === "right" || side === "both" ? highlight : accent;
  const farColor = side === "left" || side === "both" ? highlight : accent;
  const nearArmColor = side === "right" || side === "both" ? highlight : accent;
  const farArmColor = side === "left" || side === "both" ? highlight : accent;
  const nearJoint = nearColor === highlight ? highlightDark : accentDark;
  const farJoint = farColor === highlight ? highlightDark : accentDark;
  const nearArmJoint = nearArmColor === highlight ? highlightDark : accentDark;
  const farArmJoint = farArmColor === highlight ? highlightDark : accentDark;

  // Shoulder world positions derived from the torso rotation
  // In local (pre-rotation) space: right shoulder at (HIP_X-34, HIP_Y-140)
  const shR = rotatePoint(HIP_X - 34, HIP_Y - 140, HIP_X, HIP_Y, leanAngle);
  const shL = rotatePoint(HIP_X + 34, HIP_Y - 140, HIP_X, HIP_Y, leanAngle);

  // ── LEGS ──
  // Near leg (right) extends slightly forward during stretch
  const kneeR = lp({ x: 308, y: 366 }, { x: 292, y: 366 }, t);
  const ankleR = lp({ x: 304, y: 450 }, { x: 288, y: 452 }, t);
  const toeR = lp({ x: 268, y: 462 }, { x: 252, y: 464 }, t);
  // Far leg (left) stays mostly static but shifts slightly
  const kneeL = lp({ x: 492, y: 366 }, { x: 508, y: 366 }, t);
  const ankleL = { x: 496, y: 450 };
  const toeL = { x: 532, y: 462 };

  // ── ARMS ──
  // Neutral arm positions
  const elbowR_n = { x: 338, y: 302 };
  const handR_n = { x: 334, y: 358 };
  const elbowL_n = { x: 462, y: 302 };
  const handL_n = { x: 466, y: 358 };

  // Reach targets toward near foot (right side)
  const reachNear: Record<HandPos, { elbow: { x: number; y: number }; hand: { x: number; y: number } }> = {
    knee: { elbow: { x: 294, y: 310 }, hand: { x: 296, y: 366 } },
    shin: { elbow: { x: 278, y: 336 }, hand: { x: 284, y: 428 } },
    toes: { elbow: { x: 262, y: 374 }, hand: { x: 254, y: 462 } },
  };
  // Reach targets toward far foot (left side, mirrored)
  const reachFar: Record<HandPos, { elbow: { x: number; y: number }; hand: { x: number; y: number } }> = {
    knee: { elbow: { x: 506, y: 310 }, hand: { x: 504, y: 366 } },
    shin: { elbow: { x: 522, y: 336 }, hand: { x: 516, y: 428 } },
    toes: { elbow: { x: 538, y: 374 }, hand: { x: 546, y: 462 } },
  };
  // Balance arm targets (non-stretching arm lifts slightly for counterbalance)
  const balR = { elbow: { x: 344, y: 288 }, hand: { x: 352, y: 316 } };
  const balL = { elbow: { x: 468, y: 288 }, hand: { x: 476, y: 314 } };

  const elbowR = lp(
    elbowR_n,
    side === "left" ? balR.elbow : reachNear[handPosition].elbow,
    t
  );
  const handR = lp(
    handR_n,
    side === "left" ? balR.hand : reachNear[handPosition].hand,
    t
  );
  const elbowL = lp(
    elbowL_n,
    side === "right" ? balL.elbow : reachFar[handPosition].elbow,
    t
  );
  const handL = lp(
    handL_n,
    side === "right" ? balL.hand : reachFar[handPosition].hand,
    t
  );

  const targetLabel =
    target === "hamstring" ? "HAMSTRING" :
    target === "quad" ? "QUAD" : "CALF";
  const sideLabel =
    side === "both" ? "BILATERAL" : `${side.toUpperCase()} SIDE`;

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8F7F4" }}>
      <svg width={800} height={600} viewBox="0 0 800 600">

        {/* ── CHAIR ── */}
        {/* Backrest post */}
        <rect x={514} y={222} width={24} height={144} rx={9} fill={CHAIR_DARK} />
        {/* Seat */}
        <rect x={258} y={352} width={278} height={26} rx={9} fill={CHAIR_COLOR} />
        {/* Front chair leg */}
        <rect x={266} y={376} width={16} height={76} rx={7} fill={CHAIR_DARK} />
        {/* Back chair leg */}
        <rect x={510} y={376} width={16} height={76} rx={7} fill={CHAIR_DARK} />

        {/* ── FAR LEG (left, behind figure) ── */}
        <line
          x1={HIP_X + 24} y1={HIP_Y}
          x2={kneeL.x} y2={kneeL.y}
          stroke={farColor} strokeWidth={28} strokeLinecap="round"
        />
        <line
          x1={kneeL.x} y1={kneeL.y}
          x2={ankleL.x} y2={ankleL.y}
          stroke={farColor} strokeWidth={24} strokeLinecap="round"
        />
        <line
          x1={ankleL.x} y1={ankleL.y}
          x2={toeL.x} y2={toeL.y}
          stroke={farColor} strokeWidth={20} strokeLinecap="round"
        />
        <circle cx={kneeL.x} cy={kneeL.y} r={13} fill={farJoint} />
        <circle cx={ankleL.x} cy={ankleL.y} r={10} fill={farJoint} />

        {/* ── NEAR LEG (right, toward viewer) ── */}
        <line
          x1={HIP_X - 24} y1={HIP_Y}
          x2={kneeR.x} y2={kneeR.y}
          stroke={nearColor} strokeWidth={32} strokeLinecap="round"
        />
        <line
          x1={kneeR.x} y1={kneeR.y}
          x2={ankleR.x} y2={ankleR.y}
          stroke={nearColor} strokeWidth={28} strokeLinecap="round"
        />
        <line
          x1={ankleR.x} y1={ankleR.y}
          x2={toeR.x} y2={toeR.y}
          stroke={nearColor} strokeWidth={24} strokeLinecap="round"
        />
        <circle cx={kneeR.x} cy={kneeR.y} r={15} fill={nearJoint} />
        <circle cx={ankleR.x} cy={ankleR.y} r={11} fill={nearJoint} />

        {/* ── FAR ARM (left) ── */}
        <line
          x1={shL.x} y1={shL.y}
          x2={elbowL.x} y2={elbowL.y}
          stroke={farArmColor} strokeWidth={24} strokeLinecap="round"
        />
        <line
          x1={elbowL.x} y1={elbowL.y}
          x2={handL.x} y2={handL.y}
          stroke={farArmColor} strokeWidth={20} strokeLinecap="round"
        />
        <circle cx={elbowL.x} cy={elbowL.y} r={11} fill={farArmJoint} />
        <circle cx={handL.x} cy={handL.y} r={9} fill={farArmJoint} />

        {/* ── TORSO GROUP — rotates around hip pivot ── */}
        <g transform={`rotate(${leanAngle}, ${HIP_X}, ${HIP_Y})`}>
          {/* Body / torso capsule */}
          <rect
            x={HIP_X - 34}
            y={HIP_Y - 152}
            width={68}
            height={152}
            rx={28}
            fill={accent}
          />
          {/* Neck */}
          <rect
            x={HIP_X - 11}
            y={HIP_Y - 170}
            width={22}
            height={28}
            rx={9}
            fill={accent}
          />
          {/* Head */}
          <circle cx={HIP_X} cy={HIP_Y - 198} r={36} fill={accent} />
          {/* Eyes — offset forward (left) since figure faces left */}
          <circle
            cx={HIP_X - 12}
            cy={HIP_Y - 206}
            r={5}
            fill={accentDark}
            opacity={0.65}
          />
          <circle
            cx={HIP_X + 6}
            cy={HIP_Y - 206}
            r={5}
            fill={accentDark}
            opacity={0.65}
          />
        </g>

        {/* ── NEAR ARM (right, drawn on top of torso) ── */}
        <line
          x1={shR.x} y1={shR.y}
          x2={elbowR.x} y2={elbowR.y}
          stroke={nearArmColor} strokeWidth={28} strokeLinecap="round"
        />
        <line
          x1={elbowR.x} y1={elbowR.y}
          x2={handR.x} y2={handR.y}
          stroke={nearArmColor} strokeWidth={24} strokeLinecap="round"
        />
        <circle cx={elbowR.x} cy={elbowR.y} r={13} fill={nearArmJoint} />
        <circle cx={handR.x} cy={handR.y} r={11} fill={nearArmJoint} />

        {/* ── LABEL ── */}
        <text
          x={400}
          y={546}
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize={17}
          fontWeight={600}
          fill="#64748B"
          letterSpacing="0.06em"
        >
          {`SEATED ${targetLabel} STRETCH · ${sideLabel}`}
        </text>
      </svg>
    </AbsoluteFill>
  );
}
