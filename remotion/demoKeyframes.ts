import type { Keyframe } from "../lib/schemas/pose";

// ── SEATED HAMSTRING STRETCH (right side) ────────────────────────────────────
// Figure seated on chair. Torso leans ~35° forward from hip, near arm
// reaches toward shin. Hamstrings highlighted.
export const SEATED_HAMSTRING: Keyframe[] = [
  {
    time: 0,
    pose: {
      root_x: 400, root_y: 355,
      spine_lower: 270, spine_upper: 270, neck: 270,
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 90,  elbow_L: 90,
      wrist_R: 90,  wrist_L: 90,
      hip_R: 180, hip_L: 0,
      knee_R: 180, knee_L: 0,   // thighs horizontal (seated)
      ankle_R: 90, ankle_L: 90, // shins hanging down
    },
  },
  {
    time: 0.35,
    pose: {
      root_x: 400, root_y: 355,
      spine_lower: 238, spine_upper: 233, neck: 253,
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 97,  elbow_L: 83,  // near arm angles toward foot; far arm counter-balances
      wrist_R: 93,  wrist_L: 90,
      hip_R: 180, hip_L: 0,
      knee_R: 180, knee_L: 0,
      ankle_R: 90, ankle_L: 90,
    },
  },
  {
    time: 0.65,
    pose: {
      root_x: 400, root_y: 355,
      spine_lower: 238, spine_upper: 233, neck: 253,
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 97,  elbow_L: 83,
      wrist_R: 93,  wrist_L: 90,
      hip_R: 180, hip_L: 0,
      knee_R: 180, knee_L: 0,
      ankle_R: 90, ankle_L: 90,
    },
  },
  {
    time: 1,
    pose: {
      root_x: 400, root_y: 355,
      spine_lower: 270, spine_upper: 270, neck: 270,
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 90,  elbow_L: 90,
      wrist_R: 90,  wrist_L: 90,
      hip_R: 180, hip_L: 0,
      knee_R: 180, knee_L: 0,
      ankle_R: 90, ankle_L: 90,
    },
  },
];

// ── STANDING QUAD STRETCH (right leg) ────────────────────────────────────────
// Figure stands on left leg, right ankle pulled up behind (shin angle ~300°),
// right arm reaches back to grip ankle. Left arm raised for balance.
export const STANDING_QUAD: Keyframe[] = [
  {
    time: 0,
    pose: {
      root_x: 400, root_y: 290,
      spine_lower: 270, spine_upper: 270, neck: 270,
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 90,  elbow_L: 90,
      wrist_R: 90,  wrist_L: 90,
      hip_R: 180, hip_L: 0,
      knee_R: 90, knee_L: 90,   // legs hanging straight down
      ankle_R: 90, ankle_L: 90,
    },
  },
  {
    time: 0.35,
    pose: {
      root_x: 400, root_y: 290,
      spine_lower: 273, spine_upper: 275, neck: 272,  // very slight back lean
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 71,  elbow_L: 220, // near arm reaches back; far arm rises for balance
      wrist_R: 71,  wrist_L: 200,
      hip_R: 180, hip_L: 0,
      knee_R: 90,  knee_L: 89,   // supporting leg stays grounded
      ankle_R: 302, ankle_L: 89, // shin pulled up and behind (quad stretch)
    },
  },
  {
    time: 0.65,
    pose: {
      root_x: 400, root_y: 290,
      spine_lower: 273, spine_upper: 275, neck: 272,
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 71,  elbow_L: 220,
      wrist_R: 71,  wrist_L: 200,
      hip_R: 180, hip_L: 0,
      knee_R: 90,  knee_L: 89,
      ankle_R: 302, ankle_L: 89,
    },
  },
  {
    time: 1,
    pose: {
      root_x: 400, root_y: 290,
      spine_lower: 270, spine_upper: 270, neck: 270,
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 90,  elbow_L: 90,
      wrist_R: 90,  wrist_L: 90,
      hip_R: 180, hip_L: 0,
      knee_R: 90, knee_L: 90,
      ankle_R: 90, ankle_L: 90,
    },
  },
];

// ── SEATED SHOULDER EXTERNAL ROTATION (right arm) ────────────────────────────
// Seated figure. Upper arm horizontal to the side, elbow bent 90°.
// Forearm rotates from pointing down to pointing up — classic ER exercise.
export const SEATED_SHOULDER_ER: Keyframe[] = [
  {
    time: 0,
    pose: {
      root_x: 400, root_y: 355,
      spine_lower: 270, spine_upper: 270, neck: 270,
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 180,  elbow_L: 90,  // near upper arm goes horizontal to the left
      wrist_R: 90,   wrist_L: 90,  // forearm starts pointing down
      hip_R: 180, hip_L: 0,
      knee_R: 180, knee_L: 0,
      ankle_R: 90, ankle_L: 90,
    },
  },
  {
    time: 0.35,
    pose: {
      root_x: 400, root_y: 355,
      spine_lower: 270, spine_upper: 270, neck: 270,
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 180,  elbow_L: 90,  // elbow stays fixed
      wrist_R: 270,  wrist_L: 90,  // forearm rotates to point up (external rotation)
      hip_R: 180, hip_L: 0,
      knee_R: 180, knee_L: 0,
      ankle_R: 90, ankle_L: 90,
    },
  },
  {
    time: 0.65,
    pose: {
      root_x: 400, root_y: 355,
      spine_lower: 270, spine_upper: 270, neck: 270,
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 180,  elbow_L: 90,
      wrist_R: 270,  wrist_L: 90,
      hip_R: 180, hip_L: 0,
      knee_R: 180, knee_L: 0,
      ankle_R: 90, ankle_L: 90,
    },
  },
  {
    time: 1,
    pose: {
      root_x: 400, root_y: 355,
      spine_lower: 270, spine_upper: 270, neck: 270,
      shoulder_R: 180, shoulder_L: 0,
      elbow_R: 180,  elbow_L: 90,
      wrist_R: 90,   wrist_L: 90,
      hip_R: 180, hip_L: 0,
      knee_R: 180, knee_L: 0,
      ankle_R: 90, ankle_L: 90,
    },
  },
];
