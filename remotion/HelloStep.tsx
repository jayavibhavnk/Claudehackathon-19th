import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export function HelloStep() {
  const frame = useCurrentFrame();

  // Gentle breathing bob over 90 frames (3s @ 30fps)
  const bodyY = interpolate(frame, [0, 45, 90], [0, -6, 0]);
  const armAngle = interpolate(frame, [0, 45, 90], [30, 45, 30]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontFamily: "sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: "#f8fafc",
          letterSpacing: "-0.5px",
        }}
      >
        Steplet
      </div>

      {/* Stick figure */}
      <svg
        width="120"
        height="200"
        viewBox="0 0 120 200"
        style={{ transform: `translateY(${bodyY}px)` }}
      >
        {/* Head */}
        <circle cx="60" cy="30" r="18" fill="none" stroke="#38bdf8" strokeWidth="3" />

        {/* Body */}
        <line x1="60" y1="48" x2="60" y2="120" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

        {/* Left arm */}
        <line
          x1="60"
          y1="70"
          x2={60 - Math.cos((armAngle * Math.PI) / 180) * 35}
          y2={70 + Math.sin((armAngle * Math.PI) / 180) * 35}
          stroke="#38bdf8"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Right arm */}
        <line
          x1="60"
          y1="70"
          x2={60 + Math.cos((armAngle * Math.PI) / 180) * 35}
          y2={70 + Math.sin((armAngle * Math.PI) / 180) * 35}
          stroke="#38bdf8"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Left leg */}
        <line x1="60" y1="120" x2="35" y2="175" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

        {/* Right leg */}
        <line x1="60" y1="120" x2="85" y2="175" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {/* Step label */}
      <div
        style={{
          fontFamily: "sans-serif",
          fontSize: 16,
          color: "#94a3b8",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Step 1 · Placeholder
      </div>
    </AbsoluteFill>
  );
}
