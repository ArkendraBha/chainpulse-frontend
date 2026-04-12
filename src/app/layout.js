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
        <div className="fixed inset-0 -z-10">
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,0.10),transparent_40%)]" />
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(16,185,129,0.04),transparent_50%)]" />
  <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-zinc-950/40 to-transparent" />
  <div
    className="absolute inset-0 opacity-[0.015]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='[w3.org](http://www.w3.org/2000/svg)'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      backgroundRepeat: "repeat",
      backgroundSize: "128px",
    }}
  />
</div>

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