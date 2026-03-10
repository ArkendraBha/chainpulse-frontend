"use client";

import { useEffect, useState } from "react";

export default function Home() {

  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [email, setEmail] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("email");
    if (savedEmail) {
      setEmail(savedEmail);
      checkSubscription(savedEmail);
    }

    fetch("https://chainpulse-backend-80xy.onrender.com/latest")
      .then(res => res.json())
      .then(setData);

    fetch("https://chainpulse-backend-80xy.onrender.com/history")
      .then(res => res.json())
      .then(setHistory);

  }, []);

  const checkSubscription = async (userEmail) => {
    const res = await fetch(
      `https://chainpulse-backend-80xy.onrender.com/check-subscription?email=${userEmail}`
    );
    const result = await res.json();
    setIsPro(result.isPro);
  };

  const handleUpgrade = async () => {
    if (!email) {
      alert("Enter email first.");
      return;
    }

    const res = await fetch(
      "https://chainpulse-backend-80xy.onrender.com/create-checkout-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }
    );

    const checkout = await res.json();
    window.location.href = checkout.url;
  };

  if (!data || history.length < 10) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Initializing Engine...
      </div>
    );
  }

  const determineRegime = (value) => {
    if (value > 35) return "Risk-On";
    if (value < -35) return "Risk-Off";
    return "Neutral";
  };

  const score = data.score;
  const regime = determineRegime(score);

  // ===== Multi-Timeframe =====

  const calcTF = (period) => {
    if (history.length < period) return 0;
    const subset = history.slice(0, period);
    return subset.reduce((sum, h) => sum + h.score, 0) / subset.length;
  };

  const tfData = [
    { label: "1H", value: calcTF(1) },
    { label: "4H", value: calcTF(4) },
    { label: "12H", value: calcTF(12) },
    { label: "24H", value: calcTF(24) }
  ];

  const alignment =
    tfData.every(tf => determineRegime(tf.value) === "Risk-On") ||
    tfData.every(tf => determineRegime(tf.value) === "Risk-Off");

  // ===== Persistence Modeling (Pro Only) =====

  let riskOnDurations = [];
  let riskOffDurations = [];

  let currentStart = null;
  let currentType = null;

  for (let i = history.length - 1; i >= 0; i--) {
    const r = determineRegime(history[i].score);
    if (r === "Neutral") continue;

    if (!currentType) {
      currentType = r;
      currentStart = new Date(history[i].timestamp + "Z");
    }

    if (r !== currentType) {
      const end = new Date(history[i + 1].timestamp + "Z");
      const dur = (end - currentStart) / (1000 * 60 * 60);
      if (currentType === "Risk-On") riskOnDurations.push(dur);
      else riskOffDurations.push(dur);

      currentType = r;
      currentStart = new Date(history[i].timestamp + "Z");
    }
  }

  const avg = (arr) =>
    arr.length > 0
      ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
      : 0;

  const continuationRate = (arr) =>
    arr.length > 0
      ? Math.round(
          (arr.filter(d => d > 6).length / arr.length) * 100
        )
      : 0;

  const avgOn = avg(riskOnDurations);
  const avgOff = avg(riskOffDurations);
  const contOn = continuationRate(riskOnDurations);
  const contOff = continuationRate(riskOffDurations);

  const regimeColor =
    regime === "Risk-On"
      ? "bg-green-500"
      : regime === "Risk-Off"
      ? "bg-red-500"
      : "bg-gray-500";

  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">

      <div className="max-w-6xl mx-auto">

        <div className="mb-16">
          <h1 className="text-5xl font-semibold leading-tight">
            Trade the Regime. Not the Noise.
          </h1>
          <p className="text-gray-400 mt-6 text-xl">
            Institutional swing bias and persistence modeling.
          </p>
        </div>

        {/* Regime */}
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

        {/* Multi-Timeframe */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl mb-16">
          <h2 className="text-xl text-gray-400 mb-8">
            Multi-Timeframe Alignment
          </h2>
          <div className="grid grid-cols-4 gap-8 text-center">
            {tfData.map((item, i) => {
              const r = determineRegime(item.value);
              const color =
                r === "Risk-On"
                  ? "text-green-400"
                  : r === "Risk-Off"
                  ? "text-red-400"
                  : "text-gray-400";

              return (
                <div key={i}>
                  <div className="text-gray-500 text-sm">
                    {item.label}
                  </div>
                  <div className={`text-xl font-semibold mt-3 ${color}`}>
                    {r}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center text-gray-400">
            Alignment Status:{" "}
            <span className={alignment ? "text-green-400" : ""}>
              {alignment ? "Aligned" : "Mixed"}
            </span>
          </div>
        </div>

        {/* Persistence (Locked) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl relative">

          <h2 className="text-xl text-gray-400 mb-8">
            Regime Persistence Modeling
          </h2>

          {isPro ? (
            <div className="grid grid-cols-2 gap-10 text-center">
              <div>
                <div className="text-gray-400 text-sm">
                  Avg Risk-On Duration
                </div>
                <div className="text-4xl font-bold mt-4">
                  {avgOn}h
                </div>
                <div className="text-gray-500 mt-4">
                  Continuation: {contOn}%
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">
                  Avg Risk-Off Duration
                </div>
                <div className="text-4xl font-bold mt-4">
                  {avgOff}h
                </div>
                <div className="text-gray-500 mt-4">
                  Continuation: {contOff}%
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 mb-6">
                Persistence statistics are available in Professional Mode.
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
              Unlock historical regime persistence modeling.
            </p>
            <button
              onClick={handleUpgrade}
              className="bg-white text-black px-6 py-3 rounded-lg"
            >
              Upgrade
            </button>
            <div
              onClick={() => setShowUpgrade(false)}
              className="text-gray-500 mt-6 cursor-pointer"
            >
              Cancel
            </div>
          </div>
        </div>
      )}

    </main>
  );
}