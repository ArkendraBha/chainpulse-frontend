"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/request-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.detail || "Login failed");
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#080809" }}>
      <div className="max-w-md mx-auto p-8 rounded-2xl border border-white/8" style={{ backgroundColor: "#0f0f10" }}>
        <div className="text-center space-y-6">
          <div>
            <div className="w-8 h-8 mx-auto rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Sign in to ChainPulse</h1>
            <p className="text-sm text-zinc-500">Enter your email to receive a secure login link</p>
          </div>

          {!sent ? (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:outline-none focus:border-emerald-500 placeholder-zinc-600"
              />
              
              <button
                onClick={handleLogin}
                disabled={loading || !email}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending..." : "Send Login Link"}
              </button>
              
              {error && (
                <div className="text-sm text-red-400 text-center">{error}</div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-emerald-400 text-center">
                ✓ Login link sent to {email}
              </div>
              <p className="text-xs text-zinc-600 text-center">
                Check your email and click the link to access your dashboard.
              </p>
            </div>
          )}

          <div className="text-xs text-zinc-700 text-center border-t border-white/5 pt-4">
            Don't have an account? <a href="/pricing" className="text-emerald-400 hover:text-emerald-300">Start free trial</a>
          </div>
        </div>
      </div>
    </main>
  );
}
