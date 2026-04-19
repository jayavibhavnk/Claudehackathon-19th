"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useEffect, useCallback } from "react";
import type { PlayerRef } from "@remotion/player";
import type { PTExercise } from "@/lib/schemas/pt-exercise";
import type { ExerciseAnimationData } from "@/lib/schemas/pose";
import { ExerciseAnimation } from "@/remotion/compositions/ExerciseAnimation";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

const Player = dynamic(
  () => import("@remotion/player").then((m) => ({ default: m.Player })),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full bg-gray-100 animate-pulse rounded-t-2xl"
        style={{ aspectRatio: "4/3" }}
      />
    ),
  }
);

const POSITION_LABELS: Record<string, string> = {
  seated: "Seated",
  standing: "Standing",
  lying_supine: "Lying · face up",
  lying_prone: "Lying · face down",
  side_lying: "Side lying",
  other: "",
};

function buildSpeechText(ex: PTExercise): string {
  const parts = [ex.name + "."];
  if (ex.reps) parts.push(`${ex.reps} repetitions.`);
  if (ex.sets) parts.push(`${ex.sets} sets.`);
  if (ex.duration_seconds) parts.push(`Hold for ${ex.duration_seconds} seconds.`);
  if (ex.bilateral) parts.push("Perform on both sides.");
  if (ex.form_cues.length) {
    parts.push("Form cues.");
    ex.form_cues.forEach((c) => parts.push(c + "."));
  }
  return parts.join(" ");
}

type Props = {
  exercise: PTExercise;
  animation: ExerciseAnimationData | null;
};

export function ExerciseCard({ exercise, animation }: Props) {
  const playerRef = useRef<PlayerRef | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  });

  const handleToggle = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pause();
    else playerRef.current.play();
  }, [isPlaying]);

  const handleSpeak = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) { setIsSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(buildSpeechText(exercise));
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [exercise, isSpeaking]);

  const positionLabel = POSITION_LABELS[exercise.position] ?? "";

  const inputProps = animation
    ? {
        keyframes: animation.keyframes,
        durationSeconds: 6,
        label: "",
        highlightParts: animation.highlightParts,
        supportObject: animation.supportObject,
        accent: "#4F46E5",
      }
    : null;

  const hasStat =
    exercise.reps !== null ||
    exercise.sets !== null ||
    exercise.duration_seconds !== null;

  return (
    <article className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* ── Animation player ── */}
      <div className="relative">
        {inputProps ? (
          <div className="relative bg-gradient-to-br from-[#F8F7F4] to-[#F0EEFF]">
            <Player
              ref={playerRef}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              component={ExerciseAnimation as any}
              inputProps={inputProps}
              durationInFrames={180}
              fps={30}
              compositionWidth={800}
              compositionHeight={600}
              style={{ width: "100%", display: "block" }}
              loop
              autoPlay
              clickToPlay={false}
            />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center">
            <p className="text-sm text-slate-400">Animation unavailable</p>
          </div>
        )}

        {/* Step badge — floating top-left */}
        <span className="absolute top-3 left-3 text-xs font-bold text-indigo-600 bg-white/90 backdrop-blur-sm border border-indigo-100 px-2.5 py-1 rounded-full shadow-sm">
          #{exercise.step_number}
        </span>
      </div>

      {/* ── Card body ── */}
      <div className="px-6 py-5 space-y-4">
        {/* Title row */}
        <div>
          <h2 className="text-base font-700 text-slate-900 leading-snug font-semibold">
            {exercise.name}
          </h2>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {positionLabel && (
              <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                {positionLabel}
              </span>
            )}
            {exercise.bilateral && (
              <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                Both sides
              </span>
            )}
            {exercise.equipment.length > 0 && (
              <span className="text-[11px] bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                {exercise.equipment.join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        {hasStat && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Reps", value: exercise.reps ?? "—" },
              { label: "Sets", value: exercise.sets ?? "—" },
              {
                label: "Hold",
                value: exercise.duration_seconds !== null ? `${exercise.duration_seconds}s` : "—",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center py-3 bg-slate-50 rounded-xl"
              >
                <span className="text-2xl font-bold text-slate-900 tabular-nums leading-none">
                  {s.value}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-1">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Form cues */}
        {exercise.form_cues.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
              Form Cues
            </p>
            <ul className="space-y-2">
              {exercise.form_cues.map((cue, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                  <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {cue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
          {inputProps && (
            <button
              onClick={handleToggle}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
                isPlaying
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" strokeWidth={2} /> : <Play className="w-3.5 h-3.5" strokeWidth={2} />}
              {isPlaying ? "Pause" : "Play"}
            </button>
          )}

          <button
            onClick={handleSpeak}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${
              isSpeaking
                ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                : "text-slate-600 bg-white border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200"
            }`}
          >
            {isSpeaking
              ? <VolumeX className="w-3.5 h-3.5" strokeWidth={2} />
              : <Volume2 className="w-3.5 h-3.5" strokeWidth={2} />}
            {isSpeaking ? "Stop" : "Hear instructions"}
          </button>
        </div>
      </div>
    </article>
  );
}
