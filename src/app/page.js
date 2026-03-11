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
  const [coin, setCoin] = useState("BTC");

  useEffect(() => {
    fetch(`https://chainpulse-backend-2xok.onrender.com/latest?coin=${coin}`)
      .then(res => res.json())
      .then(setData);

    fetch(`https://chainpulse-backend-2xok.onrender.com/history?coin=${coin}`)
      .then(res => res.json())
      .then(setHistory);

  }, [coin]);

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Initializing ChainPulse...
      </div>
    );
  }

  const determineRegime = (value) => {
    if (value > 35) return "Strong Risk-On";
    if (value > 15) return "Risk-On";
    if (value < -35) return "Strong Risk-Off";
    if (value < -15) return "Risk-Off";
    return "Neutral";
  };

  const score = data.score || 0;
  const regime = determineRegime(score);

  // === Multi-Timeframe Bias ===

  const calculateTimeframeBias = (period) => {
    if (history.length < period) return 0;
    const subset = history.slice(0, period);
    return subset.reduce((sum, h) => sum + h.score, 0) / subset.length;
  };

  const bias1H = calculateTimeframeBias(1);
  const bias4H = calculateTimeframeBias(4);
  const bias12H = calculateTimeframeBias(12);
  const bias24H = calculateTimeframeBias(24);

  const timeframeData = [
    { label: "1H", value: bias1H },
    { label: "4H", value: bias4H },
    { label: "12H", value: bias12H },
    { label: "24H", value: bias24H }
  ];

  const alignment =
    timeframeData.every(tf => determineRegime(tf.value).includes("Risk-On")) ||
    timeframeData.every(tf => determineRegime(tf.value).includes("Risk-Off"));

  // === Alignment Alert Logic ===

  const alignmentAlert =
    alignment && Math.abs(score) > 25;

  // === Alignment Accuracy (Simple Approximation) ===

  const alignedPeriods = history.filter((h, index) => {
    if (index < 4) return false;
    const slice = history.slice(index - 4, index);
    const aligned =
      slice.every(s => determineRegime(s.score).includes("Risk-On")) ||
      slice.every(s => determineRegime(s.score).includes("Risk-Off"));
    return aligned;
  });

  const alignmentAccuracy =
    history.length > 10
      ? Math.round((alignedPeriods.length / history.length) * 100)
      : 0;

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

        {/* Hero */}
        <div className="mb-16 flex justify-between items-center">

          <div>
            <h1 className="text-5xl font-semibold leading-tight">
              Multi‑Asset Swing Bias Engine
            </h1>
            <p className="text-gray-400 mt-4 text-xl">
              Detect alignment across coins and timeframes.
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

        {/* Regime Panel */}
        <div className="rounded-2xl overflow-hidden shadow-xl mb-16">

          <div className={`h-1 ${regimeColor}`}></div>

          <div className="bg-zinc-900 p-12 border border-zinc-800">

            <div className="flex justify-between items-center">

              <div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">
                  {coin} Regime
                </div>
                <div className="text-4xl font-semibold mt-3">
                  {regime}
                </div>
              </div>

              <div className="text-5xl font-bold">
                {score}
              </div>

            </div>

          </div>

        </div>

        {/* Multi-Timeframe Alignment */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl mb-16">

          <h2 className="text-xl text-gray-400 mb-10">
            Timeframe Alignment
          </h2>

          <div className="grid grid-cols-4 gap-8 text-center">

            {timeframeData.map((item, index) => {
              const regime = determineRegime(item.value);
              const color =
                regime.includes("Risk-On")
                  ? "text-green-400"
                  : regime.includes("Risk-Off")
                  ? "text-red-400"
                  : "text-gray-400";

              return (
                <div key={index}>
                  <div className="text-gray-500 text-sm">
                    {item.label}
                  </div>
                  <div className={`text-xl font-semibold mt-3 ${color}`}>
                    {regime}
                  </div>
                </div>
              );
            })}

          </div>

          <div className="mt-10 text-center text-gray-400">
            Alignment Status:{" "}
            <span className={`font-semibold ${
              alignment ? "text-green-400" : "text-gray-400"
            }`}>
              {alignment ? "Aligned" : "Mixed"}
            </span>
          </div>

          {alignmentAlert && (
            <div className="mt-6 text-center text-yellow-400">
              Alignment Alert: High‑quality swing environment detected.
            </div>
          )}

        </div>

        {/* Alignment Accuracy */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 shadow-xl mb-16 text-center">

          <div className="text-gray-400 text-sm">
            Historical Alignment Accuracy
          </div>

          <div className="text-5xl font-bold mt-6">
            {alignmentAccuracy}%
          </div>

        </div>

        {/* Trend Chart */}
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