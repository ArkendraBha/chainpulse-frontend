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

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Initializing ChainPulse Intelligence...
      </div>
    );
  }

  const score = data.score || 0;
  const confidenceRaw = data.confidence
    ? Math.round(data.confidence * 100)
    : 0;

  const previousScore =
    history.length > 1 ? history[1].score : score;

  const sentimentChange = score - previousScore;

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

  const regimeColor =
    regime.includes("Risk-On")
      ? "bg-green-500"
      : regime.includes("Risk-Off")
      ? "bg-red-500"
      : "bg-gray-500";

  let modeledConfidence = confidenceRaw;

  if (stability === "Low") modeledConfidence *= 0.7;
  if (Math.abs(sentimentChange) < 5) modeledConfidence *= 0.8;

  const confidenceLevel =
    modeledConfidence > 75
      ? "High"
      : modeledConfidence > 50
      ? "Moderate"
      : "Low";

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

        <div className="mb-16">
          <h1 className="text-5xl font-semibold">
            ChainPulse
          </h1>
          <p className="text-gray-400 mt-4 text-xl">
            Institutional Swing Bias Engine
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-xl">

          <div className={`h-1 ${regimeColor}`}></div>

          <div className="bg-zinc-900 p-12 border border-zinc-800">

            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">
                  Current Regime
                </div>
                <div className="text-3xl font-semibold mt-2">
                  {regime}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">
                  Confidence
                </div>
                <div className="text-xl font-semibold">
                  {confidenceLevel}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-10 mt-10 text-center">

              <div>
                <div className="text-gray-400 text-sm">
                  Bias Score
                </div>
                <div className="text-4xl font-semibold mt-2">
                  {adjustedBias.toFixed(1)}
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">
                  Momentum
                </div>
                <div className="text-4xl font-semibold mt-2">
                  {sentimentChange.toFixed(1)}
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">
                  Stability
                </div>
                <div className="text-4xl font-semibold mt-2">
                  {stability}
                </div>
              </div>

            </div>

          </div>

        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl mt-16 relative">

          <h2 className="text-xl text-gray-400 mb-8">
            Bias Trend
          </h2>

          <Line data={chartData} options={chartOptions} />

        </div>

      </div>

    </main>
  );
}