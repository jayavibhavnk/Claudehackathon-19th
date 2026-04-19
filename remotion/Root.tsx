import { Composition } from "remotion";
import { HelloStep } from "./HelloStep";
import { ExerciseAnimation } from "./compositions/ExerciseAnimation";
import {
  SEATED_HAMSTRING,
  STANDING_QUAD,
  SEATED_SHOULDER_ER,
} from "./demoKeyframes";

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
    </>
  );
}
