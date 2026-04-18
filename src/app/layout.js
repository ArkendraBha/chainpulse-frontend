import "./globals.css";
import NavBar from "@/components/NavBar";
import Script from "next/script";
import NavBarWrapper from "@/components/NavBarWrapper";

export const metadata = {
  title: "ChainPulse — Crypto Regime Intelligence | Survival Analysis for Swing Traders",
  description:
    "ChainPulse models crypto market regimes using survival analysis, hazard rates, and exposure calibration. Not price prediction — regime persistence probability for swing traders managing $5k–$250k+.",
  keywords:
    "ChainPulse, crypto regime intelligence, survival analysis crypto, hazard rate trading, regime-based exposure, crypto swing trading framework, Bitcoin regime indicator, market regime model",
  openGraph: {
    title: "ChainPulse — Crypto Regime Intelligence | The Original Regime Modeling Platform",
    description:
      "Survival analysis + hazard rates + exposure calibration. ChainPulse tells you how much capital belongs in the current regime — not where price is going.",
    url: "[chainpulse.pro](https://chainpulse.pro)",
    siteName: "ChainPulse",
    type: "website",
  },
  manifest: "/manifest.json",
  themeColor: "#10b981",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ChainPulse",
  },
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white relative overflow-x-hidden">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <script dangerouslySetInnerHTML={{
  __html: `if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js');});}`
}} />

        <div className="fixed inset-0 -z-10" style={{ backgroundColor: "#080809" }} />
        <div className="bg-noise" aria-hidden="true" />
        <NavBarWrapper />
        {children}
        <Script src="[googletagmanager.com](https://www.googletagmanager.com/gtag/js?id=G-32HDC3SZVE)" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-32HDC3SZVE');`}
        </Script>
      </body>
    </html>
  );
}
