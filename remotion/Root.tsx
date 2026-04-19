import { Composition } from "remotion";
import { HelloStep } from "./HelloStep";

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
    </>
  );
}
