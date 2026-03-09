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

  const barWidth = Math.min(Math.abs(score), 100);

  const chartData = {
    labels: history.map(h =>
      new Date(h.timestamp).toLocaleTimeString()
    ).reverse(),
    datasets: [
      {
        data: history.map(h => h.score).reverse(),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.1)",
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

          <div className="text-xl text-gray-300 mb-6">
            {data.label}
          </div>

          <div className="w-full h-2 bg-zinc-800 rounded-full mb-8 overflow-hidden">
            <div
              className={`h-full ${
                score >= 0 ? "bg-green-500" : "bg-red-500"
              }`}
              style={{ width: `${barWidth}%` }}
            ></div>
          </div>

          <div className="text-sm text-gray-400 mb-8">
            Confidence: <span className="text-gray-200">{confidence}%</span>
          </div>

          <div className="text-gray-300 leading-relaxed text-lg">
            {data.summary}
          </div>

        </div>

        {/* Sentiment Trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl">

          <h2 className="text-xl text-gray-400 tracking-wide mb-8">
            Sentiment Trend (Last 30 Updates)
          </h2>

          {history.length > 0 && (
            <Line data={chartData} options={chartOptions} />
          )}

        </div>

      </div>

    </main>
  );
}