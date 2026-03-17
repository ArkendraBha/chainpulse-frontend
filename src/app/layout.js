import "./globals.css";
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
      <body className="bg-black text-white relative overflow-x-hidden">
        {/* Background glow layer */}
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.15),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.12),transparent_40%)]" />

        <NavBar />
        {children}
      </body>
    </html>
  );
}