// components/ProGate.js
'use client';

export default function ProGate({ 
  children, 
  isPro, 
  featureName = "this feature",
  upgradeMessage 
}) {
  if (isPro) return children;

  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="filter blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      
      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6 max-w-sm">
          <div className="text-3xl mb-3">🔒</div>
          <h3 className="text-white font-semibold text-lg mb-2">
            Unlock {featureName}
          </h3>
          <p className="text-gray-300 text-sm mb-4">
            {upgradeMessage || `Upgrade to Pro to access ${featureName} and 15+ premium tools.`}
          </p>
          <a
            href="/pricing"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg transition"
          >
            Upgrade to Pro
          </a>
        </div>
      </div>
    </div>
  );
}