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
        Initializing ChainPulse Intelligence...
      </div>
    );
  }

  const score = data.score || 0;
  const confidence = data.confidence
    ? Math.round(data.confidence * 100)
    : 0;

  const previousScore =
    history.length > 1 ? history[1].score : score;

  const sentimentChange = score - previousScore;

  const averageScore =
    history.length > 0
      ? (
          history.reduce((sum, h) => sum + h.score, 0) /
          history.length
        )
      : 0;

  const sentimentColor =
    score > 10 ? "text-green-400" :
    score < -10 ? "text-red-400" :
    "text-gray-300";

  const momentumColor =
    sentimentChange > 0 ? "text-green-400" :
    sentimentChange < 0 ? "text-red-400" :
    "text-gray-400";

  // ===== Stability Calculation =====

  const recentScores = history.slice(0, 5).map(h => h.score);
  const volatility =
    recentScores.length > 0
      ? Math.max(...recentScores) - Math.min(...recentScores)
      : 0;

  let stability = "High";
  if (volatility > 30) stability = "Low";
  else if (volatility > 15) stability = "Moderate";

  const stabilityFactor =
    stability === "High" ? 1 :
    stability === "Moderate" ? 0.8 :
    0.6;

  // ===== Conservative Bias Model =====

  const shortMomentum =
    history.length >= 3
      ? (
          history[0].score +
          history[1].score +
          history[2].score
        ) / 3
      : score;

  const rawBias =
    score * 0.6 +
    shortMomentum * 0.4;

  const adjustedBias = rawBias * stabilityFactor;

  const determineRegime = (value) => {
    if (value > 35) return "Strong Risk-On";
    if (value > 15) return "Risk-On";
    if (value < -35) return "Strong Risk-Off";
    if (value < -15) return "Risk-Off";
    return "Neutral";
  };

  const regime = determineRegime(adjustedBias);

  const confirmation =
    Math.abs(adjustedBias) > 25 &&
    Math.abs(sentimentChange) > 5 &&
    stability !== "Low";

  let sustained = false;

  if (history.length >= 2) {
    const prevBias = history[1].score * 0.6 +
                     history[1].score * 0.4;

    if (
      (adjustedBias > 25 && prevBias > 25) ||
      (adjustedBias < -25 && prevBias < -25)
    ) {
      sustained = true;
    }
  }

  const swingTrigger = confirmation && sustained;

  let signalStrength = "Weak";

  if (swingTrigger && confidence > 70) {
    signalStrength = "Strong";
  } else if (confirmation) {
    signalStrength = "Moderate";
  }

  // ===== Regime Timeline =====

  let lastFlipTime = null;
  let regimeDuration = "—";

  if (history.length > 1) {
    for (let i = 1; i < history.length; i++) {
      const pastRegime = determineRegime(history[i].score);
      if (pastRegime !== regime) {
        lastFlipTime = new Date(history[i].timestamp + "Z");
        break;
      }
    }

    if (lastFlipTime) {
      const now = new Date();
      const diffMs = now - lastFlipTime;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      regimeDuration = `${diffHours}h`;
    }
  }

  let acceleration = "Stable";
  if (sentimentChange > 5) acceleration = "Increasing";
  if (sentimentChange < -5) acceleration = "Decreasing";

  const visibleHistory = isPro
    ? history
    : history.slice(0, 5);

  const chartData = {
    labels: visibleHistory.map(h =>
      new Date(h.timestamp + "Z").toLocaleTimeString()
    ).reverse(),
    datasets: [
      {
        data: visibleHistory.map(h => h.score).reverse(),
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
        <div className="mb-20">
          <h1 className="text-5xl font-semibold leading-tight">
            Know the Bias. <br />
            Catch the Swing.
          </h1>
          <p className="text-gray-400 mt-6 text-xl max-w-2xl">
            ChainPulse detects market regime shifts and momentum alignment
            before price confirms — built for disciplined swing traders.
          </p>
        </div>

        {/* Bias Engine */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 mb-16 shadow-xl">

          <div className="grid grid-cols-4 gap-8 text-center mb-8">
            <div>
              <div className="text-gray-400 text-sm">Bias Score</div>
              <div className="text-3xl font-semibold">{adjustedBias.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Regime</div>
              <div className="text-2xl font-semibold">{regime}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Signal Strength</div>
              <div className="text-2xl font-semibold">{signalStrength}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Swing Setup</div>
              <div className={`text-2xl font-semibold ${swingTrigger ? "text-green-400" : "text-gray-400"}`}>
                {swingTrigger ? "Active" : "Inactive"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-8 text-center border-t border-zinc-800 pt-8">
            <div>
              <div className="text-gray-400 text-sm">Regime Duration</div>
              <div className="text-lg font-semibold">{regimeDuration}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Last Flip</div>
              <div className="text-lg font-semibold">
                {lastFlipTime ? lastFlipTime.toLocaleString() : "—"}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Acceleration</div>
              <div className="text-lg font-semibold">{acceleration}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Regime Stability</div>
              <div className="text-lg font-semibold">{stability}</div>
            </div>
          </div>

        </div>

        {/* Trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl relative">

          <h2 className="text-xl text-gray-400 mb-8">
            Sentiment Trend (Last 30 Updates)
          </h2>

          <Line data={chartData} options={chartOptions} />

          {!isPro && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">

              <h3 className="text-2xl font-semibold mb-4">
                Full Regime History Locked
              </h3>

              <button
                onClick={handleUpgrade}
                className="bg-white text-black px-6 py-3 rounded-lg"
              >
                Upgrade — \$19/month
              </button>

            </div>
          )}

        </div>

        <div className="text-gray-600 text-xs mt-20 text-center">
          ChainPulse provides market intelligence — not financial advice.
        </div>

      </div>

    </main>
  );
}