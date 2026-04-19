"use client";

import { useState, useCallback } from "react";
import { DropZone } from "@/components/DropZone";
import { LoadingState } from "@/components/LoadingState";
import { ExerciseCard } from "@/components/ExerciseCard";
import type { PTExercise } from "@/lib/schemas/pt-exercise";
import type { ExerciseAnimationData } from "@/lib/schemas/pose";

type ExerciseResult = {
  exercise: PTExercise;
  animation: ExerciseAnimationData | null;
  animationError?: string;
};

type Phase =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "results"; exercises: ExerciseResult[] }
  | { type: "error"; message: string };

async function callExtract(formData: FormData): Promise<ExerciseResult[]> {
  const res = await fetch("/api/extract", { method: "POST", body: formData });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Unknown error");
  return json.exercises;
}

async function callSample(): Promise<ExerciseResult[]> {
  const res = await fetch("/api/sample");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Unknown error");
  return json.exercises;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>({ type: "idle" });

  const runExtraction = useCallback(async (fn: () => Promise<ExerciseResult[]>) => {
    setPhase({ type: "loading" });
    try {
      const exercises = await fn();
      setPhase({ type: "results", exercises });
    } catch (err) {
      setPhase({
        type: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const fd = new FormData();
      fd.append("image", file);
      runExtraction(() => callExtract(fd));
    },
    [runExtraction]
  );

  const handleSample = useCallback(() => {
    runExtraction(callSample);
  }, [runExtraction]);

  const handleReset = useCallback(() => setPhase({ type: "idle" }), []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-indigo-600 tracking-tight">
              Steplet
            </span>
            <span className="hidden sm:inline text-xs font-medium text-gray-300 border border-gray-200 px-2 py-0.5 rounded-full">
              beta
            </span>
          </div>
          {phase.type === "results" && (
            <button
              onClick={handleReset}
              className="text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors"
            >
              ← New upload
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-20">
        {/* ── IDLE: hero + upload ── */}
        {phase.type === "idle" && (
          <div className="pt-12 space-y-8">
            {/* Hero */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                AI-powered PT companion
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight">
                Turn any PT prescription
                <br className="hidden sm:block" /> into animated tutorials
              </h1>
              <p className="text-base text-gray-500 max-w-sm mx-auto">
                Upload your physical therapy sheet and watch each exercise come
                to life — with step-by-step animations and voice guidance.
              </p>
            </div>

            {/* Upload area */}
            <DropZone onFile={handleFile} />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-medium text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Sample button */}
            <button
              onClick={handleSample}
              className="w-full py-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl border border-indigo-100 transition-colors"
            >
              Try with example prescription →
            </button>

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: "🔒", label: "Not stored", sub: "Files deleted after processing" },
                { icon: "⚡", label: "< 30 seconds", sub: "From upload to animation" },
                { icon: "🎙️", label: "Voice guidance", sub: "Reads cues aloud for you" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm"
                >
                  <div className="text-xl mb-1">{item.icon}</div>
                  <div className="text-xs font-semibold text-gray-700">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {item.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {phase.type === "loading" && <LoadingState />}

        {/* ── RESULTS ── */}
        {phase.type === "results" && (
          <div className="pt-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Your exercises
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {phase.exercises.length} exercise
                  {phase.exercises.length !== 1 ? "s" : ""} found
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Ready
              </span>
            </div>

            {phase.exercises.map(({ exercise, animation }) => (
              <ExerciseCard
                key={exercise.step_number}
                exercise={exercise}
                animation={animation}
              />
            ))}

            <button
              onClick={handleReset}
              className="w-full py-3 text-sm font-semibold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-gray-100 transition-colors"
            >
              Upload a different prescription
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase.type === "error" && (
          <div className="pt-20 flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-3xl">
              ⚠️
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-500 max-w-xs">{phase.message}</p>
            </div>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
