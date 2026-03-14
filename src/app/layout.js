import "./globals.css";
import MarketTicker from "@/components/MarketTicker";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "ChainPulse Quant — Regime-Based Exposure Intelligence",
  description:
    "Quantitative regime survival modeling for disciplined swing traders. Allocate capital with statistical persistence awareness.",
  openGraph: {
    title: "ChainPulse Quant — Regime-Based Exposure Intelligence",
    description:
      "Statistical survival modeling for swing traders. Press size when persistence is strong.",
    url: "https://chainpulse.pro",
    siteName: "ChainPulse Quant",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <MarketTicker />
        <NavBar />
        {children}
      </body>
    </html>
  );
}