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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading ChainPulse intelligence...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">

      <h1 className="text-5xl font-bold mb-8">
        ChainPulse
      </h1>

      <div className="bg-gray-900 p-8 rounded-xl max-w-2xl text-center shadow-lg">

        <h2 className="text-3xl mb-4">
          Sentiment: {data.label} ({data.score})
        </h2>

        <p className="text-gray-400 mb-2">
          Confidence: {Math.round(data.confidence * 100)}%
        </p>

        <p className="text-lg text-gray-200 mt-4">
          {data.summary}
        </p>

        <p className="text-sm text-gray-500 mt-6">
          Updated: {new Date(data.timestamp).toLocaleString()}
        </p>

      </div>

    </main>
  );
}