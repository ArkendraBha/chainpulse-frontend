"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip
);

export default function Home() {

  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [email, setEmail] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [mode, setMode] = useState("basic");
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
      alert("Please enter your email first.");
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

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Initializing ChainPulse...
      </div>
    );
  }

  const score = data.score || 0;

  const determineRegime = (value) => {
    if (value > 35) return "Strong Risk-On";
    if (value > 15) return "Risk-On";
    if (value < -35) return "Strong Risk-Off";
    if (value < -15) return "Risk-Off";
    return "Neutral";
  };

  const currentRegime = determineRegime(score);

  let lastFlipTime = null;
  let regimeDuration = "—";
  let isFreshFlip = false;

  if (history.length > 1) {
    for (let i = 1; i < history.length; i++) {
      const pastRegime = determineRegime(history[i].score);
      if (pastRegime !== currentRegime) {
        lastFlipTime = new Date(history[i].timestamp + "Z");
        break;
      }
    }

    if (lastFlipTime) {
      const now = new Date();
      const diffMs = now - lastFlipTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      regimeDuration = `${Math.floor(diffHours)}h`;

      if (diffHours <= 6) isFreshFlip = true;
    }
  }

  const regimeColor =
    currentRegime.includes("Risk-On")
      ? "bg-green-500"
      : currentRegime.includes("Risk-Off")
      ? "bg-red-500"
      : "bg-gray-500";

  const chartData = {
    labels: history.map(h =>
      new Date(h.timestamp + "Z").toLocaleTimeString()
    ).reverse(),
    datasets: [
      {
        data: history.map(h => h.score).reverse(),
        borderColor: "#22c55e",
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: {
        grid: { color: "#27272a" },
        ticks: { color: "#71717a" }
      }
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">

      <div className="max-w-6xl mx-auto">

        {/* Email */}
        <div className="mb-8 flex gap-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              localStorage.setItem("email", e.target.value);
            }}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white w-full max-w-md"
          />
          {isPro && (
            <span className="text-green-400 font-medium self-center">
              Pro Active
            </span>
          )}
        </div>

        {/* Hero */}
        <div className="mb-16">
          <h1 className="text-5xl font-semibold leading-tight">
            Trade the Regime. <br />
            Not the Noise.
          </h1>
          <p className="text-gray-400 mt-6 text-xl max-w-2xl">
            ChainPulse identifies market bias shifts and momentum confirmation
            to reduce false entries and improve swing timing.
          </p>
        </div>

        {/* Regime Panel */}
        <div className="rounded-2xl overflow-hidden shadow-xl mb-16">

          <div className={`h-1 ${regimeColor}`}></div>

          <div className="bg-zinc-900 p-12 border border-zinc-800">

            <div className="flex justify-between items-center">

              <div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">
                  Current Regime
                </div>

                <div className="text-4xl font-semibold mt-3 flex items-center gap-4">
                  {currentRegime}
                  {isFreshFlip && (
                    <span className="text-xs bg-yellow-500 text-black px-3 py-1 rounded-full">
                      Fresh Flip
                    </span>
                  )}
                </div>

                <div className="text-gray-400 mt-4">
                  Active for: {regimeDuration}
                </div>

                {lastFlipTime && (
                  <div className="text-gray-500 text-sm mt-2">
                    Last change: {lastFlipTime.toLocaleString()}
                  </div>
                )}

              </div>

              <div className="text-5xl font-bold">
                {score}
              </div>

            </div>

          </div>

        </div>

        {/* Mode Toggle */}
        <div className="flex bg-zinc-800 rounded-lg p-1 mb-10 w-fit">
          <button
            onClick={() => setMode("basic")}
            className={`px-4 py-2 rounded-lg ${
              mode === "basic"
                ? "bg-white text-black"
                : "text-gray-400"
            }`}
          >
            Basic
          </button>

          <button
            onClick={() => {
              if (!isPro) {
                setShowUpgrade(true);
              } else {
                setMode("pro");
              }
            }}
            className={`px-4 py-2 rounded-lg ${
              mode === "pro"
                ? "bg-white text-black"
                : "text-gray-400"
            }`}
          >
            Professional
          </button>
        </div>

        {/* Professional View */}
        {mode === "pro" && isPro && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl">
            <h2 className="text-xl text-gray-400 mb-8">
              Regime Trend
            </h2>
            <Line data={chartData} options={chartOptions} />
          </div>
        )}

        {/* Value Framing */}
        <div className="mt-20 text-center text-gray-400 max-w-3xl mx-auto">
          <p className="text-lg">
            Most traders enter too early or too late.
            ChainPulse confirms when bias, momentum, and stability align.
          </p>
        </div>

        <div className="text-gray-600 text-xs mt-20 text-center">
          Built for disciplined swing traders. No signals. No hype. Just regime clarity.
        </div>

      </div>

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-zinc-900 p-12 rounded-2xl border border-zinc-800 max-w-lg text-center">

            <h3 className="text-2xl font-semibold mb-6">
              Professional Mode — \$19/month
            </h3>

            <p className="text-gray-400 mb-6">
              Unlock full regime history, advanced trend visibility,
              and structured swing confirmation tools.
            </p>

            <button
              onClick={handleUpgrade}
              className="bg-white text-black px-6 py-3 rounded-lg"
            >
              Upgrade Now
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