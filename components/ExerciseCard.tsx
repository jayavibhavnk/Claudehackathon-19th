"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useEffect, useCallback } from "react";
import type { PlayerRef } from "@remotion/player";
import type { PTExercise } from "@/lib/schemas/pt-exercise";
import type { ExerciseAnimationData } from "@/lib/schemas/pose";
import { ExerciseAnimation } from "@/remotion/compositions/ExerciseAnimation";

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

  // Sync playing state with Player events once it mounts
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
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  }, [isPlaying]);

  const handleSpeak = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }
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
    <article className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      {/* ── Animation player ── */}
      {inputProps ? (
        <div className="relative bg-[#F8F7F4]">
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
          <p className="text-sm text-gray-400">Animation unavailable</p>
        </div>
      )}

      {/* ── Card body ── */}
      <div className="px-6 py-5 space-y-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 leading-snug">
              {exercise.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {positionLabel && (
                <span className="text-xs font-medium text-gray-400">
                  {positionLabel}
                </span>
              )}
              {exercise.bilateral && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="text-xs font-medium text-gray-400">
                    Both sides
                  </span>
                </>
              )}
              {exercise.equipment.length > 0 && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="text-xs bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                    {exercise.equipment.join(", ")}
                  </span>
                </>
              )}
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
            #{exercise.step_number}
          </span>
        </div>

        {/* Stats */}
        {hasStat && (
          <div className="grid grid-cols-3 divide-x divide-gray-100 -mx-px">
            {[
              {
                label: "Reps",
                value: exercise.reps ?? "—",
              },
              {
                label: "Sets",
                value: exercise.sets ?? "—",
              },
              {
                label: "Hold",
                value:
                  exercise.duration_seconds !== null
                    ? `${exercise.duration_seconds}s`
                    : "—",
              },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center py-3">
                <span className="text-2xl font-bold text-gray-900 tabular-nums">
                  {s.value}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-0.5">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Form cues */}
        {exercise.form_cues.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Form Cues
            </p>
            <ul className="space-y-1.5">
              {exercise.form_cues.map((cue, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {cue}
                </li>
              ))}
            </ul>
          </div>
        )}


        {/* Controls */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-50 flex-wrap">
          {/* Play / Pause */}
          {inputProps && (
            <button
              onClick={handleToggle}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 border border-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              {isPlaying ? (
                <>
                  <PauseIcon />
                  Pause
                </>
              ) : (
                <>
                  <PlayIcon />
                  Play
                </>
              )}
            </button>
          )}

          {/* Hear instructions */}
          <button
            onClick={handleSpeak}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
              isSpeaking
                ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                : "text-gray-600 bg-gray-50 border-gray-100 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            <SpeakerIcon pulsing={isSpeaking} />
            {isSpeaking ? "Stop" : "Hear instructions"}
          </button>
        </div>
      </div>
    </article>
  );
}

function PlayIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
      <path d="M3 2.5l10 5.5-10 5.5V2.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
      <rect x="3" y="2" width="4" height="12" rx="1" />
      <rect x="9" y="2" width="4" height="12" rx="1" />
    </svg>
  );
}

function SpeakerIcon({ pulsing }: { pulsing: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${pulsing ? "animate-pulse" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M5 9v6h4l5 5V4L9 9H5z"
      />
    </svg>
  );
}
