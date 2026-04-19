export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold tracking-tight text-white">
          Steplet
        </h1>
        <p className="mt-3 text-lg text-gray-400">
          Turn instructions into animated steps
        </p>
      </div>

      <div className="w-full max-w-md">
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-2xl cursor-pointer hover:border-gray-400 transition-colors"
        >
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <svg
              className="w-10 h-10"
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
            <span className="text-sm font-medium">Upload a PDF or image</span>
            <span className="text-xs text-gray-500">
              PT prescriptions, origami instructions, and more
            </span>
          </div>
          <input id="file-upload" type="file" className="hidden" accept=".pdf,image/*" />
        </label>
      </div>
    </main>
  );
}
