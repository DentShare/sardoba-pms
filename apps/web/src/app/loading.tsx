/**
 * Next.js root loading state.
 * Displayed as a Suspense fallback while route segments load.
 * Full-page spinner in Sardoba design style.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sardoba-cream">
      {/* Animated spinner */}
      <div className="relative mb-8">
        {/* Outer ring */}
        <div className="w-16 h-16 rounded-full border-4 border-sardoba-gold/20" />
        {/* Spinning arc */}
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-sardoba-gold animate-spin" />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-sardoba-gold animate-pulse" />
        </div>
      </div>

      {/* Brand text */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-sardoba-dark mb-1">
          Sardoba
          <span className="text-sardoba-gold"> PMS</span>
        </h2>
        <p className="text-sm text-sardoba-dark/40">
          Загрузка...
        </p>
      </div>
    </div>
  );
}
