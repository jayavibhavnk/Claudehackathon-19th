import type { Skeleton2DKeyframe } from "./Skeleton2D";
import {
  standingNeutral,
  shoulderShrugUp,
  cornerStretchStart,
  cornerStretchLean,
  proneNeutral,
  proneScapularLift,
} from "./shoulder-poses";

export const SHOULDER_SHRUGS: Skeleton2DKeyframe[] = [
  { time: 0,    pose: standingNeutral },
  { time: 0.35, pose: shoulderShrugUp },
  { time: 0.65, pose: shoulderShrugUp },
  { time: 1,    pose: standingNeutral },
];

export const RESISTIVE_SHOULDER_SHRUGS: Skeleton2DKeyframe[] = SHOULDER_SHRUGS;

export const CORNER_STRETCH: Skeleton2DKeyframe[] = [
  { time: 0,   pose: cornerStretchStart },
  { time: 0.4, pose: cornerStretchLean },
  { time: 0.7, pose: cornerStretchLean },
  { time: 1,   pose: cornerStretchStart },
];

export const PRONE_SCAPULAR: Skeleton2DKeyframe[] = [
  { time: 0,    pose: proneNeutral },
  { time: 0.35, pose: proneScapularLift },
  { time: 0.65, pose: proneScapularLift },
  { time: 1,    pose: proneNeutral },
];
