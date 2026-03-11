import "./globals.css";
import MarketTicker from "@/components/MarketTicker";

export const metadata = {
  title: "ChainPulse Quant — Regime-Based Exposure Intelligence",
  description:
    "Quantitative regime survival modeling for disciplined swing traders. Allocate capital with statistical persistence awareness.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">

        {/* MARKET TICKER */}
        <MarketTicker />

        {/* NAVIGATION */}
        <nav className="bg-black border-b border-zinc-800 px-8 py-4 flex justify-between items-center">
          <div className="text-white font-semibold">
            ChainPulse Quant
          </div>

          <div className="space-x-6 text-gray-400">
            <a href="/" className="hover:text-white">Home</a>
            <a href="/app" className="hover:text-white">Dashboard</a>
            <a href="/pricing" className="hover:text-white">Pricing</a>
            <a href="/methodology" className="hover:text-white">Methodology</a>
          </div>
        </nav>

        {/* PAGE CONTENT */}
        {children}

      </body>
    </html>
  );
}