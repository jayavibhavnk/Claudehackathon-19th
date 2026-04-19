"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MB = 10;

export function DropZone({ onFile, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        alert("Please upload a JPG, PNG, WebP, or GIF image.");
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        alert(`File must be under ${MAX_MB} MB.`);
        return;
      }
      setFileName(file.name);
      onFile(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handle(file);
    },
    [handle]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handle(file);
    },
    [handle]
  );

  return (
    <div
      role="button"
      aria-label="Upload prescription image"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
      className={[
        "relative border-2 border-dashed rounded-2xl transition-all duration-200 select-none",
        isDragging
          ? "border-indigo-500 bg-indigo-50"
          : disabled
          ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
          : "border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer",
      ].join(" ")}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <div className="py-12 px-6 flex flex-col items-center gap-3 text-center">
        <div
          className={`rounded-full p-3.5 ${
            isDragging ? "bg-indigo-100" : "bg-gray-100"
          }`}
        >
          <svg
            className={`w-7 h-7 ${
              isDragging ? "text-indigo-600" : "text-gray-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        {fileName ? (
          <div>
            <p className="text-sm font-semibold text-indigo-700">{fileName}</p>
            <p className="text-xs text-gray-400 mt-0.5">Click to change</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Drop your PT prescription here
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPG, PNG, or WebP · up to {MAX_MB} MB
            </p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
