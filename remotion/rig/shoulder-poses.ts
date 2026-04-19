import type { Skeleton2DPose } from "./Skeleton2D";

export const standingNeutral: Skeleton2DPose = {
  shoulder_L_elev: 0,
  shoulder_R_elev: 0,
  upper_arm_L: 0,
  upper_arm_R: 0,
  forearm_L: 0,
  forearm_R: 0,
  thigh_L: 0,
  thigh_R: 0,
  shin_L: 0,
  shin_R: 0,
};

// Shoulder shrug — both shoulders elevated toward ears
export const shoulderShrugUp: Skeleton2DPose = {
  shoulder_L_elev: 24,
  shoulder_R_elev: 24,
  upper_arm_L: 0,
  upper_arm_R: 0,
  forearm_L: 0,
  forearm_R: 0,
  thigh_L: 0,
  thigh_R: 0,
  shin_L: 0,
  shin_R: 0,
};

// Corner stretch — approaching corner with arms beginning to lift
export const cornerStretchStart: Skeleton2DPose = {
  shoulder_L_elev: 0,
  shoulder_R_elev: 0,
  upper_arm_L: -25,
  upper_arm_R: 25,
  forearm_L: 0,
  forearm_R: 0,
  thigh_L: 0,
  thigh_R: 0,
  shin_L: 0,
  shin_R: 0,
};

// Corner stretch — arms at ~90° (cactus), forearms hanging, leaning into corner
export const cornerStretchLean: Skeleton2DPose = {
  shoulder_L_elev: 0,
  shoulder_R_elev: 0,
  upper_arm_L: -90,
  upper_arm_R: 90,
  forearm_L: 0,
  forearm_R: 0,
  thigh_L: 0,
  thigh_R: 0,
  shin_L: 0,
  shin_R: 0,
};

// Prone scapular — overhead back-view: arms spread (relaxed)
export const proneNeutral: Skeleton2DPose = {
  shoulder_L_elev: 0,
  shoulder_R_elev: 0,
  upper_arm_L: -50,
  upper_arm_R: 50,
  forearm_L: -20,
  forearm_R: 20,
  thigh_L: 0,
  thigh_R: 0,
  shin_L: 0,
  shin_R: 0,
};

// Prone scapular — arms pulled toward body (scapular retraction)
export const proneScapularLift: Skeleton2DPose = {
  shoulder_L_elev: 0,
  shoulder_R_elev: 0,
  upper_arm_L: -18,
  upper_arm_R: 18,
  forearm_L: -8,
  forearm_R: 8,
  thigh_L: 0,
  thigh_R: 0,
  shin_L: 0,
  shin_R: 0,
};
