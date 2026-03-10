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

    const data = await res.json();
    window.location.href = data.url;
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

  const sentimentColor =
    score > 10 ? "text-green-400" :
    score < -10 ? "text-red-400" :
    "text-gray-300";

  const previousScore =
    history.length > 1 ? history[1].score : score;

  const sentimentChange = score - previousScore;

  const momentumColor =
    sentimentChange > 0 ? "text-green-400" :
    sentimentChange < 0 ? "text-red-400" :
    "text-gray-400";

  let marketState = "Neutral";
  if (score > 60) marketState = "Strong Bullish";
  else if (score > 20) marketState = "Bullish";
  else if (score < -60) marketState = "Strong Bearish";
  else if (score < -20) marketState = "Bearish";

  const visibleHistory = isPro
    ? history
    : history.slice(0, 5);

  const averageScore =
    history.length > 0
      ? (
          history.reduce((sum, h) => sum + h.score, 0) /
          history.length
        ).toFixed(1)
      : 0;

  const chartData = {
    labels: visibleHistory.map(h =>
      new Date(h.timestamp).toLocaleTimeString()
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

      <div className="max-w-5xl mx-auto">

        {/* Email Input */}
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

        {/* Header */}
        <div className="mb-20">
          <h1 className="text-5xl font-semibold tracking-tight">
            ChainPulse
          </h1>
          <p className="text-gray-500 mt-3 text-lg">
            AI‑Driven Crypto Market Intelligence
          </p>
        </div>

        {/* Current Sentiment */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 mb-16 shadow-xl">

          <div className="flex justify-between mb-8">
            <h2 className="text-xl text-gray-400 tracking-wide">
              Current Market Sentiment
            </h2>
            <span className="text-sm text-gray-500">
              {new Date(data.timestamp).toLocaleString()}
            </span>
          </div>

          <div className={`text-7xl font-bold ${sentimentColor} mb-4`}>
            {score}
          </div>

          <div className={`text-lg ${momentumColor}`}>
            {sentimentChange > 0 && "▲ "}
            {sentimentChange < 0 && "▼ "}
            {sentimentChange.toFixed(1)}
          </div>

          <div className="text-xl text-gray-300 mt-4">
            {data.label}
          </div>

          <div className="text-sm text-gray-500 mt-2">
            Market State: {marketState}
          </div>

          <div className="grid grid-cols-3 gap-6 mt-12 text-center">

            <div>
              <div className="text-gray-400 text-sm">24H Average</div>
              <div className="text-xl font-semibold">{averageScore}</div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">Momentum</div>
              <div className={`text-xl font-semibold ${momentumColor}`}>
                {sentimentChange.toFixed(1)}
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm">Confidence</div>
              <div className="text-xl font-semibold">{confidence}%</div>
            </div>

          </div>

          <div className="text-gray-300 leading-relaxed text-lg mt-12">
            {data.summary}
          </div>

        </div>

        {/* Sentiment Trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl relative">

          <h2 className="text-xl text-gray-400 tracking-wide mb-8">
            Sentiment Trend (Last 30 Updates)
          </h2>

          <Line data={chartData} options={chartOptions} />

          {!isPro && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">

              <h3 className="text-2xl font-semibold mb-4">
                Unlock Full Trend Analysis
              </h3>

              <p className="text-gray-400 mb-6 text-center max-w-md">
                Access complete sentiment history and advanced analytics.
              </p>

              <button
                onClick={handleUpgrade}
                className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Upgrade to Pro
              </button>

            </div>
          )}

        </div>

      </div>

    </main>
  );
}