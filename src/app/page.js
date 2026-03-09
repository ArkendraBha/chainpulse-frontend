"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("https://chainpulse-backend-80xy.onrender.com/latest")
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => console.error(err));
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Initializing ChainPulse Intelligence...
      </div>
    );
  }

  const score = data.score || 0;
  const confidence = data.confidence ? Math.round(data.confidence * 100) : 0;

  const sentimentColor =
    score > 10 ? "text-green-400" :
    score < -10 ? "text-red-400" :
    "text-gray-300";

  const barWidth = Math.min(Math.abs(score), 100);

  return (
    <main className="min-h-screen bg-black text-white px-8 py-16">

      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-semibold tracking-tight">
            ChainPulse
          </h1>
          <p className="text-gray-500 mt-3 text-lg">
            AI‑Driven Crypto Market Intelligence
          </p>
        </div>

        {/* Sentiment Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 shadow-xl">

          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-xl text-gray-400 tracking-wide">
              Market Sentiment
            </h2>
            <span className="text-sm text-gray-500">
              Updated {new Date(data.timestamp).toLocaleString()}
            </span>
          </div>

          <div className={`text-6xl font-bold ${sentimentColor} mb-4`}>
            {score}
          </div>

          <div className="text-lg text-gray-300 mb-6">
            {data.label}
          </div>

          {/* Sentiment Bar */}
          <div className="w-full h-2 bg-zinc-800 rounded-full mb-8 overflow-hidden">
            <div
              className={`h-full ${score >= 0 ? "bg-green-500" : "bg-red-500"}`}
              style={{ width: `${barWidth}%` }}
            ></div>
          </div>

          {/* Confidence */}
          <div className="text-sm text-gray-400 mb-8">
            Confidence Level: <span className="text-gray-200">{confidence}%</span>
          </div>

          {/* AI Summary */}
          <div className="text-gray-300 leading-relaxed text-lg">
            {data.summary}
          </div>

        </div>

      </div>

    </main>
  );
}