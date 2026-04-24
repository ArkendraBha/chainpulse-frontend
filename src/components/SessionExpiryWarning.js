'use client';

import { useEffect, useState } from 'react';

const TOKEN_LIFETIME_DAYS = 90;

export default function SessionExpiryWarning() {
  const [daysRemaining, setDaysRemaining] = useState(null);

  useEffect(() => {
    // Read creation time from localStorage instead of relying on a prop
    const tokenCreatedAt = localStorage.getItem('cp_token_created');
    if (!tokenCreatedAt) return;

    const created = new Date(tokenCreatedAt);
    const expiresAt = new Date(created.getTime() + TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const remaining = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
    setDaysRemaining(remaining);
  }, []);

  if (daysRemaining === null || daysRemaining > 14) return null;

  const handleRefresh = () => {
    localStorage.removeItem("cp_token");
    localStorage.removeItem("cp_token_created");
    document.cookie = "cp_token=; path=/; max-age=0";
    window.location.href = "/app?reason=session_refresh";
  };

  return (
    <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-4">
      <p className="text-yellow-200 text-sm">
        ⚠️ Your session expires in <strong>{daysRemaining} days</strong>.
        <button
          onClick={handleRefresh}
          className="ml-2 underline text-yellow-400 hover:text-yellow-300"
        >
          Refresh your access
        </button>
      </p>
    </div>
  );
}