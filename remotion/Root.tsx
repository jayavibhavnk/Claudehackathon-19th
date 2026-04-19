import { Composition } from "remotion";
import { HelloStep } from "./HelloStep";
import { ExerciseAnimation } from "./compositions/ExerciseAnimation";
import { ShoulderAnimation } from "./compositions/ShoulderAnimation";
import {
  SEATED_HAMSTRING,
  STANDING_QUAD,
  SEATED_SHOULDER_ER,
} from "./demoKeyframes";
import {
  SHOULDER_SHRUGS,
  RESISTIVE_SHOULDER_SHRUGS,
  CORNER_STRETCH,
  PRONE_SCAPULAR,
} from "./rig/shoulder-animations";

const SHARED = { fps: 30, width: 800, height: 600, durationInFrames: 180 };

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="HelloStep"
        component={HelloStep}
        durationInFrames={90}
        fps={30}
        width={1280}
        height={720}
      />

      <Composition
        id="SeatedHamstringStretch"
        component={ExerciseAnimation}
        {...SHARED}
        defaultProps={{
          keyframes: SEATED_HAMSTRING,
          durationSeconds: 6,
          label: "Seated Hamstring Stretch · Right Side",
          highlightParts: ["hamstring"],
          supportObject: "chair" as const,
          accent: "#4F46E5",
        }}
      />

      <Composition
        id="StandingQuadStretch"
        component={ExerciseAnimation}
        {...SHARED}
        defaultProps={{
          keyframes: STANDING_QUAD,
          durationSeconds: 6,
          label: "Standing Quad Stretch · Right Leg",
          highlightParts: ["quad"],
          supportObject: null,
          accent: "#4F46E5",
        }}
      />

      <Composition
        id="SeatedShoulderExternalRotation"
        component={ExerciseAnimation}
        {...SHARED}
        defaultProps={{
          keyframes: SEATED_SHOULDER_ER,
          durationSeconds: 6,
          label: "Seated Shoulder External Rotation · Right",
          highlightParts: ["shoulder", "forearm"],
          supportObject: "chair" as const,
          accent: "#4F46E5",
        }}
      />

      <Composition
        id="ShoulderShrugs"
        component={ShoulderAnimation}
        {...SHARED}
        defaultProps={{
          keyframes: SHOULDER_SHRUGS,
          durationSeconds: 6,
          label: "Shoulder Shrugs",
          highlightParts: ["shoulder"],
          supportObject: null,
          heldObject: null,
          accent: "#4F46E5",
        }}
      />

      <Composition
        id="ResistiveShoulderShrugs"
        component={ShoulderAnimation}
        {...SHARED}
        defaultProps={{
          keyframes: RESISTIVE_SHOULDER_SHRUGS,
          durationSeconds: 6,
          label: "Resistive Shoulder Shrugs",
          highlightParts: ["shoulder"],
          supportObject: null,
          heldObject: "dumbbell" as const,
          accent: "#4F46E5",
        }}
      />

      <Composition
        id="CornerStretch"
        component={ShoulderAnimation}
        {...SHARED}
        defaultProps={{
          keyframes: CORNER_STRETCH,
          durationSeconds: 6,
          label: "Corner Stretch",
          highlightParts: ["shoulder", "arms"],
          supportObject: "wall" as const,
          heldObject: null,
          accent: "#4F46E5",
        }}
      />

      <Composition
        id="ProneScapularStabilization"
        component={ShoulderAnimation}
        {...SHARED}
        defaultProps={{
          keyframes: PRONE_SCAPULAR,
          durationSeconds: 6,
          label: "Prone Scapular Stabilization",
          highlightParts: ["shoulder"],
          supportObject: "floor" as const,
          heldObject: null,
          accent: "#4F46E5",
        }}
      />
    </>
  );
}
