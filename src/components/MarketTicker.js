"use client";

import { useEffect, useRef, useState } from "react";

const SUPPORTED_COINS = ["BTC","ETH","SOL","BNB","AVAX","LINK","ADA"];

export default function MarketTicker({ activeCoin, onSelect }) {
  const [data, setData] = useState([]);
  const scrollRef = useRef(null);
  const scrollPos = useRef(0);
  const paused = useRef(false);
  const dragging = useRef(false);
  const lastPrice = useRef({});

  // Fetch Binance prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const symbols = SUPPORTED_COINS.map(c => `${c}USDT`);
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`
        );
        const json = await res.json();
        setData(json);
      } catch {}
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const animate = () => {
      if (!paused.current && !dragging.current) {
        scrollPos.current += 0.25;
        if (scrollPos.current >= el.scrollWidth / 2) {
          scrollPos.current = 0;
        }
        el.scrollLeft = scrollPos.current;
      }
      requestAnimationFrame(animate);
    };

    animate();
  }, [data]);

  if (!data.length) return null;

  const doubled = [...data, ...data];

  const formatPrice = (price) => {
    const p = parseFloat(price);
    if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (p >= 1) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return p.toFixed(4);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Edge fade */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-950 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none z-10" />

      <div
        ref={scrollRef}
        className="flex gap-3 whitespace-nowrap overflow-hidden py-1.5 cursor-grab active:cursor-grabbing"
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
        onMouseDown={() => (dragging.current = true)}
        onMouseUp={() => (dragging.current = false)}
      >
        {doubled.map((item, i) => {
          const coin = item.symbol.replace("USDT", "");
          const change = parseFloat(item.priceChangePercent);
          const positive = change >= 0;
          const price = parseFloat(item.lastPrice);

          const flash =
            lastPrice.current[coin] &&
            price !== lastPrice.current[coin];

          lastPrice.current[coin] = price;

          const isActive = coin === activeCoin;

          return (
            <button
              key={i}
              onClick={() => onSelect?.(coin)}
              title={`Volume: ${parseFloat(item.quoteVolume).toLocaleString()}`}
              className={`
                flex flex-col px-4 py-2 rounded-xl
                border transition-all duration-300
                backdrop-blur-md
                ${isActive
                  ? "bg-white/10 border-white/20 scale-105"
                  : "bg-white/5 border-white/10 hover:bg-white/10"}
                ${positive
                  ? "shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "shadow-[0_0_10px_rgba(239,68,68,0.2)]"}
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">
                  {coin}
                </span>

                <span
                  className={`text-xs font-mono tabular-nums transition-colors duration-300 ${
                    flash
                      ? positive
                        ? "text-emerald-300"
                        : "text-red-300"
                      : "text-zinc-400"
                  }`}
                >
                  ${formatPrice(price)}
                </span>

                <span
                  className={`text-xs font-medium ${
                    positive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {positive ? "+" : ""}
                  {change.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}