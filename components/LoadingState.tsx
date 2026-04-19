"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Reading your prescription…",
  "Identifying exercises…",
  "Building animation keyframes…",
  "Almost ready…",
];

export function LoadingState() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => Math.min(i + 1, STEPS.length - 1));
        setVisible(true);
      }, 280);
    }, 2300);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-10 py-16">
      {/* Indeterminate progress bar */}
      <div className="w-56 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-indigo-500 rounded-full animate-bar-slide" />
      </div>

      {/* Cycling message */}
      <p
        className={`text-sm font-medium text-gray-500 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {STEPS[idx]}
      </p>

      {/* Skeleton cards — sets expectation for number of results */}
      <div className="w-full space-y-5">
        {[1, 0.85, 0.7].map((opacity, i) => (
          <div
            key={i}
            className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
            style={{ opacity }}
          >
            {/* Animation placeholder */}
            <div className="bg-gray-100 animate-pulse" style={{ aspectRatio: "4/3" }} />
            <div className="p-6 space-y-3">
              <div className="h-5 bg-gray-100 rounded-lg animate-pulse w-1/2" />
              <div className="flex gap-6">
                <div className="h-8 bg-gray-100 rounded-lg animate-pulse w-16" />
                <div className="h-8 bg-gray-100 rounded-lg animate-pulse w-16" />
                <div className="h-8 bg-gray-100 rounded-lg animate-pulse w-16" />
              </div>
              <div className="space-y-2 pt-1">
                <div className="h-3.5 bg-gray-100 rounded animate-pulse w-full" />
                <div className="h-3.5 bg-gray-100 rounded animate-pulse w-5/6" />
                <div className="h-3.5 bg-gray-100 rounded animate-pulse w-4/6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
