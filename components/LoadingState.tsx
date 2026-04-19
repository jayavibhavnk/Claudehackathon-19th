"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const STEPS = [
  { label: "Reading your prescription", sublabel: "Analyzing the image…" },
  { label: "Extracting exercises", sublabel: "Parsing reps, sets & cues…" },
  { label: "Finding animations", sublabel: "Matching to keyframe rig…" },
  { label: "Almost ready", sublabel: "Polishing the final frames…" },
];

export function LoadingState() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIdx((i) => Math.min(i + 1, STEPS.length - 1));
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-10 py-16">
      {/* Step tracker */}
      <div className="w-full max-w-sm space-y-3">
        {STEPS.map((step, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div
              key={i}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                active ? "bg-indigo-50 border border-indigo-100" : "opacity-40",
              ].join(" ")}
            >
              {/* State indicator */}
              <div
                className={[
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                  done
                    ? "bg-indigo-500"
                    : active
                    ? "bg-indigo-100 border-2 border-indigo-400"
                    : "bg-gray-100 border-2 border-gray-200",
                ].join(" ")}
              >
                {done ? (
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                ) : active ? (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                ) : null}
              </div>

              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold leading-none ${
                    active ? "text-indigo-700" : "text-slate-500"
                  }`}
                >
                  {step.label}
                </p>
                {active && (
                  <p className="text-xs text-indigo-400 mt-0.5">{step.sublabel}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-56 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-indigo-500 rounded-full animate-bar-slide" />
      </div>

      {/* Skeleton cards */}
      <div className="w-full space-y-5">
        {[1, 0.7, 0.45].map((opacity, i) => (
          <div
            key={i}
            className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
            style={{ opacity }}
          >
            <div className="bg-gray-100 animate-pulse" style={{ aspectRatio: "4/3" }} />
            <div className="p-6 space-y-3">
              <div className="h-5 bg-gray-100 rounded-lg animate-pulse w-2/5" />
              <div className="flex gap-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 bg-gray-100 rounded-xl animate-pulse flex-1" />
                ))}
              </div>
              <div className="space-y-2 pt-1">
                <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
