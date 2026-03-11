"use client";

import { useEffect, useState } from "react";

export default function MarketTicker() {
  const [data, setData] = useState([]);

  const fetchPrices = async () => {
    try {
      const res = await fetch(
        "https://api.binance.com/api/v3/ticker/24hr?symbols=[\"BTCUSDT\",\"ETHUSDT\"]"
      );
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Ticker fetch failed");
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-950 border-b border-zinc-900 text-sm text-gray-400 px-8 py-2">
      <div className="max-w-7xl mx-auto flex gap-12">

        {data.map((item) => {
          const symbol = item.symbol.replace("USDT", "");
          const price = parseFloat(item.lastPrice).toFixed(2);
          const change = parseFloat(item.priceChangePercent).toFixed(2);

          return (
            <div key={item.symbol} className="flex gap-3">
              <span className="text-white font-medium">
                {symbol}
              </span>
              <span>${price}</span>
              <span
                className={
                  change >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }
              >
                {change}%
              </span>
            </div>
          );
        })}

      </div>
    </div>
  );
}