"use client";

import { useEffect, useState, useMemo } from "react";

export default function Home() {

  const API = process.env.NEXT_PUBLIC_API_URL;

  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [email, setEmail] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [error, setError] = useState(null);

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {

    const savedEmail = localStorage.getItem("email");
    if (savedEmail) {
      setEmail(savedEmail);
      checkSubscription(savedEmail);
    }

    fetch(`${API}/latest`)
      .then(res => res.json())
      .then(setData)
      .catch(() => setError("Failed to load latest data"));

    fetch(`${API}/history`)
      .then(res => res.json())
      .then(setHistory)
      .catch(() => setError("Failed to load history"));

  }, []);

  const checkSubscription = async (userEmail) => {
    try {
      const res = await fetch(`${API}/check-subscription?email=${userEmail}`);
      const result = await res.json();
      setIsPro(result.isPro);
    } catch {
      setIsPro(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (!data || history.length < 20) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Building statistical model...
      </div>
    );
  }

  // =========================
  // REGIME LOGIC
  // =========================

  const determineRegime = (value) => {
    if (value > 35) return "Risk-On";
    if (value < -35) return "Risk-Off";
    return "Neutral";
  };

  const score = data.score;
  const regime = determineRegime(score);

  // =========================
  // MULTI-TIMEFRAME
  // =========================

  const tfData = useMemo(() => {

    const calcTF = (period) => {
      if (history.length < period) return 0;
      const subset = history.slice(0, period);
      return subset.reduce((sum, h) => sum + h.score, 0) / subset.length;
    };

    return [
      { label: "1H", value: calcTF(1) },
      { label: "4H", value: calcTF(4) },
      { label: "12H", value: calcTF(12) },
      { label: "24H", value: calcTF(24) }
    ];

  }, [history]);

  const alignment =
    tfData.every(tf => determineRegime(tf.value) === "Risk-On") ||
    tfData.every(tf => determineRegime(tf.value) === "Risk-Off");

  // =========================
  // PERSISTENCE MODELING (HEAVY LOGIC MEMOIZED)
  // =========================

  const persistence = useMemo(() => {

    let riskOnDurations = [];
    let riskOffDurations = [];

    let currentStart = null;
    let currentType = null;

    for (let i = history.length - 1; i >= 0; i--) {

      const r = determineRegime(history[i].score);
      if (r === "Neutral") continue;

      if (!currentType) {
        currentType = r;
        currentStart = new Date(history[i].timestamp);
      }

      if (r !== currentType) {

        const end = new Date(history[i + 1].timestamp);
        const dur = (end - currentStart) / (1000 * 60 * 60);

        if (currentType === "Risk-On") riskOnDurations.push(dur);
        else riskOffDurations.push(dur);

        currentType = r;
        currentStart = new Date(history[i].timestamp);
      }
    }

    const avg = (arr) =>
      arr.length > 0
        ? (arr.reduce((a, b) => a + b, 0) / arr.length)
        : 0;

    const continuationRate = (arr) =>
      arr.length > 0
        ? Math.round((arr.filter(d => d > 6).length / arr.length) * 100)
        : 0;

    const earlyFailureRate = (arr) =>
      arr.length > 0
        ? Math.round((arr.filter(d => d < 4).length / arr.length) * 100)
        : 0;

    return {
      avgOn: avg(riskOnDurations),
      avgOff: avg(riskOffDurations),
      contOn: continuationRate(riskOnDurations),
      contOff: continuationRate(riskOffDurations),
      earlyFailOn: earlyFailureRate(riskOnDurations),
      earlyFailOff: earlyFailureRate(riskOffDurations),
    };

  }, [history]);

  const activeContinuation =
    regime === "Risk-On" ? persistence.contOn :
    regime === "Risk-Off" ? persistence.contOff :
    0;

  const activeEarlyFail =
    regime === "Risk-On" ? persistence.earlyFailOn :
    regime === "Risk-Off" ? persistence.earlyFailOff :
    0;

  const regimeQuality =
    (alignment ? 30 : 0) +
    (Math.abs(score) > 40 ? 20 : 10) +
    (activeContinuation / 2) -
    (activeEarlyFail / 3);

  const regimeColor =
    regime === "Risk-On"
      ? "bg-green-500"
      : regime === "Risk-Off"
      ? "bg-red-500"
      : "bg-gray-500";

  // =========================
  // UI
  // =========================

  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">

      <div className="max-w-6xl mx-auto">

        <div className="mb-16">
          <h1 className="text-5xl font-semibold leading-tight">
            Statistical Regime Edge Engine
          </h1>
          <p className="text-gray-400 mt-6 text-xl">
            Quantified persistence modeling for swing traders.
          </p>
        </div>

        {/* Regime Overview */}
        <div className="rounded-2xl overflow-hidden shadow-xl mb-16">
          <div className={`h-1 ${regimeColor}`}></div>
          <div className="bg-zinc-900 p-12 border border-zinc-800">

            <div className="flex justify-between">
              <div>
                <div className="text-sm text-gray-400 uppercase">
                  Current Regime
                </div>
                <div className="text-4xl font-semibold mt-4">
                  {regime}
                </div>
              </div>

              <div className="text-5xl font-bold">
                {score}
              </div>
            </div>

          </div>
        </div>

        {/* Alignment */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl mb-16 text-center">

          <div className="text-gray-400 text-sm">
            Multi-Timeframe Alignment
          </div>

          <div className={`text-3xl font-semibold mt-6 ${
            alignment ? "text-green-400" : "text-gray-400"
          }`}>
            {alignment ? "Aligned" : "Mixed"}
          </div>

        </div>

        {/* Persistence (Pro Locked) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl">

          <h2 className="text-xl text-gray-400 mb-8">
            Regime Persistence Metrics
          </h2>

          {isPro ? (
            <div className="grid grid-cols-2 gap-12 text-center">

              <div>
                <div className="text-gray-400 text-sm">
                  Avg Risk-On Duration
                </div>
                <div className="text-4xl font-bold mt-4">
                  {persistence.avgOn.toFixed(1)}h
                </div>
                <div className="text-gray-500 mt-4">
                  Continuation: {persistence.contOn}%
                </div>
                <div className="text-gray-500">
                  Early Fail: {persistence.earlyFailOn}%
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">
                  Avg Risk-Off Duration
                </div>
                <div className="text-4xl font-bold mt-4">
                  {persistence.avgOff.toFixed(1)}h
                </div>
                <div className="text-gray-500 mt-4">
                  Continuation: {persistence.contOff}%
                </div>
                <div className="text-gray-500">
                  Early Fail: {persistence.earlyFailOff}%
                </div>
              </div>

              <div className="col-span-2 mt-12">
                <div className="text-gray-400 text-sm">
                  Regime Quality Score
                </div>
                <div className="text-5xl font-bold mt-6">
                  {Math.round(regimeQuality)}
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 mb-6">
                Unlock statistical persistence modeling.
              </p>
              <button
                onClick={() => setShowUpgrade(true)}
                className="bg-white text-black px-6 py-3 rounded-lg"
              >
                Unlock — \$19/month
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-zinc-900 p-12 rounded-2xl border border-zinc-800 max-w-lg text-center">
            <h3 className="text-2xl font-semibold mb-6">
              Professional Mode
            </h3>
            <p className="text-gray-400 mb-6">
              Access regime persistence modeling and statistical edge.
            </p>
            <button
              onClick={() => setShowUpgrade(false)}
              className="bg-white text-black px-6 py-3 rounded-lg"
            >
              Upgrade
            </button>
          </div>
        </div>
      )}

    </main>
  );
}