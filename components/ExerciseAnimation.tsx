"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { DotLottie } from "@lottiefiles/dotlottie-react";
import { useState, useCallback } from "react";

type Props = {
  url: string;
  width?: number | string;
  height?: number | string;
};

export function ExerciseAnimation({ url, width = "100%", height = "100%" }: Props) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleRef = useCallback((dotLottie: DotLottie | null) => {
    if (!dotLottie) return;
    dotLottie.addEventListener("load", () => setLoaded(true));
    dotLottie.addEventListener("loadError", () => setError(true));
  }, []);

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-gray-50 text-gray-400 gap-2"
        style={{ width, height }}
      >
        <svg
          className="w-10 h-10 opacity-30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
          />
        </svg>
        <span className="text-xs font-medium">Animation unavailable</span>
      </div>
    );
  }

  return (
    <div className="relative bg-[#F8F7F4]" style={{ width, height }}>
      {!loaded && (
        <div
          className="absolute inset-0 bg-gray-100 animate-pulse rounded-t-2xl"
          aria-hidden="true"
        />
      )}
      <DotLottieReact
        src={url}
        loop
        autoplay
        dotLottieRefCallback={handleRef}
        style={{ width, height }}
      />
    </div>
  );
}
