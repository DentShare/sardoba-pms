export default function DashboardLoading() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-48 bg-gray-200 rounded-lg" />
          <div className="h-4 w-32 bg-gray-100 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-gray-200 rounded-lg" />
          <div className="h-9 w-9 bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="h-3 w-20 bg-gray-100 rounded mb-3" />
            <div className="h-6 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="h-8 w-64 bg-gray-100 rounded-lg" />
          <div className="h-8 w-32 bg-gray-100 rounded-lg" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-gray-50"
          >
            <div className="h-4 w-4 bg-gray-100 rounded" />
            <div className="h-4 flex-1 bg-gray-100 rounded" style={{ maxWidth: `${60 + (i % 3) * 15}%` }} />
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-6 w-16 bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
