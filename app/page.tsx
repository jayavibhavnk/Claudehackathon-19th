"use client";

import { useState, useCallback } from "react";
import { DropZone } from "@/components/DropZone";
import { LoadingState } from "@/components/LoadingState";
import { ExerciseCard } from "@/components/ExerciseCard";
import type { PTExercise } from "@/lib/schemas/pt-exercise";
import type { ExerciseAnimationData } from "@/lib/schemas/pose";
import {
  ShieldCheck,
  Zap,
  Volume2,
  FileUp,
  Sparkles,
  Play,
  ChevronRight,
} from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

type ExerciseResult = {
  exercise: PTExercise;
  animation: ExerciseAnimationData | null;
  animationError?: string;
  demoKey?: string | null;
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

const GITHUB_URL = "https://github.com/jayavibhavnk/Claudehackathon-19th";

const FEATURES = [
  {
    icon: ShieldCheck,
    label: "Not stored",
    sub: "Files deleted after processing",
  },
  {
    icon: Zap,
    label: "< 30 seconds",
    sub: "From upload to animation",
  },
  {
    icon: Volume2,
    label: "Voice guidance",
    sub: "Reads cues aloud for you",
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    icon: FileUp,
    title: "Upload",
    desc: "Drop your PT prescription",
  },
  {
    num: "02",
    icon: Sparkles,
    title: "Extract",
    desc: "Claude reads and structures every exercise",
  },
  {
    num: "03",
    icon: Play,
    title: "Animate",
    desc: "Each step becomes an animated tutorial",
  },
];

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

  const handleSample = useCallback(() => runExtraction(callSample), [runExtraction]);
  const handleReset = useCallback(() => setPhase({ type: "idle" }), []);

  return (
    <div
      className="min-h-screen font-sans"
      style={{
        background: "linear-gradient(160deg, #FAFAFC 0%, #F5F3FF 100%)",
      }}
    >
      {/* ── Top nav ── */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-indigo-600 tracking-tight">
              Steplet
            </span>
            <span className="hidden sm:inline text-[10px] font-semibold text-indigo-400 border border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded-full">
              beta
            </span>
          </a>

          <nav className="flex items-center gap-1 sm:gap-4">
            {phase.type === "idle" && (
              <a
                href="#how-it-works"
                className="text-xs sm:text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1"
              >
                How it works
              </a>
            )}
            {phase.type === "results" && (
              <button
                onClick={handleReset}
                className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                ← New upload
              </button>
            )}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-700 transition-colors p-1.5"
              aria-label="GitHub"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-24">
        {/* ── IDLE ── */}
        {phase.type === "idle" && (
          <div className="pt-14 space-y-10">
            {/* Hero */}
            <div className="text-center space-y-4">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-[11px] font-semibold px-3.5 py-1.5 rounded-full border border-indigo-100">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse-dot" />
                AI-powered PT companion
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                Turn any PT prescription
                <br className="hidden sm:block" />
                {" into "}
                <span
                  style={{
                    background: "linear-gradient(90deg, #4F46E5, #7C3AED)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  animated
                </span>
                {" tutorials"}
              </h1>

              <p className="text-base text-slate-500 max-w-sm mx-auto leading-relaxed">
                Upload your physical therapy sheet and watch each exercise come
                to life — with step-by-step animations and voice guidance.
              </p>
            </div>

            {/* Upload */}
            <DropZone onFile={handleFile} />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-medium text-slate-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Sample CTA */}
            <button
              onClick={handleSample}
              className="group w-full py-3.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 rounded-xl border border-indigo-200 hover:border-indigo-300 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm"
            >
              Try with example prescription
              <ChevronRight
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </button>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FEATURES.map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 mb-3">
                    <Icon className="w-5 h-5 text-indigo-500" strokeWidth={1.75} />
                  </div>
                  <div className="text-sm font-semibold text-slate-800 leading-tight">
                    {label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {sub}
                  </div>
                </div>
              ))}
            </div>

            {/* How it works */}
            <section
              id="how-it-works"
              className="rounded-2xl bg-indigo-50/60 border border-indigo-100 px-6 py-8"
            >
              <h2 className="text-center text-xs font-bold uppercase tracking-widest text-indigo-400 mb-8">
                How it works
              </h2>

              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8 sm:gap-4">
                {HOW_IT_WORKS.map(({ num, icon: Icon, title, desc }, i) => (
                  <div key={num} className="flex sm:flex-col items-center sm:items-center gap-4 sm:gap-3 flex-1 relative">
                    {/* Connector line between steps (desktop only) */}
                    {i < HOW_IT_WORKS.length - 1 && (
                      <div className="hidden sm:block absolute top-8 left-[calc(50%+28px)] right-[calc(-50%+28px)] h-px bg-indigo-200" />
                    )}

                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-indigo-300 tracking-widest">
                        {num}
                      </span>
                      <div className="w-12 h-12 rounded-xl bg-white border border-indigo-100 shadow-sm flex items-center justify-center">
                        <Icon className="w-5 h-5 text-indigo-500" strokeWidth={1.75} />
                      </div>
                    </div>

                    <div className="sm:text-center">
                      <p className="text-sm font-semibold text-slate-800">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── LOADING ── */}
        {phase.type === "loading" && <LoadingState />}

        {/* ── RESULTS ── */}
        {phase.type === "results" && (
          <div className="pt-8 space-y-6">
            {/* Results header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">Your exercises</h2>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                  {phase.exercises.length} exercise{phase.exercises.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Ready
                </span>
                <button
                  onClick={handleReset}
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  Start over
                </button>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-6">
              {phase.exercises.map(({ exercise, animation, demoKey }) => (
                <ExerciseCard
                  key={exercise.step_number}
                  exercise={exercise}
                  animation={animation}
                  demoKey={demoKey}
                />
              ))}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-gray-100 transition-colors"
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
              <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
              <p className="text-sm text-slate-500 max-w-xs">{phase.message}</p>
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

      {/* ── Footer ── */}
      {phase.type === "idle" && (
        <footer className="border-t border-gray-100 bg-white/60 backdrop-blur-sm py-5">
          <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-slate-400">
            <span>Built at SoCal Claude Hackathon 2026</span>
            <span className="hidden sm:inline text-slate-200">·</span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-700 transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              GitHub
            </a>
            <span className="hidden sm:inline text-slate-200">·</span>
            <span>Powered by Claude</span>
          </div>
        </footer>
      )}
    </div>
  );
}
