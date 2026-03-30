// components/StaleDataBanner.js
'use client';

export default function StaleDataBanner({ dataTimestamp, isStale }) {
  if (!isStale) return null;

  const minutesAgo = dataTimestamp 
    ? Math.floor((Date.now() - new Date(dataTimestamp).getTime()) / 60000)
    : null;

  return (
    <div className="bg-orange-900/40 border border-orange-600 rounded-lg p-3 mb-4 flex items-center gap-3">
      <span className="text-orange-400 text-lg">⚠️</span>
      <div>
        <p className="text-orange-200 text-sm font-medium">
          Live data temporarily unavailable
        </p>
        <p className="text-orange-300/70 text-xs">
          {minutesAgo !== null 
            ? `Showing cached data from ${minutesAgo} minutes ago.`
            : 'Showing cached data.'
          }
          {' '}Market data source may be experiencing issues.
        </p>
      </div>
    </div>
  );
}