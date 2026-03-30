// components/DashboardSkeleton.js

export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Regime Stack */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-800 rounded-lg p-6">
            <div className="h-4 bg-gray-700 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-700 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-700 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Setup Quality */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="h-5 bg-gray-700 rounded w-40 mb-4" />
        <div className="h-4 bg-gray-700 rounded w-full mb-2" />
        <div className="h-4 bg-gray-700 rounded w-3/4" />
      </div>

      {/* Scenarios */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="h-5 bg-gray-700 rounded w-48 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}