"use client";

import { useEffect, useState } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

function getTickerColor(label) {
  if (!label) return "text-gray-400";
  if (label.includes("Strong Risk-On")) return "text-emerald-400";
  if (label.includes("Risk-On")) return "text-green-400";
  if (label.includes("Strong Risk-Off")) return "text-red-500";
  if (label.includes("Risk-Off")) return "text-red-400";
  return "text-yellow-400";
}

export default function MarketTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch(`${BACKEND}/market-overview`);
        const data = await res.json();
        setItems(data.data || []);
      } catch {
        // Fail silently — ticker is non-critical
      }
    };

    fetchOverview();
    const interval = setInterval(fetchOverview, 90_000);
    return () => clearInterval(interval);
  }, []);

  if (!items.length) return null;

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="bg-zinc-950 border-b border-zinc-900 overflow-hidden h-8 flex items-center">
      <div className="flex gap-12 animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="text-xs flex items-center gap-2">
            <span className="text-gray-500">{item.coin}</span>
            <span className={getTickerColor(item.label)}>{item.label}</span>
            <span className="text-gray-600">
              {item.score >= 0 ? "+" : ""}
              {item.score?.toFixed(1)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
