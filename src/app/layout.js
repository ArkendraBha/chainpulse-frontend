import "./globals.css";
import NavBar from "@/components/NavBar";
import Script from "next/script";
import NavBarWrapper from "@/components/NavBarWrapper";

export const metadata = {
  title: "Bitcoin Regime Indicator — Crypto Market Risk Model | ChainPulse",
  description:
    "ChainPulse is a Bitcoin regime indicator using survival modeling to quantify crypto market risk, shift probability, hazard rate, and optimal exposure for swing traders.",
  openGraph: {
    title: "Bitcoin Regime Indicator — Crypto Market Risk Model | ChainPulse",
    description:
      "Survival-based crypto market risk model. Quantify regime persistence, shift risk, and optimal exposure.",
    url: "https://chainpulse.pro",
    siteName: "ChainPulse",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white relative overflow-x-hidden">
<a href="#main-content" className="skip-link">Skip to main content</a>
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.25),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.20),transparent_45%)]" />
        <NavBarWrapper />
        {children}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-32HDC3SZVE" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-32HDC3SZVE');`}
        </Script>
      </body>
    </html>
  );
}