export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header skeleton */}
      <header className="sticky top-0 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-50 shadow-sm">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo + title */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="w-28 h-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>

            {/* Time range buttons */}
            <div className="hidden md:flex items-center gap-4 flex-1 justify-center">
              <div className="w-56 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* Article list skeleton */}
      <main className="w-full">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                {/* Title */}
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                {/* Meta line */}
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
