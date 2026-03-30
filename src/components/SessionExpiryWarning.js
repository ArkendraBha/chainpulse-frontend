// components/SessionExpiryWarning.js
'use client';

import { useEffect, useState } from 'react';

export default function SessionExpiryWarning({ tokenCreatedAt }) {
  const [daysRemaining, setDaysRemaining] = useState(null);

  useEffect(() => {
    if (!tokenCreatedAt) return;
    const created = new Date(tokenCreatedAt);
    const expiresAt = new Date(created.getTime() + 90 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const remaining = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
    setDaysRemaining(remaining);
  }, [tokenCreatedAt]);

  if (daysRemaining === null || daysRemaining > 14) return null;

  return (
    <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-4">
      <p className="text-yellow-200 text-sm">
        ⚠️ Your session expires in <strong>{daysRemaining} days</strong>.
        <a 
          href="/restore-access"
          className="ml-2 underline text-yellow-400 hover:text-yellow-300"
        >
          Refresh your access
        </a>
      </p>
    </div>
  );
}