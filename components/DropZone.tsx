"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";

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
        "relative border-2 rounded-2xl transition-all duration-200 select-none group",
        isDragging
          ? "border-indigo-500 bg-indigo-50/80 scale-[1.02]"
          : disabled
          ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed border-dashed"
          : "border-dashed border-gray-300 bg-white hover:border-indigo-500 hover:bg-indigo-50/30 cursor-pointer",
      ].join(" ")}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <div className="py-12 px-6 flex flex-col items-center gap-4 text-center">
        {/* Icon with gradient background, floats on idle */}
        <div
          className={[
            "rounded-full p-4 transition-all duration-200",
            isDragging
              ? "bg-indigo-100"
              : "bg-gradient-to-br from-indigo-50 to-violet-100 group-hover:from-indigo-100 group-hover:to-violet-200",
          ].join(" ")}
        >
          <Upload
            className={[
              "w-7 h-7 transition-colors duration-200",
              isDragging
                ? "text-indigo-600"
                : "text-indigo-400 group-hover:text-indigo-600",
              !isDragging && !disabled ? "animate-float" : "",
            ].join(" ")}
            strokeWidth={1.75}
          />
        </div>

        {isDragging ? (
          <div>
            <p className="text-sm font-semibold text-indigo-700">Release to upload</p>
            <p className="text-xs text-indigo-400 mt-0.5">Drop it here</p>
          </div>
        ) : fileName ? (
          <div>
            <p className="text-sm font-semibold text-indigo-700">{fileName}</p>
            <p className="text-xs text-slate-400 mt-0.5">Click to change</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Drop your PT prescription here
            </p>
            <p className="text-xs text-slate-400 mt-1">
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
