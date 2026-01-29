export default function AdminLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-9 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>

        {/* Add feed form skeleton */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
          <div className="space-y-4">
            <div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div>
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
              <div className="flex gap-2 flex-wrap">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                ))}
              </div>
            </div>
            <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Feeds list skeleton */}
      <div>
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              </div>
              <div className="ml-4 flex gap-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading text */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading feed statistics...
        </p>
      </div>
    </div>
  );
}
