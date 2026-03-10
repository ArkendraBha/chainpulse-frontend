"use client";

import { useEffect, useState } from "react";

export default function Home() {

  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch("https://chainpulse-backend-80xy.onrender.com/latest")
      .then(res => res.json())
      .then(setData);

    fetch("https://chainpulse-backend-80xy.onrender.com/history")
      .then(res => res.json())
      .then(setHistory);
  }, []);

  if (!data || history.length < 10) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Building statistical model...
      </div>
    );
  }

  const determineRegime = (value) => {
    if (value > 35) return "Risk-On";
    if (value < -35) return "Risk-Off";
    return "Neutral";
  };

  const currentRegime = determineRegime(data.score);

  // ===== Regime Persistence Modeling =====

  let riskOnDurations = [];
  let riskOffDurations = [];

  let currentStart = null;
  let currentType = null;

  for (let i = history.length - 1; i >= 0; i--) {
    const regime = determineRegime(history[i].score);

    if (regime === "Neutral") continue;

    if (!currentType) {
      currentType = regime;
      currentStart = new Date(history[i].timestamp + "Z");
    }

    if (regime !== currentType) {
      const endTime = new Date(history[i + 1].timestamp + "Z");
      const duration =
        (endTime - currentStart) / (1000 * 60 * 60);

      if (currentType === "Risk-On")
        riskOnDurations.push(duration);
      else
        riskOffDurations.push(duration);

      currentType = regime;
      currentStart = new Date(history[i].timestamp + "Z");
    }
  }

  const avg = (arr) =>
    arr.length > 0
      ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
      : 0;

  const avgRiskOn = avg(riskOnDurations);
  const avgRiskOff = avg(riskOffDurations);

  const continuationThreshold = 6;

  const continuationRate = (arr) =>
    arr.length > 0
      ? Math.round(
          (arr.filter(d => d > continuationThreshold).length /
            arr.length) *
            100
        )
      : 0;

  const riskOnContinuation = continuationRate(riskOnDurations);
  const riskOffContinuation = continuationRate(riskOffDurations);

  const activeContinuation =
    currentRegime === "Risk-On"
      ? riskOnContinuation
      : currentRegime === "Risk-Off"
      ? riskOffContinuation
      : 0;

  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">

      <div className="max-w-6xl mx-auto">

        <div className="mb-16">
          <h1 className="text-5xl font-semibold leading-tight">
            Regime Persistence Engine
          </h1>
          <p className="text-gray-400 mt-6 text-xl max-w-2xl">
            Understand how long aligned regimes typically persist.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl mb-16">

          <div className="text-sm text-gray-400 uppercase">
            Current Regime
          </div>
          <div className="text-4xl font-semibold mt-4">
            {currentRegime}
          </div>

          <div className="mt-6 text-gray-400">
            Historical continuation probability:{" "}
            <span className="text-white font-semibold">
              {activeContinuation}%
            </span>
          </div>

        </div>

        <div className="grid grid-cols-2 gap-10">

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 shadow-xl text-center">
            <div className="text-gray-400 text-sm">
              Avg Risk-On Duration
            </div>
            <div className="text-4xl font-bold mt-4">
              {avgRiskOn}h
            </div>
            <div className="text-gray-500 mt-4">
              Continuation Rate: {riskOnContinuation}%
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 shadow-xl text-center">
            <div className="text-gray-400 text-sm">
              Avg Risk-Off Duration
            </div>
            <div className="text-4xl font-bold mt-4">
              {avgRiskOff}h
            </div>
            <div className="text-gray-500 mt-4">
              Continuation Rate: {riskOffContinuation}%
            </div>
          </div>

        </div>

        <div className="text-gray-600 text-xs mt-20 text-center">
          Model based on historical regime transitions. Not financial advice.
        </div>

      </div>

    </main>
  );
}