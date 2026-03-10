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

  useEffect(() => {
    fetch("https://chainpulse-backend-80xy.onrender.com/latest")
      .then(res => res.json())
      .then(setData);

    fetch("https://chainpulse-backend-80xy.onrender.com/history")
      .then(res => res.json())
      .then(setHistory);

  }, []);

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

  const regime = determineRegime(score);

  const sentimentChange =
    history.length > 1
      ? score - history[1].score
      : 0;

  const recentScores = history.slice(0, 5).map(h => h.score);
  const volatility =
    recentScores.length > 0
      ? Math.max(...recentScores) - Math.min(...recentScores)
      : 0;

  let stability = "High";
  if (volatility > 30) stability = "Low";
  else if (volatility > 15) stability = "Moderate";

  const environmentScore = Math.min(
    100,
    Math.max(
      0,
      Math.abs(score) * 0.6 +
      Math.abs(sentimentChange) * 0.3 +
      (stability === "High" ? 10 : 0)
    )
  );

  // === Decision Layer ===

  let marketStance = "Neutral";
  let preferredSetup = "Wait for clarity";
  let avoidCondition = "High volatility reversals";

  if (regime.includes("Risk-On")) {
    marketStance = "Bullish Bias";
    preferredSetup = "Long pullbacks / breakout continuation";
    avoidCondition = "Counter-trend shorts";
  }

  if (regime.includes("Risk-Off")) {
    marketStance = "Bearish Bias";
    preferredSetup = "Short rallies / breakdown continuation";
    avoidCondition = "Aggressive long entries";
  }

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

  const regimeColor =
    regime.includes("Risk-On")
      ? "bg-green-500"
      : regime.includes("Risk-Off")
      ? "bg-red-500"
      : "bg-gray-500";

  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">

      <div className="max-w-6xl mx-auto">

        <div className="mb-16">
          <h1 className="text-5xl font-semibold leading-tight">
            Trade the Regime. <br />
            Not the Noise.
          </h1>
          <p className="text-gray-400 mt-6 text-xl max-w-2xl">
            ChainPulse identifies when bias and momentum align —
            helping swing traders avoid false entries.
          </p>
        </div>

        {/* Intelligence Layer */}
        <div className="rounded-2xl overflow-hidden shadow-xl mb-16">
          <div className={`h-1 ${regimeColor}`}></div>
          <div className="bg-zinc-900 p-12 border border-zinc-800">

            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">
                  Current Regime
                </div>
                <div className="text-4xl font-semibold mt-3">
                  {regime}
                </div>
                <div className="text-gray-400 mt-4">
                  Stability: {stability}
                </div>
              </div>
              <div className="text-5xl font-bold">
                {score}
              </div>
            </div>

          </div>
        </div>

        {/* Decision Layer */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl mb-16">

          <h2 className="text-xl text-gray-400 mb-8">
            Today’s Bias Playbook
          </h2>

          <div className="grid grid-cols-2 gap-12">

            <div>
              <div className="text-gray-400 text-sm">Market Stance</div>
              <div className="text-2xl font-semibold mt-2">
                {marketStance}
              </div>

              <div className="text-gray-400 text-sm mt-8">
                Preferred Setup
              </div>
              <div className="text-lg mt-2">
                {preferredSetup}
              </div>

              <div className="text-gray-400 text-sm mt-8">
                Avoid
              </div>
              <div className="text-lg mt-2">
                {avoidCondition}
              </div>
            </div>

            <div className="text-center">
              <div className="text-gray-400 text-sm">
                Trade Environment Score
              </div>
              <div className="text-6xl font-bold mt-6">
                {environmentScore.toFixed(0)}
              </div>
              <div className="text-gray-400 mt-4">
                Higher score = cleaner swing conditions
              </div>
            </div>

          </div>

        </div>

        {/* Trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl">

          <h2 className="text-xl text-gray-400 mb-8">
            Bias Trend
          </h2>

          <Line data={chartData} options={chartOptions} />

        </div>

        <div className="text-gray-600 text-xs mt-20 text-center">
          Built for disciplined swing traders. Not financial advice.
        </div>

      </div>

    </main>
  );
}