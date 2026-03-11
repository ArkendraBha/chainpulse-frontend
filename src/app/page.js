"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [latest, setLatest] = useState(null);
  const [stats, setStats] = useState(null);
  const [coin, setCoin] = useState("BTC");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch(`https://chainpulse-backend-2xok.onrender.com//latest?coin=${coin}`)
      .then(res => res.json())
      .then(setLatest);

    fetch(
      `https://chainpulse-backend-2xok.onrender.com//statistics?coin=${coin}&email=${email}`
    )
      .then(res => res.json())
      .then(setStats);
  }, [coin, email]);

  if (!latest) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Loading ChainPulse...
      </div>
    );
  }

  const exposure = stats?.exposure_recommendation_percent || 0;
  const isProLocked = stats?.pro_required;

  const confidenceTier =
    exposure > 60
      ? "Aggressive"
      : exposure > 30
      ? "Balanced"
      : "Defensive";

  const shiftRisk = stats?.regime_shift_risk_percent || 0;

  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-semibold">
              Regime-Based Exposure Intelligence
            </h1>
            <p className="text-gray-400 mt-3">
              Know when to press size. Know when to stand down.
            </p>
          </div>

          <div className="flex bg-zinc-800 rounded-lg p-1">
            {["BTC", "ETH"].map(c => (
              <button
                key={c}
                onClick={() => setCoin(c)}
                className={`px-4 py-2 rounded-lg ${
                  coin === c
                    ? "bg-white text-black"
                    : "text-gray-400"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Exposure Hero Panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 mb-12 shadow-xl">
          <div className="text-sm text-gray-400 uppercase">
            Recommended Exposure
          </div>
          <div className="text-6xl font-bold mt-4">
            {exposure}%
          </div>
          <div className="text-gray-400 mt-3">
            Confidence Tier:{" "}
            <span className="text-white font-semibold">
              {confidenceTier}
            </span>
          </div>
        </div>

        {/* Current Regime */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-12">
          <div className="text-sm text-gray-400 uppercase">
            Current Regime
          </div>
          <div className="text-3xl font-semibold mt-2">
            {latest.label}
          </div>
          <div className="text-gray-400 mt-2">
            Score: {latest.score}
          </div>
          <div className="text-gray-400">
            Coherence: {latest.coherence}%
          </div>
        </div>

        {/* Regime Shift Alert */}
        {shiftRisk > 70 && (
          <div className="bg-yellow-900 border border-yellow-700 text-yellow-300 p-6 rounded-xl mb-12">
            Elevated Regime Shift Risk Detected.
            Consider reducing exposure.
          </div>
        )}

        {/* Pro Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl text-gray-400">
              Advanced Regime Analytics
            </h2>

            {isProLocked && (
              <button className="bg-white text-black px-4 py-2 rounded-lg font-semibold">
                Unlock Pro — \$29/month
              </button>
            )}
          </div>

          <div
            className={`grid grid-cols-2 gap-8 ${
              isProLocked ? "blur-sm opacity-50" : ""
            }`}
          >
            <div>
              <div className="text-gray-400 text-sm">
                Survival Probability
              </div>
              <div className="text-3xl font-semibold mt-2">
                {stats?.survival_probability_percent}%
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">
                Hazard Rate
              </div>
              <div className="text-3xl font-semibold mt-2">
                {stats?.hazard_percent}%
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">
                Strength Percentile
              </div>
              <div className="text-3xl font-semibold mt-2">
                {stats?.percentile_rank_percent}%
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">
                Regime Shift Risk
              </div>
              <div className="text-3xl font-semibold mt-2">
                {stats?.regime_shift_risk_percent}%
              </div>
            </div>
          </div>

          {isProLocked && (
            <div className="mt-6 text-center text-gray-400">
              Unlock full persistence modeling, hazard analysis, 
              percentile ranking, and shift alerts.
            </div>
          )}
        </div>

        {/* Email Input */}
        <div className="mt-12 text-center">
          <input
            type="email"
            placeholder="Enter email for Pro access"
            className="px-4 py-2 rounded bg-zinc-800 text-white border border-zinc-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="text-gray-600 text-xs mt-16 text-center">
          ChainPulse is a decision-support tool. Not financial advice.
        </div>
      </div>
    </main>
  );
}