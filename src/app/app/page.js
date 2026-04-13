"use client";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect, useState, useCallback, useRef, memo, useMemo } from "react";

import {
  AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
const SUPPORTED_COINS = ["BTC", "ETH", "SOL", "BNB", "AVAX", "LINK", "ADA"];
const REFRESH_MS = 60_000;

// ─────────────────────────────────────────────────────────
// LAZY PANEL HOOK
// ─────────────────────────────────────────────────────────
function useLazyPanel(ref) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return isVisible;
}

// ─────────────────────────────────────────────────────────
// COMPARISON MODE PANEL
// ─────────────────────────────────────────────────────────
const ComparisonModePanel = memo(function ComparisonModePanel({ primaryCoin, token, isPro, onUnlock }) {
  const [compareCoin, setCompareCoin] = useState("ETH");
  const [primaryData, setPrimaryData] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const isVisible = useLazyPanel(containerRef);

  const otherCoins = SUPPORTED_COINS.filter((c) => c !== primaryCoin);

  useEffect(() => {
    if (!isPro || !primaryCoin || !compareCoin || !isVisible) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/dashboard?coin=${primaryCoin}`, token).catch(() => null),
      apiFetch(`/dashboard?coin=${compareCoin}`, token).catch(() => null),
    ]).then(([a, b]) => {
      if (a && !a.error) setPrimaryData(a.stack);
      if (b && !b.error) setCompareData(b.stack);
    }).finally(() => setLoading(false));
  }, [primaryCoin, compareCoin, isPro, token, isVisible]);

  const metrics = [
    { key: "exposure",   label: "Exposure",  fmt: (v) => `${v ?? "—"}%`, colorFn: exposureColor },
    { key: "shift_risk", label: "Shift Risk", fmt: (v) => `${v ?? "—"}%`, colorFn: riskColor },
    { key: "hazard",     label: "Hazard",     fmt: (v) => `${v ?? "—"}%`, colorFn: riskColor },
    { key: "survival",   label: "Survival",   fmt: (v) => `${v ?? "—"}%`, colorFn: (v) => riskColor(100 - v) },
    { key: "alignment",  label: "Alignment",  fmt: (v) => `${v ?? "—"}%`, colorFn: alignColor },
  ];

  const inner = (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white/2 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
          {primaryCoin}
          <span className="text-zinc-500 text-xs ml-2 font-normal">primary</span>
        </div>
        <div className="text-zinc-600 text-lg font-light">vs</div>
        <select
          value={compareCoin}
          onChange={(e) => setCompareCoin(e.target.value)}
          className="flex-1 bg-zinc-950 border border-zinc-700 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
        >
          {otherCoins.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading && <div className="text-sm text-zinc-400 text-center py-4">Comparing regimes...</div>}

      {primaryData && compareData && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { coin: primaryCoin, stack: primaryData },
              { coin: compareCoin, stack: compareData },
            ].map(({ coin, stack }) => (
              <div key={coin} className={`border rounded-xl p-4 space-y-2 ${regimeBorder(stack.execution?.label)}`}>
                <div className="text-xs text-zinc-400 font-medium">{coin}</div>
                <div className={`text-lg font-bold ${regimeText(stack.execution?.label)}`}>
                  {stack.execution?.label ?? "—"}
                </div>
                <div className="text-xs text-zinc-500">{stack.regime_age_hours?.toFixed(1)}h active</div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-600 uppercase tracking-widest pb-1">
              <div>{primaryCoin}</div>
              <div className="text-center">Metric</div>
              <div className="text-right">{compareCoin}</div>
            </div>
            {metrics.map(({ key, label, fmt, colorFn }) => {
              const aVal = primaryData[key];
              const bVal = compareData[key];
              return (
                <div key={key} className="grid grid-cols-3 gap-2 items-center py-2 border-b border-white/5">
                  <div className={`text-lg font-bold tabular-nums ${aVal != null ? colorFn(aVal) : "text-zinc-600"}`}>
                    {fmt(aVal)}
                  </div>
                  <div className="text-center text-xs text-zinc-500">{label}</div>
                  <div className={`text-lg font-bold tabular-nums text-right ${bVal != null ? colorFn(bVal) : "text-zinc-600"}`}>
                    {fmt(bVal)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">Timeframe Alignment</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { coin: primaryCoin, stack: primaryData },
                { coin: compareCoin, stack: compareData },
              ].map(({ coin, stack }) => (
                <div key={coin} className="space-y-1.5">
                  <div className="text-xs text-zinc-500 font-medium">{coin}</div>
                  {[
                    { label: "Macro", data: stack.macro },
                    { label: "Trend", data: stack.trend },
                    { label: "Exec",  data: stack.execution },
                  ].map(({ label, data }) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-600 w-8 shrink-0">{label}</span>
                      <span className={`${data ? regimeText(data.label) : "text-zinc-700"} font-medium`}>
                        {data?.label?.replace("Strong ", "S.").replace("Risk-On", "R+").replace("Risk-Off", "R-") ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (!isPro)
    return (
      <div ref={containerRef}>
        <ProGate
          label="Comparison Mode"
          consequence="Overlay any two assets side by side to find the strongest regime opportunity right now."
          onUnlock={onUnlock}
          requiredTier="pro"
        >
          <div className="h-32 bg-zinc-900/40 rounded-xl" />
        </ProGate>
      </div>
    );

  return (
    <div ref={containerRef}>
      <CardShell>
        <Label>Comparison Mode</Label>
        <p className="text-xs text-zinc-400 mb-4">Side-by-side regime analysis across any two assets</p>
        {inner}
      </CardShell>
    </div>
  );
});

// ─────────────────────────────────────────────────────────
// TIER UPGRADE BLOCK — replaces individual locked panel wall
// ─────────────────────────────────────────────────────────
function TierUpgradeBlock({ tier, price, color, border, bg, label, tagline, features, onUnlock }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border ${border} ${bg} rounded-2xl overflow-hidden`}>
      <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-1.5 flex-1">
          <div className={`text-xs font-semibold uppercase tracking-widest ${color}`}>{label}</div>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">{tagline}</p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1 mt-1"
          >
            {expanded ? "Hide features" : `See all ${features.length} features`}
            <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={onUnlock}
            className="bg-white text-black px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-100 transition-all hover:-translate-y-[1px] hover:shadow-lg whitespace-nowrap"
          >
            Unlock {price}/month →
          </button>
          <div className="text-[10px] text-zinc-700">7-day free trial · Cancel anytime</div>
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-6 border-t border-white/5 pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {features.map((feat) => (
              <div key={feat} className="flex items-start gap-2.5 text-xs text-zinc-500">
                <svg className={`w-3.5 h-3.5 ${color} shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {feat}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// REGIME HERO BAR
// ─────────────────────────────────────────────────────────
function RegimeHeroBar({ stack, decision, isPro, isEssential, onUnlock, wsStatus }) {
  if (!stack) return null;

  const execLabel  = stack.execution?.label ?? "—";
  const exposure   = stack.exposure   ?? 0;
  const shiftRisk  = stack.shift_risk ?? 0;
  const hazard     = stack.hazard     ?? 0;
  const survival   = stack.survival   ?? 0;
  const alignment  = stack.alignment  ?? 0;

  const regimeBgMap = {
    "Strong Risk-On":  "from-emerald-950/60 to-transparent border-emerald-800/50",
    "Risk-On":         "from-green-950/40 to-transparent border-green-900/40",
    "Neutral":         "from-yellow-950/30 to-transparent border-yellow-900/30",
    "Risk-Off":        "from-red-950/40 to-transparent border-red-900/40",
    "Strong Risk-Off": "from-red-950/60 to-transparent border-red-800/50",
  };
  const gradClass = regimeBgMap[execLabel] ?? "from-zinc-900/40 to-transparent border-white/10";

  return (
    <div className={`bg-gradient-to-r ${gradClass} border rounded-2xl px-6 py-6 transition-all duration-700`} style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset" }}>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">

        {/* Left: Regime identity */}
        <div className="flex items-center gap-5">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Current Regime</div>
            <div className={`text-3xl font-bold tracking-tight ${regimeText(execLabel)}`}>{execLabel}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {stack.regime_age_hours?.toFixed(1)}h active
              {wsStatus === "connected" && <span className="ml-2 text-emerald-500">· Live</span>}
            </div>
          </div>
          <div className={`hidden sm:flex flex-col items-center px-4 py-2.5 rounded-xl border bg-black/20 ${
            alignment >= 80 ? "border-emerald-800/60" :
            alignment >= 50 ? "border-yellow-800/60" : "border-red-800/60"
          }`}>
            <div className={`text-2xl font-bold ${alignColor(alignment)}`}>{alignment}%</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Aligned</div>
          </div>
        </div>

        {/* Center: Key numbers */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: "Exposure",  value: `${exposure}%`,  colorFn: () => exposureColor(exposure)      },
            { label: "Shift Risk",value: `${shiftRisk}%`, colorFn: () => riskColor(shiftRisk)         },
            { label: "Hazard",    value: `${hazard}%`,    colorFn: () => riskColor(hazard)            },
            { label: "Survival",  value: `${survival}%`,  colorFn: () => riskColor(100 - survival)    },
          ].map(({ label, value, colorFn }) => (
            <div
              key={label}
              className={`flex flex-col items-center px-3 py-2 rounded-lg bg-black/20 border border-white/5 min-w-[72px] ${!isEssential ? "cursor-pointer" : ""}`}
              onClick={!isEssential ? onUnlock : undefined}
            >
              <div className={`text-xl font-bold tabular-nums ${isEssential ? colorFn() : "text-zinc-700"} ${!isEssential ? "blur-sm select-none" : ""}`}>
                {isEssential ? value : "—%"}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>

        {/* Right: Directive */}
        <div className="shrink-0">
          {isEssential && decision ? (
            <div className="flex flex-col items-end gap-1">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Directive</div>
              <div className={`text-lg font-bold ${
                decision.action === "aggressive" ? "text-emerald-400" :
                decision.action === "hold"       ? "text-green-400"   :
                decision.action === "trim"       ? "text-yellow-400"  :
                decision.action === "defensive"  ? "text-orange-400"  : "text-red-400"
              }`}>{decision.directive}</div>
              <div className="text-xs text-zinc-500">Score: {decision.score}/100</div>
            </div>
          ) : (
            <button
              onClick={onUnlock}
              className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-[1px]"
            >
              Unlock Directive →
            </button>
          )}
        </div>
      </div>

      {/* Bottom: Timeframe strip */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3 flex-wrap">
        {[
          { label: "Macro (1D)",     data: stack.macro     },
          { label: "Trend (4H)",     data: stack.trend     },
          { label: "Execution (1H)", data: stack.execution },
        ].map(({ label, data }) => (
          <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
            data ? regimeBorder(data.label) : "border-white/5 bg-transparent"
          }`}>
            <span className="text-zinc-500">{label}</span>
            <span className={`font-semibold ${data ? regimeText(data.label) : "text-zinc-600"}`}>
              {data?.label ?? "—"}
            </span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3">
  <button
    onClick={() => captureRegimeSnapshot(stack.coin, execLabel, exposure, shiftRisk, decision)}
    className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1 border border-zinc-800 px-2 py-1 rounded-lg"
    aria-label="Copy regime snapshot to clipboard"
    title="Copy regime snapshot to clipboard"
  >
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
    Share
  </button>
  <div className="text-[10px] text-zinc-600 hidden md:block">
    <kbd className="border border-zinc-700 px-1 py-0.5 rounded">⌘K</kbd> commands ·{" "}
    <kbd className="border border-zinc-700 px-1 py-0.5 rounded">?</kbd> shortcuts
  </div>
</div>

      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// SKELETON COMPONENTS
// ─────────────────────────────────────────────────────────
function CardSkeleton({ rows = 3 }) {
  return (
    <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-8 space-y-4">
      <div className="h-2.5 w-20 rounded skeleton-shimmer" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded skeleton-shimmer"
            style={{
              width: `${[85, 70, 90, 60, 75][i % 5]}%`,
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function RegimeStackSkeleton() {
  return (
    <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-8 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-2.5 w-20 rounded skeleton-shimmer" />
          <div className="h-6 w-48 rounded skeleton-shimmer" />
        </div>
        <div className="h-7 w-20 rounded-full skeleton-shimmer" />
      </div>
      <div className="space-y-2">
        {["Macro", "Trend", "Execution"].map((l, i) => (
          <div
            key={l}
            className="flex items-center justify-between px-5 py-4 border border-white/5 rounded-lg"
          >
            <div className="h-4 w-24 rounded skeleton-shimmer" style={{ animationDelay: `${i * 80}ms` }} />
            <div className="h-4 w-32 rounded skeleton-shimmer" style={{ animationDelay: `${i * 80 + 40}ms` }} />
            <div className="h-3 w-20 rounded skeleton-shimmer hidden sm:block" style={{ animationDelay: `${i * 80 + 80}ms` }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-3">
            <div className="h-2.5 w-16 rounded skeleton-shimmer" />
            <div className="h-9 w-20 rounded skeleton-shimmer" />
            <div className="h-1 w-full rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-3"
        >
          <div className="h-2.5 w-20 rounded skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="h-9 w-24 rounded skeleton-shimmer" style={{ animationDelay: `${i * 60 + 30}ms` }} />
          <div className="h-1 w-full rounded skeleton-shimmer" style={{ animationDelay: `${i * 60 + 60}ms` }} />
          <div className="h-3 w-28 rounded skeleton-shimmer" style={{ animationDelay: `${i * 60 + 90}ms` }} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TOAST NOTIFICATION SYSTEM
// ─────────────────────────────────────────────────────────
const toastListeners = new Set();
let toastIdCounter = 0;

function emitToast({ type = "info", title, message, duration = 5000 }) {
  const id = ++toastIdCounter;
  toastListeners.forEach((fn) => fn({ id, type, title, message, duration }));
  return id;
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (toast) => {
      setToasts((prev) => [...prev.slice(-4), toast]);
      if (toast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);
      }
    };
    toastListeners.add(handler);
    return () => toastListeners.delete(handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          {...toast}
          onRemove={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
        />
      ))}
    </div>
  );
}

function ToastItem({ id, type, title, message, onRemove }) {
  const styles = {
    critical: { border: "border-red-700",     bg: "bg-red-950/95",     dot: "bg-red-400",     text: "text-red-200"     },
    warning:  { border: "border-yellow-700",  bg: "bg-yellow-950/95",  dot: "bg-yellow-400",  text: "text-yellow-200"  },
    success:  { border: "border-emerald-700", bg: "bg-emerald-950/95", dot: "bg-emerald-400", text: "text-emerald-200" },
    info:     { border: "border-zinc-700",    bg: "bg-zinc-950/95",    dot: "bg-zinc-400",    text: "text-zinc-200"    },
  };
  const s = styles[type] || styles.info;

  return (
    <div
      className={`border ${s.border} ${s.bg} rounded-xl px-4 py-3 backdrop-blur-md shadow-2xl shadow-black/60
        flex items-start gap-3 pointer-events-auto
        animate-[slideInFromRight_0.3s_ease-out]`}
    >
      <div className={`w-2 h-2 rounded-full ${s.dot} mt-1.5 shrink-0 animate-pulse`} />
      <div className="flex-1 min-w-0">
        {title && <div className={`text-sm font-semibold ${s.text}`}>{title}</div>}
        {message && <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{message}</div>}
      </div>
      <button
  onClick={onRemove}
  aria-label="Dismiss notification"
  className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 mt-0.5 pointer-events-auto"
>

        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// COMMAND PALETTE
// ─────────────────────────────────────────────────────────
function CommandPalette({ onCoinSelect, onUnlock }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const ALL_COMMANDS = [
    { id: "btc",  label: "Switch to Bitcoin",   group: "Assets",     shortcut: "1", action: () => { onCoinSelect("BTC"); } },
    { id: "eth",  label: "Switch to Ethereum",  group: "Assets",     shortcut: "2", action: () => { onCoinSelect("ETH"); } },
    { id: "sol",  label: "Switch to Solana",    group: "Assets",     shortcut: "3", action: () => { onCoinSelect("SOL"); } },
    { id: "bnb",  label: "Switch to BNB",       group: "Assets",     shortcut: "4", action: () => { onCoinSelect("BNB"); } },
    { id: "avax", label: "Switch to Avalanche", group: "Assets",     shortcut: "5", action: () => { onCoinSelect("AVAX"); } },
    { id: "link", label: "Switch to Chainlink", group: "Assets",     shortcut: "6", action: () => { onCoinSelect("LINK"); } },
    { id: "ada",  label: "Switch to Cardano",   group: "Assets",     shortcut: "7", action: () => { onCoinSelect("ADA"); } },
    { id: "upgrade",     label: "Upgrade Plan",        group: "Account",    action: () => { onUnlock(); } },
    { id: "pricing",     label: "View Pricing",         group: "Navigation", action: () => { window.location.href = "/pricing"; } },
    { id: "methodology", label: "Read Methodology",     group: "Navigation", action: () => { window.location.href = "/methodology"; } },
    { id: "home",        label: "Go to Home",           group: "Navigation", action: () => { window.location.href = "/"; } },
    { id: "refresh",     label: "Refresh Dashboard",    group: "Data",       action: () => { window.location.reload(); } },
  ];

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = ALL_COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.group.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      const cmd = filtered[selectedIndex];
      if (cmd) { cmd.action(); setOpen(false); }
    }
  };

  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  let flatIndex = -1;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh] px-4"
      onClick={() => setOpen(false)}
      style={{ animation: "backdropFadeIn 0.15s ease-out" }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-zinc-950 border border-zinc-700/80 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "paletteSlideIn 0.2s ease-out" }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
          <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, assets, panels..."
            className="flex-1 bg-transparent text-white text-sm placeholder-zinc-600 focus:outline-none"
          />
          <kbd className="text-[10px] text-zinc-600 border border-zinc-700 px-1.5 py-0.5 rounded-md shrink-0">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-600">
              No commands found{query ? ` for "${query}"` : ""}
            </div>
          ) : (
            Object.entries(grouped).map(([group, cmds]) => (
              <div key={group} className="mb-1">
                <div className="px-4 py-1.5 text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
                  {group}
                </div>
                {cmds.map((cmd) => {
                  flatIndex++;
                  const currentFlatIndex = flatIndex;
                  const isSelected = currentFlatIndex === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => { cmd.action(); setOpen(false); }}
                      onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left ${
                        isSelected ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span>{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className={`text-[10px] border px-1.5 py-0.5 rounded-md transition-colors ${
                          isSelected ? "border-zinc-600 text-zinc-400" : "border-zinc-700 text-zinc-600"
                        }`}>
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-zinc-800 flex gap-4 text-[10px] text-zinc-600">
          <span><kbd className="border border-zinc-700 px-1 py-0.5 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="border border-zinc-700 px-1 py-0.5 rounded">↵</kbd> select</span>
          <span><kbd className="border border-zinc-700 px-1 py-0.5 rounded">Esc</kbd> close</span>
          <span className="ml-auto"><kbd className="border border-zinc-700 px-1 py-0.5 rounded">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS HANDLER + HELP MODAL
// ─────────────────────────────────────────────────────────
function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "?") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  const shortcuts = [
    { keys: ["⌘", "K"],  desc: "Open command palette"  },
    { keys: ["1"],        desc: "Switch to Bitcoin"      },
    { keys: ["2"],        desc: "Switch to Ethereum"     },
    { keys: ["3"],        desc: "Switch to Solana"       },
    { keys: ["4"],        desc: "Switch to BNB"          },
    { keys: ["5"],        desc: "Switch to Avalanche"    },
    { keys: ["6"],        desc: "Switch to Chainlink"    },
    { keys: ["7"],        desc: "Switch to Cardano"      },
    { keys: ["U"],        desc: "Open upgrade modal"     },
    { keys: ["?"],        desc: "Show this reference"    },
    { keys: ["Esc"],      desc: "Close modals"           },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-zinc-950 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Keyboard Shortcuts</h2>
          <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map(({ keys, desc }) => (
            <div key={desc} className="flex items-center justify-between py-1">
              <span className="text-sm text-zinc-400">{desc}</span>
              <div className="flex gap-1">
                {keys.map((k) => (
                  <kbd key={k} className="text-[11px] border border-zinc-700 bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded-md font-mono">{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-800 text-center">
          <span className="text-xs text-zinc-600">Press <kbd className="border border-zinc-700 px-1 py-0.5 rounded text-[10px]">?</kbd> anywhere to toggle</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PREMIUM CHART TOOLTIP
// ─────────────────────────────────────────────────────────
function PremiumTooltip({ active, payload, label, labelFormatter, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-950 border border-zinc-700/60 rounded-xl shadow-2xl shadow-black/70 px-4 py-3 backdrop-blur-md min-w-[130px]">
      {label !== undefined && (
        <div className="text-[10px] text-zinc-500 mb-2 pb-1.5 border-b border-zinc-800">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-[11px] text-zinc-400">{entry.name}</span>
            </div>
            <span className="text-[11px] font-semibold text-white tabular-nums">
              {formatter ? formatter(entry.value, entry.name)[0] : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// UPGRADE NUDGE STRIP (persistent bottom bar for free users)
// ─────────────────────────────────────────────────────────
function UpgradeNudgeStrip({ isPro, isProTier, onUnlock }) {
  const [dismissed, setDismissed] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);

  const messages = [
    { text: "You're missing exposure modeling, survival curves, and the decision engine.", cta: "Unlock Essential — $39/mo" },
    { text: "Essential users get the hazard rate, shift risk, and full regime stack coherence.", cta: "Try Essential Free" },
    { text: "One avoided over-exposure event pays for months of Essential.", cta: "View Plans" },
  ];

  useEffect(() => {
    const iv = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 9000);
    return () => clearInterval(iv);
  }, []);

  if (isProTier || dismissed) return null;

  const msg = messages[msgIdx];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pointer-events-none">
      <div className="max-w-7xl mx-auto pointer-events-auto">
        <div className="bg-zinc-900/97 backdrop-blur-lg border border-zinc-700/70 rounded-2xl px-5 py-3 flex items-center justify-between gap-4 shadow-[0_-4px_40px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <p className="text-xs text-zinc-400 truncate">{msg.text}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onUnlock}
              className="bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-zinc-100 transition-all hover:-translate-y-[1px] hover:shadow-lg whitespace-nowrap"
            >
              {msg.cta}
            </button>
            <button
  onClick={() => setDismissed(true)}
  aria-label="Dismiss upgrade prompt"
  className="text-zinc-600 hover:text-zinc-400 transition-colors p-1"
>

              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TEASER PRO GATE (replaces existing ProGate)
// ─────────────────────────────────────────────────────────
function ProGateTeaser({ label, consequence, children, onUnlock, requiredTier, teaserValue, teaserSuffix = "%", teaserHint }) {
  const [hovered, setHovered] = useState(false);
  const tierLabel = requiredTier === "institutional" ? "Institutional" : requiredTier === "pro" ? "Pro" : "Essential";
  const tierPrice = requiredTier === "institutional" ? "$149" : requiredTier === "pro" ? "$79" : "$39";

  return (
    <div
      className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] p-8 space-y-4 relative overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.25em] mb-2">{label}</div>

      {teaserValue != null ? (
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="text-5xl font-bold text-zinc-700 select-none" style={{ filter: "blur(4px)" }}>
              {teaserValue}{teaserSuffix}
            </div>
          </div>
          <div className="w-full bg-zinc-800/60 rounded-full h-[3px]">
            <div className="h-[3px] rounded-full bg-zinc-700" style={{ width: "62%", filter: "blur(1px)" }} />
          </div>
          {teaserHint && (
            <div className="text-xs text-zinc-700 select-none" style={{ filter: "blur(2px)" }}>{teaserHint}</div>
          )}
        </div>
      ) : (
        <div className="blur-sm select-none pointer-events-none opacity-25 max-h-28 overflow-hidden">
          {children}
        </div>
      )}

      {/* Hover overlay */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-250 rounded-2xl ${
          hovered ? "bg-zinc-950/97" : "bg-zinc-950/80"
        }`}
      >
        <div className={`text-center space-y-3 px-6 max-w-xs transition-all duration-200 ${hovered ? "scale-100 opacity-100" : "scale-95 opacity-90"}`}>
          <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white">
            <svg className="w-3.5 h-3.5 text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            {tierLabel} Feature
          </div>
          {consequence && (
            <p className="text-xs text-zinc-400 leading-relaxed">{consequence}</p>
          )}
          <button
            onClick={onUnlock}
            className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              hovered
                ? "bg-white text-black shadow-lg -translate-y-0.5 hover:-translate-y-1"
                : "bg-white/10 text-zinc-300 border border-white/10"
            }`}
          >
            Unlock {tierLabel} — {tierPrice}/month
          </button>
          <div className="text-[10px] text-zinc-700">7-day free trial · Cancel anytime</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// REGIME CALENDAR
// ─────────────────────────────────────────────────────────
const RegimeCalendar = memo(function RegimeCalendar({ coin, token, isPro, onUnlock }) {
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const containerRef = useRef(null);
  const isVisible = useLazyPanel(containerRef);

  const REGIME_CAL_COLORS = {
    "Strong Risk-On":  { bg: "bg-emerald-500/40",  border: "border-emerald-700/60",  text: "text-emerald-300"  },
    "Risk-On":         { bg: "bg-green-500/30",    border: "border-green-700/50",    text: "text-green-300"    },
    "Neutral":         { bg: "bg-yellow-500/25",   border: "border-yellow-700/40",   text: "text-yellow-300"   },
    "Risk-Off":        { bg: "bg-red-500/25",      border: "border-red-700/40",      text: "text-red-300"      },
    "Strong Risk-Off": { bg: "bg-red-600/40",      border: "border-red-800/60",      text: "text-red-400"      },
  };

  useEffect(() => {
    if (!isPro || !coin || !token || !isVisible) return;
    setLoading(true);
    apiFetch(`/regime-calendar?coin=${coin}&year=${viewYear}&month=${viewMonth + 1}`, token)
      .then((d) => { if (!d.error && d.days) setCalendarData(d.days); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [coin, token, isPro, viewYear, viewMonth, isVisible]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const monthName = new Date(viewYear, viewMonth).toLocaleString("en", { month: "long", year: "numeric" });
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const inner = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); }}
            aria-label="Previous month"
            className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-medium text-white min-w-[150px] text-center">{monthName}</span>
          <button
            onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); }}
            disabled={isCurrentMonth}
            aria-label="Next month"
            className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        {loading && <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-[10px] text-zinc-600 uppercase tracking-widest py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const regime = calendarData[dateKey];
          const colors = regime ? REGIME_CAL_COLORS[regime] : null;
          const isToday = day === now.getDate() && isCurrentMonth;
          const isFuture = new Date(viewYear, viewMonth, day) > now;

          return (
            <div
              key={day}
              className="relative aspect-square"
              onMouseEnter={() => setHoveredDay({ day, dateKey, regime })}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div className={`
                w-full h-full rounded-lg flex items-center justify-center text-xs font-medium
                transition-all duration-150 select-none
                ${isFuture ? "opacity-20 cursor-default" : "cursor-default"}
                ${colors ? `${colors.bg} border ${colors.border} ${colors.text}` : "bg-zinc-900/40 border border-zinc-800 text-zinc-600"}
                ${isToday ? "ring-2 ring-white/60 ring-offset-1 ring-offset-black" : ""}
                ${hoveredDay?.day === day && !isFuture ? "scale-110 z-10 shadow-lg" : ""}
              `}>
                {day}
              </div>
              {hoveredDay?.day === day && regime && !isFuture && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none whitespace-nowrap">
                  <div className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                    <div className="text-zinc-500 mb-0.5">{dateKey}</div>
                    <div className={`font-semibold ${colors?.text}`}>{regime}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-white/5">
        {Object.entries(REGIME_CAL_COLORS).map(([label, colors]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${colors.bg} border ${colors.border}`} />
            <span className="text-[10px] text-zinc-600">{label.replace("Strong ", "S.")}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (!isPro)
    return (
      <div ref={containerRef}>
        <ProGate label="Regime History Calendar" consequence="See which regime was active every day this month — spot patterns and seasonality." onUnlock={onUnlock} requiredTier="essential">
          {inner}
        </ProGate>
      </div>
    );

  return (
    <div ref={containerRef}>
      <CardShell>
        <Label>Regime History Calendar</Label>
        <p className="text-xs text-zinc-400">{coin} daily regime — hover any day for details</p>
        {inner}
      </CardShell>
    </div>
  );
});


// ─────────────────────────────────────────────────────────
// ONBOARDING TOUR
// ─────────────────────────────────────────────────────────
function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState(null);

  const STEPS = [
    {
      selector: "[data-tour='regime-stack']",
      title: "Your Regime Stack",
      description: "This shows the current market regime across 3 timeframes. When Macro, Trend, and Execution all agree, that's your highest-conviction signal.",
    },
    {
      selector: "[data-tour='stats-grid']",
      title: "Core Risk Signals",
      description: "Survival probability, shift risk, and hazard rate tell you how healthy the current regime is and whether deterioration is already underway.",
    },
    {
      selector: "[data-tour='today-verdict']",
      title: "Today's Directive",
      description: "The decision engine synthesizes all signals into a single directive — Increase, Maintain, Trim, Defensive, or Risk-Off. Unlock Essential to see it.",
    },
    {
      selector: "[data-tour='upgrade-cta']",
      title: "Unlock the Full Stack",
      description: "Essential ($39/mo) unlocks exposure modeling, decision engine, survival curves, and alerts. Pro adds setup quality, trade plans, and behavioral tracking.",
    },
  ];

  useEffect(() => {
    const seen = localStorage.getItem("cp_tour_v2");
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!visible || step >= STEPS.length) return;
    const current = STEPS[step];
    const el = document.querySelector(current.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({ top: rect.top + window.scrollY, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom + window.scrollY });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step, visible]);

  const complete = () => {
    localStorage.setItem("cp_tour_v2", "1");
    setVisible(false);
    onComplete?.();
  };

  if (!visible || !targetRect || step >= STEPS.length) return null;

  const current = STEPS[step];
  const tooltipTop = Math.min(targetRect.bottom + 16, window.innerHeight - 200);
  const tooltipLeft = Math.max(16, Math.min(targetRect.left, (typeof window !== "undefined" ? window.innerWidth : 1200) - 310));

  return (
    <>
      {/* Dim overlay with cutout */}
      <div className="fixed inset-0 z-[90] pointer-events-none" style={{ backgroundColor: "rgba(0,0,0,0.65)" }}>
        {/* Highlight border around target */}
        <div
          className="absolute border-2 border-emerald-400/80 rounded-xl shadow-[0_0_0_4000px_rgba(0,0,0,0.65)]"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      </div>

      {/* Tooltip */}
      <div
        className="fixed z-[91] bg-zinc-950 border border-zinc-700 rounded-2xl p-5 shadow-2xl max-w-[280px] pointer-events-auto"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? "bg-emerald-400" : "bg-zinc-700"}`} />
            ))}
          </div>
          <button onClick={complete} className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">Skip</button>
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">{current.title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">{current.description}</p>
        <div className="flex gap-2 justify-end">
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="text-xs text-zinc-500 hover:text-white px-3 py-1.5 transition-colors">
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="bg-white text-black text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              Next →
            </button>
          ) : (
            <button onClick={complete} className="bg-emerald-500 text-black text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-emerald-400 transition-colors">
              Let's go →
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// DISCIPLINE STREAK CONFETTI
// ─────────────────────────────────────────────────────────
function StreakConfetti({ streak }) {
  const [show, setShow] = useState(false);
  const prevStreak = useRef(streak);

  useEffect(() => {
    if (streak > 0 && streak !== prevStreak.current && streak % 5 === 0) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 2500);
      prevStreak.current = streak;
      return () => clearTimeout(t);
    }
    prevStreak.current = streak;
  }, [streak]);

  if (!show) return null;

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const pieces = Array.from({ length: 24 });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" aria-hidden="true">
      {pieces.map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${5 + Math.random() * 90}%`,
            top: "-8px",
            backgroundColor: COLORS[i % COLORS.length],
            animation: `confettiFall ${0.8 + Math.random() * 1.2}s ease-in ${Math.random() * 0.6}s forwards`,
            transform: `rotate(${Math.random() * 180}deg)`,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-zinc-950/90 border border-emerald-700 rounded-xl px-6 py-3 text-center shadow-xl animate-[slideInFromBelow_0.4s_ease-out]">
          <div className="text-2xl mb-1">🎯</div>
          <div className="text-sm font-semibold text-emerald-400">{streak}-Session Streak!</div>
          <div className="text-xs text-zinc-400 mt-0.5">Elite discipline achieved</div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────
// TOKEN
// ─────────────────────────────────────────
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("cp_token") : null; }
function saveToken(t) { if (typeof window !== "undefined") localStorage.setItem("cp_token", t); }

// ─────────────────────────────────────────
// AUTHENTICATED FETCH HELPER
// ─────────────────────────────────────────
function authHeaders(token) {
  const h = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function apiFetch(path, token, opts = {}) {
  const url = path.startsWith("http") ? path : BACKEND + path;
  let res;
  try {
    res = await fetch(url, {
      ...opts,
      headers: {
        ...authHeaders(token),
        ...(opts.headers || {}),
      },
    });
  } catch (networkError) {
    console.error("Network error:", networkError);
    throw new Error("Network error — check your connection");
  }

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("cp_token");
      window.location.href = "/pricing?expired=true";
    }
    throw new Error("Session expired");
  }

  if (res.status === 403) {
    let detail = "Upgrade required";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {}
    const err = new Error(detail);
    err.status = 403;
    err.requiredTier = detail.includes("institutional") ? "institutional"
      : detail.includes("pro") ? "pro"
      : "essential";
    throw err;
  }

  if (res.status === 429) {
    throw new Error("Rate limited — please wait a moment");
  }

  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// ─────────────────────────────────────────
// COLOUR HELPERS
// ─────────────────────────────────────────
function regimeText(label) {
  if (!label) return "text-zinc-400";
  if (label === "Strong Risk-On") return "text-emerald-400";
  if (label === "Risk-On") return "text-green-400";
  if (label === "Strong Risk-Off") return "text-red-500";
  if (label === "Risk-Off") return "text-red-400";
  return "text-yellow-400";
}
function regimeBorder(label) {
  if (!label) return "border-white/5 bg-zinc-950/40";
  if (label === "Strong Risk-On") return "border-emerald-800 bg-emerald-900/20";
  if (label === "Risk-On") return "border-green-900 bg-green-900/10";
  if (label === "Strong Risk-Off") return "border-red-800 bg-red-900/30";
  if (label === "Risk-Off") return "border-red-900 bg-red-900/15";
  return "border-yellow-900 bg-yellow-900/10";
}
function fundingSignalColor(signal) {
  if (signal === "overleveraged_longs") return "text-red-400";
  if (signal === "overleveraged_shorts") return "text-emerald-400";
  return "text-yellow-400";
}
function fundingSignalBorder(signal) {
  if (signal === "overleveraged_longs") return "border-red-900 bg-red-950/30";
  if (signal === "overleveraged_shorts") return "border-emerald-900 bg-emerald-950/30";
  return "border-yellow-900 bg-yellow-950/30";
}

function riskColor(v) { return v > 70 ? "text-red-400" : v > 45 ? "text-yellow-400" : "text-green-400"; }
function exposureColor(v) { return v > 60 ? "text-emerald-400" : v > 35 ? "text-yellow-400" : "text-red-400"; }
function alignColor(v) { return v >= 80 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-red-400"; }
function dirBadge(d) {
  if (d === "bullish") return "text-green-400 border-green-900 bg-green-900/20";
  if (d === "bearish") return "text-red-400 border-red-900 bg-red-900/20";
  return "text-yellow-400 border-yellow-900 bg-yellow-900/20";
}
function confColor(v) { return v >= 75 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-red-400"; }
function gradeColor(g) {
  if (!g) return "text-zinc-400";
  if (g.startsWith("A")) return "text-emerald-400";
  if (g.startsWith("B")) return "text-green-400";
  if (g.startsWith("C")) return "text-yellow-400";
  return "text-red-400";
}
function damageColor(score) {
  if (score >= 70) return "text-red-400";
  if (score >= 50) return "text-orange-400";
  if (score >= 30) return "text-yellow-400";
  return "text-green-400";
}

// ─────────────────────────────────────────
// TIER HELPERS
// ─────────────────────────────────────────
const TIER_LEVELS = { free: 0, essential: 1, pro: 2, institutional: 3 };

function hasTier(userTier, requiredTier) {
  return (TIER_LEVELS[userTier] || 0) >= (TIER_LEVELS[requiredTier] || 0);
}

function tierName(tier) {
  if (tier === "essential") return "Essential";
  if (tier === "pro") return "Pro";
  if (tier === "institutional") return "Institutional";
  return "Free";
}

// ─────────────────────────────────────────
// PLAYBOOK DATA
// ─────────────────────────────────────────
const PLAYBOOKS = {
  "Strong Risk-On": {
    exposure_band: "65–80%", trend_follow_wr: 72, mean_revert_wr: 38,
    strategy_mode: "Aggressive Continuation", strategy_color: "text-emerald-400",
    avg_remaining_days: 14,
    actions: [
      "Favour trend continuation entries",
      "Pyramiding into strength is valid",
      "Tight stops — volatility is compressed",
      "Avoid fading moves — momentum is real",
      "Hold winners longer than feels comfortable",
    ],
    avoid: ["Shorting into strength", "Waiting for deep pullbacks", "Over-hedging"],
    context: "Strong risk-on regimes have the highest historical edge for trend-following strategies.",
  },
  "Risk-On": {
    exposure_band: "50–65%", trend_follow_wr: 63, mean_revert_wr: 44,
    strategy_mode: "Balanced Exposure", strategy_color: "text-green-400",
    avg_remaining_days: 9,
    actions: [
      "Favour pullback entries in trend direction",
      "Scale into positions over 2–3 entries",
      "Use wider stops — room to breathe",
      "Monitor breadth for continuation signal",
    ],
    avoid: ["Over-leveraging at breakouts", "Chasing extended moves"],
    context: "Standard risk-on environment. Edge exists but regime can reverse faster than strong phase.",
  },
  "Neutral": {
    exposure_band: "25–45%", trend_follow_wr: 49, mean_revert_wr: 51,
    strategy_mode: "Capital Preservation", strategy_color: "text-yellow-400",
    avg_remaining_days: 6,
    actions: [
      "Reduce overall exposure",
      "Range-bound strategies have slight edge",
      "Wait for regime confirmation before sizing up",
      "Preserve capital — this is a transition zone",
    ],
    avoid: ["Strong directional bias", "Large position sizes", "Ignoring stop levels"],
    context: "Neutral regimes are transition zones. Historical edge is near zero for directional strategies.",
  },
  "Risk-Off": {
    exposure_band: "10–25%", trend_follow_wr: 31, mean_revert_wr: 57,
    strategy_mode: "Risk Reduction Protocol", strategy_color: "text-red-400",
    avg_remaining_days: 7,
    actions: [
      "Reduce long exposure significantly",
      "Hold cash — optionality has value",
      "Short-term mean reversion possible",
      "Watch for breadth stabilisation signal",
    ],
    avoid: ["Buying dips aggressively", "Adding to losing longs", "Ignoring deterioration signals"],
    context: "Risk-off regimes strongly favour capital preservation. Trend-following edge is negative.",
  },
  "Strong Risk-Off": {
    exposure_band: "0–10%", trend_follow_wr: 22, mean_revert_wr: 48,
    strategy_mode: "Capital Preservation Phase", strategy_color: "text-red-500",
    avg_remaining_days: 11,
    actions: [
      "Move to maximum cash allocation",
      "Only trade with pre-defined R/R setups",
      "Short positions for advanced traders only",
      "Monitor for capitulation signals",
    ],
    avoid: ["Catching falling knives", "Any leveraged long exposure", "Averaging down"],
    context: "Strong risk-off has the highest historical drawdown for buy-and-hold. Cash outperforms.",
  },
};

// ─────────────────────────────────────────
// ARCHETYPE CONFIG (complete — replaces ARCHETYPES for selector)
// ─────────────────────────────────────────
const ARCHETYPE_CONFIG = {
  swing:          { label: "Swing Trader",       description: "Holds positions for days to weeks." },
  position:       { label: "Position Trader",    description: "Longer-term conviction trades. Macro regime driven." },
  spot_allocator: { label: "Spot Allocator",     description: "DCA-oriented. Uses regime data for timing." },
  tactical:       { label: "Tactical De-risker", description: "Active risk management. Quick exposure adjustments." },
  leverage:       { label: "Leverage Trader",    description: "Uses leverage. Tightest risk controls needed." },
};

// Keep ARCHETYPES as alias so existing ArchetypeOverlayPanel still works
const ARCHETYPES = ARCHETYPE_CONFIG;

const BACKTEST_STRATEGIES = [
  { key: "follow_model", label: "Follow Model" },
  { key: "buy_and_hold", label: "Buy & Hold" },
  { key: "risk_off_only", label: "Risk-Off Only" },
  { key: "momentum", label: "Momentum" },
  { key: "inverse", label: "Inverse" },
];
const BACKTEST_DAYS = [7, 30, 90, 180, 365];
const REGIME_CHART_COLORS = {
  "Strong Risk-On": "#10b981",
  "Risk-On": "#4ade80",
  "Neutral": "#facc15",
  "Risk-Off": "#f87171",
  "Strong Risk-Off": "#ef4444",
};

// ─────────────────────────────────────────
// CardShell
// ─────────────────────────────────────────
function CardShell({ children, label }) {
  return (
    <div
      role="region"
      aria-label={label}
      className="rounded-2xl border border-zinc-800/60 p-6 space-y-4"
      style={{ backgroundColor: "#111113" }}
    >
      {children}
    </div>
  );
}



// ─────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────
function Bar({ value = 0, cls = "bg-white" }) {
  return (
    <div className="w-full bg-white/4 rounded-full h-[3px] mt-2">
      <div
        className={`h-[3px] rounded-full transition-all duration-700 ${cls}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function Label({ children }) {
  return (
    <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.25em] mb-2">
      {children}
    </div>
  );
}

function Lock() {
  return (
    <svg className="w-3 h-3 inline mr-1 opacity-40" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  );
}

// ─────────────────────────────────────────
// PRO GATE
// ─────────────────────────────────────────
function ProGate({ label, consequence, children, onUnlock, requiredTier }) {
  const tierLabel = requiredTier === "institutional" ? "Institutional"
    : requiredTier === "pro" ? "Pro"
    : "Essential";
  const tierPrice = requiredTier === "institutional" ? "$149"
    : requiredTier === "pro" ? "$79"
    : "$39";

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] p-8 space-y-4 relative min-h-[160px]">
      <Label>{label}</Label>
      <div className="blur-sm select-none pointer-events-none opacity-30 max-h-32 overflow-hidden">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10 rounded-2xl overflow-hidden">
        <div className="bg-zinc-950/98 border border-white/10 px-8 py-6 text-center space-y-3 w-full mx-4 rounded-xl shadow-2xl shadow-black/50 backdrop-blur-sm">
          <div className="text-sm font-semibold text-white flex items-center justify-center gap-1.5">
            <Lock />{label}
          </div>
          {consequence && (
            <div className="text-xs text-zinc-500 leading-relaxed">{consequence}</div>
          )}
          <button
  onClick={onUnlock}
  className={`w-full px-5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:-translate-y-[1px] shadow-lg ${
    requiredTier === "institutional"
      ? "bg-purple-600 text-white hover:bg-purple-500"
      : requiredTier === "pro"
      ? "bg-emerald-600 text-white hover:bg-emerald-500"
      : "bg-blue-600 text-white hover:bg-blue-500"
  }`}
>
  {"Unlock — " + tierLabel + " " + tierPrice + "/month"}
</button>

          <div className="text-xs text-zinc-700">7-day risk-free · Cancel anytime</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────
function StatCard({ label, value, suffix = "%", color, barCls, hint, locked, consequence, onUnlock, requiredTier }) {
  if (locked)
    return (
      <div
        className="rounded-lg p-5 space-y-2 relative overflow-hidden cursor-pointer border border-zinc-800/40"
        style={{ backgroundColor: "#111113" }}
        onClick={onUnlock}
      >
        <Label>{label}</Label>
        <div className="text-3xl font-semibold tabular-nums text-zinc-800 select-none" style={{ filter: "blur(6px)" }}>
          {["73.2", "41.8", "28.4", "67.1", "89", "−21.7"][Math.abs(label.length) % 6]}
        </div>
        <div className="w-full bg-zinc-900 rounded-full h-[3px] mt-2">
          <div className="h-[3px] rounded-full bg-zinc-800" style={{ width: "62%" }} />
        </div>
        {hint && <div className="text-xs text-zinc-800 select-none" style={{ filter: "blur(4px)" }}>{hint}</div>}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-lg" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
          <div className="text-center space-y-1">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Essential</div>
            <div className="text-xs text-white font-medium">$39/month</div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-2">
      <Label>{label}</Label>
      <div className={`text-3xl font-semibold tabular-nums ${color}`}>
        {value}{suffix}
      </div>
      {barCls && <Bar value={parseFloat(value) || 0} cls={barCls} />}
      {hint && <div className="text-xs text-zinc-600 pt-1">{hint}</div>}
    </div>
  );
}

// ─────────────────────────────────────────
// SESSION EXPIRY WARNING
// ─────────────────────────────────────────
function SessionExpiryWarning({ tokenCreatedAt }) {
  const [daysRemaining, setDaysRemaining] = useState(null);

  useEffect(() => {
    if (!tokenCreatedAt) return;
    const created = new Date(tokenCreatedAt);
    const expiresAt = new Date(created.getTime() + 90 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const remaining = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
    setDaysRemaining(remaining);
  }, [tokenCreatedAt]);

  if (daysRemaining === null || daysRemaining > 14) return null;

  return (
    <div className="border border-yellow-900 bg-yellow-950/60 px-6 py-4 rounded-2xl">
      <div className="text-sm text-yellow-200 flex items-center justify-between">
        <span>⚠ Your session expires in <strong>{daysRemaining} days</strong>.</span>
        <a
          href="/pricing?restore=true"
          className="text-yellow-400 hover:text-yellow-300 underline text-xs ml-4"
        >
          Refresh access
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TODAY'S VERDICT
// ─────────────────────────────────────────
function TodaysVerdict({ stack, decision, isPro, onUnlock, requiredTier }) {
  const shiftRisk = stack?.shift_risk ?? 0;
  const exposure = stack?.exposure ?? 0;

  const verdictStyle = () => {
    if (!isPro) return { border: "border-zinc-700", bg: "bg-zinc-950/50", text: "text-gray-300", dot: "bg-gray-500" };
    if (decision?.action === "aggressive") return { border: "border-emerald-800", bg: "bg-emerald-950/60", text: "text-emerald-300", dot: "bg-emerald-400" };
    if (decision?.action === "hold") return { border: "border-green-800", bg: "bg-green-950/60", text: "text-green-300", dot: "bg-green-400" };
    if (decision?.action === "trim") return { border: "border-yellow-800", bg: "bg-yellow-950/60", text: "text-yellow-300", dot: "bg-yellow-400" };
    if (decision?.action === "defensive") return { border: "border-orange-800", bg: "bg-orange-950/60", text: "text-orange-300", dot: "bg-orange-400" };
    return { border: "border-red-800", bg: "bg-red-950/60", text: "text-red-300", dot: "bg-red-400" };
  };

  const s = verdictStyle();

  return (
    <div className={`border ${s.border} ${s.bg} px-6 py-5 rounded-2xl`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${s.dot} animate-pulse shrink-0`} />
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-widest mb-0.5">
              Today's Regime Verdict — {stack?.coin ?? "BTC"}
            </div>
            {isPro && decision ? (
              <div className={`text-lg font-semibold ${s.text}`}>
                {decision.directive}
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-400 flex items-center gap-2">
                <Lock />
                <span>Unlock to see today's directive</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {isPro && decision ? (
            <>
              <div className="text-center">
                <div className="text-xs text-zinc-500">Decision Score</div>
                <div className={`text-xl font-bold ${s.text}`}>{decision.score}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500">Exposure</div>
                <div className={`text-xl font-bold ${exposureColor(exposure)}`}>{exposure}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500">Shift Risk</div>
                <div className={`text-xl font-bold ${riskColor(shiftRisk)}`}>{shiftRisk}%</div>
              </div>
            </>
          ) : (
            <button
  onClick={onUnlock}
  className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 whitespace-nowrap"
>
  Unlock Essential — $39/mo
</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// FREE TIER BANNER
// ─────────────────────────────────────────
function FreeTierBanner({ onUnlock }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-zinc-700/60 bg-gradient-to-r from-zinc-900/80 to-zinc-950/80 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">You're on the Free tier</div>
            <div className="text-xs text-zinc-400 mt-0.5">
              Regime labels and direction are live.{" "}
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
              >
                {expanded ? "Show less" : "See what you're missing"}
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={onUnlock}
          className="bg-white text-black text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-all hover:-translate-y-[1px] hover:shadow-lg shrink-0"
        >
          Start Free Trial
        </button>
      </div>

      {expanded && (
        <div className="px-6 pb-5 border-t border-zinc-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              { icon: "📊", label: "Exposure %",     desc: "Exact allocation for this regime",     tier: "Essential" },
              { icon: "⚡", label: "Shift Risk",      desc: "Deterioration probability in %",       tier: "Essential" },
              { icon: "🎯", label: "Daily Directive", desc: "Increase / Trim / Defensive signal",   tier: "Essential" },
              { icon: "📈", label: "Survival Curve",  desc: "How long this regime typically lasts", tier: "Essential" },
              { icon: "🔬", label: "Setup Quality",   desc: "Is now a good entry point?",           tier: "Pro" },
              { icon: "🤖", label: "AI Narrative",    desc: "3-paragraph regime explanation",       tier: "Pro" },
              { icon: "📉", label: "Backtesting",     desc: "Historical strategy performance",      tier: "Pro" },
              { icon: "🛡️", label: "Trade Plans",     desc: "Entry zones, stops, tranches",         tier: "Pro" },
            ].map(({ icon, label, desc, tier }) => (
              <div
                key={label}
                onClick={onUnlock}
                className="bg-white/2 border border-white/5 rounded-xl p-3 space-y-1 cursor-pointer hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">{icon}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${
                    tier === "Pro"
                      ? "border-emerald-800 text-emerald-500 bg-emerald-950/40"
                      : "border-blue-800 text-blue-400 bg-blue-950/40"
                  }`}>{tier}</span>
                </div>
                <div className="text-xs font-medium text-white">{label}</div>
                <div className="text-[10px] text-zinc-600 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-zinc-600">7-day free trial · No credit card required · Cancel anytime</div>
            <button onClick={onUnlock} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
              View all features →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────
// SHIFT RISK ALERT
// ─────────────────────────────────────────
function ShiftRiskAlert({ shiftRisk, coin, isPro }) {
  if (!isPro) return null;
  if (shiftRisk <= 60) return null;

  const severity = shiftRisk > 80 ? "critical" : shiftRisk > 70 ? "elevated" : "moderate";
  const style =
    severity === "critical" ? "border-red-600 bg-red-950 text-red-200" :
    severity === "elevated" ? "border-red-800 bg-red-950 text-red-300" :
    "border-orange-800 bg-orange-950 text-orange-300";

  return (
    <div className={`border ${style} px-6 py-5 rounded-2xl space-y-1`}>
      <div className="font-semibold text-sm flex items-center gap-2">
        <span>⚠</span>
        <span>
          {severity === "critical" ? "Critical" : severity === "elevated" ? "Elevated" : "Moderate"}{" "}
          Regime Deterioration — {coin}
        </span>
        <span className="ml-auto text-lg font-bold">{shiftRisk}%</span>
      </div>
      <div className="text-xs opacity-70">
        {severity === "critical"
          ? "Multiple deterioration signals active. Immediate exposure reduction recommended."
          : severity === "elevated"
          ? "Shift risk elevated. Consider reducing exposure and tightening stops."
          : "Early deterioration detected. Monitor closely before adding new positions."}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// STALE DATA BANNER
// ─────────────────────────────────────────
function StaleDataBanner({ isStale, dataTimestamp }) {
  if (!isStale) return null;

  const minutesAgo = dataTimestamp
    ? Math.floor((Date.now() - new Date(dataTimestamp).getTime()) / 60000)
    : null;

  return (
    <div className="border border-orange-900 bg-orange-950/60 px-6 py-4 rounded-2xl flex items-center gap-3">
      <span className="text-orange-400 text-lg">⚠️</span>
      <div>
        <div className="text-sm text-orange-200 font-medium">Live data temporarily unavailable</div>
        <div className="text-xs text-orange-300/60">
          {minutesAgo !== null
            ? `Showing cached data from ${minutesAgo} minutes ago.`
            : "Showing cached data."
          }
          {" "}Market data source may be experiencing issues.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// REGIME QUALITY CARD
// ─────────────────────────────────────────
function deriveQuality(stack) {
  if (!stack) return null;
  const alignment = stack.alignment ?? 0;
  const survival = stack.survival ?? 50;
  const hazard = stack.hazard ?? 50;
  const shiftRisk = stack.shift_risk ?? 50;
  const coherence = stack.macro?.coherence ?? 50;
  const score = Math.round(
    alignment * 0.30 +
    survival * 0.25 +
    (100 - hazard) * 0.20 +
    (100 - shiftRisk) * 0.15 +
    coherence * 0.10
  );
  let grade, structural, breakdown;
  if (score >= 80) { grade = "A"; structural = "Excellent"; breakdown = "Low"; }
  else if (score >= 65) { grade = "B+"; structural = "Strong"; breakdown = "Low-Moderate"; }
  else if (score >= 50) { grade = "B"; structural = "Healthy"; breakdown = "Moderate"; }
  else if (score >= 35) { grade = "C"; structural = "Weakening"; breakdown = "Elevated"; }
  else { grade = "D"; structural = "Fragile"; breakdown = "High"; }
  return { grade, score, structural, breakdown };
}

function RegimeQualityCard({ stack, isPro, onUnlock, requiredTier }) {
  const quality = deriveQuality(stack);
  if (!quality) return null;

  const inner = (
    <div className="grid grid-cols-3 gap-6">
      <div className="text-center space-y-2">
        <div className="text-xs text-zinc-400 uppercase tracking-widest">Regime Grade</div>
        <div className={`text-6xl font-bold ${gradeColor(quality.grade)}`}>{quality.grade}</div>
        <Bar
          value={quality.score}
          cls={
            quality.score >= 80 ? "bg-emerald-500" :
            quality.score >= 65 ? "bg-green-500" :
            quality.score >= 50 ? "bg-yellow-500" :
            quality.score >= 35 ? "bg-orange-500" : "bg-red-500"
          }
        />
        <div className="text-xs text-zinc-500">{quality.score}/100</div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs text-zinc-400">Structural Health</div>
          <div className={`text-xl font-semibold mt-1 ${
            ["Excellent","Strong"].includes(quality.structural) ? "text-emerald-400" :
            quality.structural === "Healthy" ? "text-green-400" :
            quality.structural === "Weakening" ? "text-yellow-400" : "text-red-400"
          }`}>
            {quality.structural}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Breakdown Risk</div>
          <div className={`text-xl font-semibold mt-1 ${
            quality.breakdown === "Low" ? "text-emerald-400" :
            quality.breakdown === "Low-Moderate" ? "text-green-400" :
            quality.breakdown === "Moderate" ? "text-yellow-400" :
            quality.breakdown === "Elevated" ? "text-orange-400" : "text-red-400"
          }`}>
            {quality.breakdown}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { l: "Alignment", v: stack.alignment ?? 0 },
          { l: "Survival", v: stack.survival ?? 0 },
          { l: "Hazard", v: stack.hazard ?? 0, inv: true },
          { l: "Shift Risk", v: stack.shift_risk ?? 0, inv: true },
        ].map(({ l, v, inv }) => (
          <div key={l} className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 w-20 shrink-0">{l}</span>
            <div className="flex-1 bg-zinc-800 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  (inv ? 100 - v : v) >= 70 ? "bg-emerald-500" :
                  (inv ? 100 - v : v) >= 50 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${v}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">{v}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (!isPro)
    return (
      <ProGate
  label="Regime Quality Rating"
  consequence="Without quality scoring, you cannot distinguish a strong regime from a fragile one."
  onUnlock={onUnlock}
  requiredTier={requiredTier || "essential"}
>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Regime Quality Rating</Label>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// HISTORICAL ANALOGS PANEL
// ─────────────────────────────────────────
const HistoricalAnalogsPanel = memo(function HistoricalAnalogsPanel({ coin, token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const isVisible = useLazyPanel(containerRef);

  useEffect(() => {
    if (!isPro || !coin || !isVisible) return;
    setLoading(true);
    apiFetch(`/historical-analogs?coin=${coin}`, token)
      .then((d) => { if (!d.error) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [coin, isPro, token, isVisible]);

  const inner = data ? (
    <div className="space-y-6">
      {!data.data_sufficient && (
        <div className="border border-yellow-900 bg-yellow-950 px-4 py-3 text-yellow-300 text-sm rounded-lg">{data.message}</div>
      )}

      {data.data_sufficient && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { l: "Sample Size",      v: data.sample_size,                          s: ""  },
              { l: "Avg Continuation", v: `${data.continuation?.avg_hours?.toFixed(1)}h`, s: "" },
              { l: "Max Continuation", v: `${data.continuation?.max_hours}h`,        s: ""  },
              { l: "24h Cont. Prob",   v: data.continuation?.prob_24h_pct,           s: "%", c: data.continuation?.prob_24h_pct > 60 ? "text-emerald-400" : "text-yellow-400" },
              { l: "72h Cont. Prob",   v: data.continuation?.prob_72h_pct,           s: "%", c: data.continuation?.prob_72h_pct > 40 ? "text-emerald-400" : "text-yellow-400" },
            ].map(({ l, v, s, c }) => (
              <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-3 space-y-1">
                <div className="text-xs text-zinc-400">{l}</div>
                <div className={`text-xl font-semibold ${c || "text-white"}`}>{v}{s}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">Forward Return Distribution</div>
            <div className="grid grid-cols-3 gap-4">
              {["1d", "3d", "7d"].map((horizon) => {
                const fr = data.forward_returns?.[horizon];
                if (!fr) return null;
                return (
                  <div key={horizon} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
                    <div className="text-sm font-semibold text-white">{horizon.toUpperCase()} Forward</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-zinc-500">Avg: </span><span className={fr.avg >= 0 ? "text-emerald-400" : "text-red-400"}>{fr.avg > 0 ? "+" : ""}{fr.avg}%</span></div>
                      <div><span className="text-zinc-500">Median: </span><span className="text-white">{fr.median}%</span></div>
                      <div><span className="text-zinc-500">Best: </span><span className="text-emerald-400">+{fr.best}%</span></div>
                      <div><span className="text-zinc-500">Worst: </span><span className="text-red-400">{fr.worst}%</span></div>
                    </div>
                    <div className="text-xs text-zinc-500">Positive: {fr.positive_pct}%</div>
                    <Bar value={fr.positive_pct} cls={fr.positive_pct > 60 ? "bg-emerald-500" : fr.positive_pct > 45 ? "bg-yellow-500" : "bg-red-500"} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Max Adverse Excursion</div>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-zinc-500">Average MAE</div><div className="text-xl font-semibold text-red-400">{data.max_adverse_excursion?.avg_pct}%</div></div>
                <div><div className="text-xs text-zinc-500">Worst MAE</div><div className="text-xl font-semibold text-red-400">{data.max_adverse_excursion?.worst_pct}%</div></div>
              </div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Drawdown Probability</div>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-zinc-500">&gt;3% Drawdown</div><div className="text-xl font-semibold text-orange-400">{data.max_adverse_excursion?.drawdown_gt_3pct_prob}%</div></div>
                <div><div className="text-xs text-zinc-500">&gt;5% Drawdown</div><div className="text-xl font-semibold text-red-400">{data.max_adverse_excursion?.drawdown_gt_5pct_prob}%</div></div>
              </div>
            </div>
          </div>

          {data.matching_periods?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Recent Matching Periods (top 5)</div>
              <div className="space-y-1">
                {data.matching_periods.slice(0, 5).map((mp, i) => (
                  <div key={i} className="flex items-center justify-between border border-white/5 px-4 py-2 text-xs rounded-lg">
                    <span className="text-zinc-400">{mp.date}</span>
                    <span className={regimeText(mp.label)}>{mp.label}</span>
                    <span className="text-white">Score: {mp.score?.toFixed(1)}</span>
                    <span className="text-zinc-500">Continued: {mp.continuation_hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  ) : loading ? (
    <div className="text-sm text-zinc-400">Searching historical analogs...</div>
  ) : (
    <div className="text-sm text-zinc-400">No analog data available</div>
  );

  if (!isPro)
    return (
      <div ref={containerRef}>
        <ProGate label="Historical Analogs" consequence="Without historical analogs, you have no statistical context for current regime conditions." onUnlock={onUnlock} requiredTier={requiredTier || "pro"}>
          {inner}
        </ProGate>
      </div>
    );

  return (
    <div ref={containerRef}>
      <CardShell>
        <Label>Historical Analogs</Label>
        <p className="text-xs text-zinc-400 mb-4">Forward return statistics from similar historical regime conditions</p>
        {inner}
      </CardShell>
    </div>
  );
});

// ─────────────────────────────────────────
// REGIME PLAYBOOK ENGINE
// ─────────────────────────────────────────
function RegimePlaybook({ stack, isPro, onUnlock, requiredTier }) {
  const execLabel = stack?.execution?.label ?? "Neutral";
  const pb = PLAYBOOKS[execLabel] || PLAYBOOKS["Neutral"];
  const regimeAge = stack?.regime_age_hours ?? 0;
  const remaining = Math.max(0, pb.avg_remaining_days * 24 - regimeAge);

  const inner = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className={`text-2xl font-semibold ${regimeText(execLabel)}`}>{execLabel}</div>
          <div className="text-xs text-zinc-400 mt-1">{regimeAge.toFixed(1)}h active</div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { l: "Strategy Mode", v: pb.strategy_mode, c: pb.strategy_color },
            { l: "Exposure Band", v: pb.exposure_band, c: "text-white" },
            { l: "Est. Remaining", v: remaining < 24 ? `~${remaining.toFixed(0)}h` : `~${(remaining / 24).toFixed(1)}d`, c: "text-white" },
          ].map(({ l, v, c }) => (
            <div key={l} className="border border-white/5 px-4 py-2 text-center space-y-0.5 rounded-lg">
              <div className="text-xs text-zinc-400">{l}</div>
              <div className={`text-sm font-semibold ${c}`}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { l: "Trend-Following Win Rate", v: pb.trend_follow_wr },
          { l: "Mean Reversion Win Rate", v: pb.mean_revert_wr },
        ].map(({ l, v }) => (
          <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-3">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">{l}</div>
            <div className={`text-3xl font-semibold ${v >= 60 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-red-400"}`}>{v}%</div>
            <Bar value={v} cls={v >= 60 ? "bg-emerald-500" : v >= 50 ? "bg-yellow-500" : "bg-red-500"} />
            <div className="text-xs text-zinc-500">Historical in {execLabel} regimes</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Regime Protocol</div>
          <ul className="space-y-2">
            {pb.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-emerald-400 mt-0.5 shrink-0">→</span>{a}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Avoid in This Regime</div>
          <ul className="space-y-2">
            {pb.avoid.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-red-400 mt-0.5 shrink-0">✕</span>{a}
              </li>
            ))}
          </ul>
          <div className="border border-white/5 p-3 mt-3 rounded-lg">
            <div className="text-xs text-zinc-500">{pb.context}</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Regime Playbook Engine" consequence="Without a playbook, you are applying the same strategy regardless of regime conditions." onUnlock={onUnlock}requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Regime Playbook Engine</Label>
      <p className="text-xs text-zinc-400 mb-4">Actionable protocol based on current regime and historical edge</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// PERSONALIZED EXPOSURE TRACKER
// ─────────────────────────────────────────
function ExposureTracker({ stack, isPro, onUnlock, requiredTier }) {
  const [portfolioSize, setPortfolioSize] = useState(10000);
  const [currentExposure, setCurrentExposure] = useState(50);
  const [leverage, setLeverage] = useState(1);
  const [strategyType, setStrategyType] = useState("swing");
  const [result, setResult] = useState(null);

  const analyse = () => {
    if (!stack) return;
    const execLabel = stack.execution?.label ?? "Neutral";
    const pb = PLAYBOOKS[execLabel] || PLAYBOOKS["Neutral"];
    const alignment = stack.alignment ?? 50;
    const shiftRisk = stack.shift_risk ?? 50;
    const [minBand, maxBand] = pb.exposure_band.replace(/%/g, "").split("–").map(Number);
    const optimalMid = (minBand + maxBand) / 2;
    const effectiveExp = currentExposure * leverage;
    const delta = effectiveExp - optimalMid;
    const baseR =
      execLabel === "Strong Risk-On" ? 1.2 :
      execLabel === "Risk-On" ? 0.9 :
      execLabel === "Neutral" ? 0.2 :
      execLabel === "Risk-Off" ? -0.3 : -0.8;
    const expectancy = (baseR + (alignment / 100) * 0.4 + ((100 - shiftRisk) / 100) * 0.2).toFixed(2);

    setResult({
      optimalMid, minBand, maxBand,
      effectiveExp: effectiveExp.toFixed(1),
      delta: Math.abs(delta).toFixed(1),
      isOver: delta > 0,
      overBand: effectiveExp > maxBand,
      expectancy,
      deployedCapital: ((currentExposure / 100) * portfolioSize).toLocaleString(),
      optimalCapital: ((optimalMid / 100) * portfolioSize).toLocaleString(),
      regimeLabel: execLabel,
    });
  };

  const inner = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "Portfolio Size (USD)", val: portfolioSize, set: setPortfolioSize, type: "number", min: 100 },
          { l: "Current Exposure %", val: currentExposure, set: setCurrentExposure, type: "number", min: 0, max: 200 },
          { l: "Leverage (1x = spot)", val: leverage, set: setLeverage, type: "number", min: 1, max: 20, step: 0.5 },
        ].map(({ l, val, set, ...rest }) => (
          <div key={l} className="space-y-2">
            <div className="text-xs text-zinc-400">{l}</div>
            <input
              value={val}
              onChange={(e) => set(Number(e.target.value))}
              {...rest}
              className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
            />
          </div>
        ))}
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Strategy Type</div>
          <select
            value={strategyType}
            onChange={(e) => setStrategyType(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          >
            <option value="swing">Swing</option>
            <option value="trend">Trend Following</option>
            <option value="scalp">Scalp</option>
            <option value="dca">DCA</option>
          </select>
        </div>
      </div>

      <button
        onClick={analyse}
        className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100"
      >
        Analyse My Exposure
      </button>

      {result && (
        <div className="space-y-4">
          <div className={`border px-5 py-4 space-y-1 rounded-lg ${
            result.overBand ? "border-red-900 bg-red-950 text-red-300" :
            result.isOver ? "border-yellow-900 bg-yellow-950 text-yellow-300" :
            "border-emerald-900 bg-emerald-950 text-emerald-300"
          }`}>
            <div className="font-semibold text-sm">
              {result.overBand
                ? `⚠ Exposure ${result.delta}% above regime tolerance`
                : result.isOver
                ? `⚡ ${result.delta}% above optimal mid-point`
                : `✓ ${result.delta}% below optimal — capacity to add`}
            </div>
            <div className="text-xs opacity-70">
              Effective exposure: {result.effectiveExp}% · Optimal band: {result.minBand}–{result.maxBand}% · Regime: {result.regimeLabel}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l: "Deployed Capital", v: `
$$
{result.deployedCapital}`, c: exposureColor(currentExposure) },
              { l: "Optimal Capital", v: `
$$
{result.optimalCapital}`, c: "text-blue-400" },
              { l: "R Expectancy", v: `${result.expectancy}R`, c: Number(result.expectancy) >= 0.5 ? "text-emerald-400" : Number(result.expectancy) >= 0 ? "text-yellow-400" : "text-red-400" },
              { l: "Regime Tolerance", v: `${result.minBand}–${result.maxBand}%`, c: "text-gray-300" },
            ].map(({ l, v, c }) => (
              <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
                <div className="text-xs text-zinc-400">{l}</div>
                <div className={`text-xl font-semibold ${c}`}>{v}</div>
              </div>
            ))}
          </div>

          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
            <div className="text-xs text-zinc-400">Exposure vs Regime Band</div>
            <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-emerald-900/40"
                style={{ left: `${result.minBand}%`, width: `${result.maxBand - result.minBand}%` }}
              />
              <div
                className={`absolute h-full w-1 ${
                  result.overBand ? "bg-red-400" : result.isOver ? "bg-yellow-400" : "bg-emerald-400"
                }`}
                style={{ left: `${Math.min(99, Number(result.effectiveExp))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>0%</span>
              <span className="text-emerald-600">▲ Optimal {result.minBand}–{result.maxBand}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Exposure Calibration Engine" consequence="Without exposure calibration, you cannot know if your position size is regime-appropriate." onUnlock={onUnlock}requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Exposure Calibration Engine</Label>
      <p className="text-xs text-zinc-400 mb-4">Compare your current position size against regime-optimal allocation</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// REGIME STRESS METER
// ─────────────────────────────────────────
function StressMeter({ stack, isPro, onUnlock, requiredTier }) {
  if (!stack) return null;
  const hazard = stack.hazard ?? 0;
  const shiftRisk = stack.shift_risk ?? 0;
  const alignment = stack.alignment ?? 100;
  const survival = stack.survival ?? 100;

  const stress = Math.round(
    hazard * 0.30 + shiftRisk * 0.35 + (100 - alignment) * 0.20 + (100 - survival) * 0.15
  );

  const stressLabel = stress >= 80 ? "Critical" : stress >= 60 ? "Elevated" : stress >= 40 ? "Moderate" : stress >= 20 ? "Low" : "Minimal";
  const stressColor = stress >= 80 ? "text-red-400" : stress >= 60 ? "text-orange-400" : stress >= 40 ? "text-yellow-400" : stress >= 20 ? "text-green-400" : "text-emerald-400";
  const arcColor = stress >= 80 ? "#f87171" : stress >= 60 ? "#fb923c" : stress >= 40 ? "#facc15" : stress >= 20 ? "#4ade80" : "#34d399";

  const inner = (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
        <ResponsiveContainer width={192} height={192}>
          <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" startAngle={225} endAngle={-45} data={[{ value: 100, fill: "#27272a" }, { value: stress, fill: arcColor }]} barSize={14}>
            <RadialBar dataKey="value" cornerRadius={6} background={false} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-4xl font-bold ${stressColor}`}>{stress}</div>
          <div className={`text-xs font-medium ${stressColor}`}>{stressLabel}</div>
        </div>
      </div>

      <div className="flex-1 space-y-4 w-full">
        <div className="text-sm text-gray-400">Composite stress from hazard rate, shift risk, alignment breakdown, and survival decay.</div>
        <div className="space-y-3">
          {[
            { l: "Hazard Rate", v: hazard, w: "30%" },
            { l: "Shift Risk", v: shiftRisk, w: "35%" },
            { l: "Alignment Breakdown", v: 100 - alignment, w: "20%" },
            { l: "Survival Decay", v: 100 - survival, w: "15%" },
          ].map(({ l, v, w }) => (
            <div key={l} className="flex items-center gap-3">
              <div className="text-xs text-zinc-500 w-36 shrink-0">{l}</div>
              <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${v >= 70 ? "bg-red-500" : v >= 45 ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${Math.round(v)}%` }}
                />
              </div>
              <div className="text-xs text-zinc-400 w-8 text-right">{Math.round(v)}%</div>
              <div className="text-xs text-gray-700 w-8">{w}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Regime Stress Meter" consequence="Stress meter identifies regime breakdown before it appears in price." onUnlock={onUnlock}requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Regime Stress Meter</Label>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// REGIME COUNTDOWN
// ─────────────────────────────────────────
function RegimeCountdown({ stack, isPro, onUnlock, requiredTier }) {
  if (!stack) return null;
  const execLabel = stack.execution?.label ?? "Neutral";
  const pb = PLAYBOOKS[execLabel] || PLAYBOOKS["Neutral"];
  const regimeAge = stack.regime_age_hours ?? 0;
  const avgTotal = pb.avg_remaining_days * 24;
  const remaining = Math.max(0, avgTotal - regimeAge);
  const pct = Math.min(100, (regimeAge / avgTotal) * 100);

  const urgency = remaining < 12 ? "text-red-400" : remaining < 48 ? "text-yellow-400" : "text-emerald-400";

  const inner = (
    <div className="grid md:grid-cols-3 gap-6 items-center">
      <div className="space-y-3">
        <div className={`text-4xl font-bold ${urgency}`}>
          {remaining < 24 ? `~${remaining.toFixed(0)}h` : `~${(remaining / 24).toFixed(1)}d`}
        </div>
        <div className="text-xs text-zinc-400">Est. remaining in current regime</div>
        <Bar value={pct} cls={pct >= 85 ? "bg-red-500" : pct >= 65 ? "bg-orange-500" : pct >= 40 ? "bg-yellow-500" : "bg-emerald-500"} />
        <div className="text-xs text-zinc-500">{regimeAge.toFixed(1)}h elapsed / {avgTotal}h avg total</div>
      </div>

      <div className="md:col-span-2 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: "Current Regime", v: execLabel, c: regimeText(execLabel) },
            { l: "Avg Duration", v: `${pb.avg_remaining_days}d`, c: "text-gray-300" },
            { l: "Age", v: `${regimeAge.toFixed(1)}h`, c: "text-gray-300" },
          ].map(({ l, v, c }) => (
            <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-3 space-y-1">
              <div className="text-xs text-zinc-400">{l}</div>
              <div className={`text-sm font-semibold ${c}`}>{v}</div>
            </div>
          ))}
        </div>
        {remaining < 24 && (
          <div className="border border-red-900 bg-red-950 px-4 py-3 text-red-300 text-sm rounded-lg">
            ⚠ Regime statistically overdue for transition. Monitor closely.
          </div>
        )}
        {remaining >= 24 && remaining < 48 && (
          <div className="border border-yellow-900 bg-yellow-950 px-4 py-3 text-yellow-300 text-sm rounded-lg">
            ⚡ Entering late phase — reduce new entries, tighten stops.
          </div>
        )}
      </div>
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Regime Countdown Timer" consequence="Without regime duration modeling, you cannot anticipate transition windows." onUnlock={onUnlock}requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Regime Countdown Timer</Label>
      <p className="text-xs text-zinc-400">Statistical estimate based on historical regime durations</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// CONFIDENCE TREND
// ─────────────────────────────────────────
function ConfidenceTrend({ history, confidence, isPro, onUnlock, requiredTier }) {
  const baseConf = confidence?.score ?? 60;
  const trendData = history.slice(-24).map((h, i) => ({
    hour: h.hour,
    conf: Math.min(100, Math.max(0, Math.round(baseConf + Math.sin(i * 0.8) * 8 + (h.score / 100) * 15))),
  }));
  const latest = trendData[trendData.length - 1]?.conf ?? baseConf;
  const earliest = trendData[0]?.conf ?? baseConf;
  const delta = latest - earliest;
  const trending = delta > 3 ? "↑ Rising" : delta < -3 ? "↓ Falling" : "→ Stable";
  const tColor = delta > 3 ? "text-emerald-400" : delta < -3 ? "text-red-400" : "text-yellow-400";

  const inner = (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <div className={`text-3xl font-semibold ${confColor(latest)}`}>{latest}%</div>
          <div className="text-xs text-zinc-400 mt-1">Current regime confidence</div>
        </div>
        <div className={`text-sm font-medium ${tColor}`}>{trending}</div>
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={trendData}>
          <defs>
            <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="hour" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip content={<PremiumTooltip formatter={(v) => [`${v}%`, "Confidence"]} />} />

          <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.3} />
          <ReferenceLine y={50} stroke="#facc15" strokeDasharray="3 3" strokeOpacity={0.3} />
          <Area type="monotone" dataKey="conf" stroke="#3b82f6" strokeWidth={2} fill="url(#confGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex gap-4 text-xs text-zinc-500">
        <span>24h range: {Math.min(...trendData.map(d => d.conf))}–{Math.max(...trendData.map(d => d.conf))}%</span>
        <span className={tColor}>24h Δ: {delta > 0 ? "+" : ""}{delta}%</span>
      </div>
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Confidence Trend (24H)" consequence="Confidence trend shows whether regime conviction is building or deteriorating." onUnlock={onUnlock}requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Confidence Trend (24H)</Label>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// REGIME STACK CARD
// ─────────────────────────────────────────
function RegimeStackCard({ stack, isPro, onUnlock, requiredTier }) {
  if (!stack) return null;
  const layers = [
    { label: "Macro", tf: "1D", data: stack.macro },
    { label: "Trend", tf: "4H", data: stack.trend },
    { label: "Execution", tf: "1H", data: stack.execution },
  ];
  const alignDesc =
    (stack.alignment || 0) >= 80 ? "All timeframes agree — high conviction" :
    (stack.alignment || 0) >= 50 ? "Partial alignment — moderate conviction" :
    "Conflicting timeframes — reduce size";

  return (
    <CardShell>
      <div className="flex justify-between items-start">
        <div>
          <Label>Regime Stack</Label>
          <h2 className="text-xl font-semibold">{stack.coin} Multi-Timeframe Analysis</h2>
        </div>
        {stack.direction && (
          <span className={`text-xs px-3 py-1 rounded-full border ${dirBadge(stack.direction)}`}>
            {stack.direction === "bullish" ? "↑ Bullish" : stack.direction === "bearish" ? "↓ Bearish" : "→ Mixed"}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {layers.map(({ label, tf, data }) => (
          <div
            key={label}
            className={`flex items-center justify-between px-5 py-4 border rounded-lg ${
              data ? regimeBorder(data.label) : "border-white/5"
            }`}
          >
            <div className="w-32 shrink-0">
              <span className="text-gray-300 font-medium text-sm">{label}</span>
              <span className="text-zinc-500 text-xs ml-1">({tf})</span>
            </div>
            <div className={`text-sm font-semibold flex-1 ${data ? regimeText(data.label) : "text-zinc-500"}`}>
              {data?.label ?? "—"}
            </div>
            <div className="text-xs text-right w-28 hidden sm:block">
              {isPro && data ? (
                <span className="text-zinc-400">Coherence {data.coherence?.toFixed(1)}%</span>
              ) : (
                <span className="text-gray-700 flex items-center justify-end cursor-pointer" onClick={onUnlock}>
  <Lock />Essential
</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-2">
          <Label>Alignment</Label>
          <div className={`text-3xl font-semibold ${alignColor(stack.alignment || 0)}`}>
            {stack.alignment ?? "—"}%
          </div>
          <Bar
            value={stack.alignment || 0}
            cls={(stack.alignment || 0) >= 80 ? "bg-emerald-500" : (stack.alignment || 0) >= 50 ? "bg-yellow-500" : "bg-red-500"}
          />
          <div className="text-xs text-zinc-500">{alignDesc}</div>
        </div>

        <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-2">
          <Label>Recommended Exposure</Label>
          {isPro ? (
            <>
              <div className={`text-3xl font-semibold ${exposureColor(stack.exposure || 0)}`}>
                {stack.exposure ?? "—"}%
              </div>
              <Bar
                value={stack.exposure || 0}
                cls={(stack.exposure || 0) > 60 ? "bg-emerald-500" : (stack.exposure || 0) > 35 ? "bg-yellow-500" : "bg-red-500"}
              />
              <div className="text-xs text-zinc-500">Alignment-adjusted recommendation</div>
            </>
          ) : (
            <div className="space-y-2 cursor-pointer" onClick={onUnlock}>
              <div className="text-3xl font-semibold text-zinc-700 blur-sm select-none">00%</div>
              <div className="text-xs text-gray-700 flex items-center gap-1"><Lock />Pro only</div>
            </div>
          )}
        </div>
      </div>

      {isPro && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: "Survival", v: stack.survival, fn: (v) => riskColor(100 - v) },
            { l: "Hazard", v: stack.hazard, fn: riskColor },
            { l: "Shift Risk", v: stack.shift_risk, fn: riskColor },
          ].map(({ l, v, fn }) => (
            <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
              <Label>{l}</Label>
              <div className={`text-xl font-semibold ${fn(v || 0)}`}>{v ?? "—"}%</div>
            </div>
          ))}
        </div>
      )}

      {!isPro && (
        <button
          onClick={onUnlock}
          className="w-full border border-zinc-700 py-3 text-sm text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors rounded-lg"
        >
          <Lock />Unlock coherence, survival, hazard & exposure — Essential
        </button>
      )}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// CONFIDENCE PANEL
// ─────────────────────────────────────────
function ConfidencePanel({ confidence, isPro, onUnlock, requiredTier }) {
  const inner = (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <div className={`text-4xl font-semibold ${confColor(confidence?.score ?? 0)}`}>
            {confidence?.score ?? "—"}%
          </div>
          <div className={`text-sm mt-1 ${confColor(confidence?.score ?? 0)}`}>
            {confidence?.label ?? "—"}
          </div>
        </div>
        <div className="text-xs text-zinc-400 max-w-xs text-right">{confidence?.description}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(confidence?.components || {}).map(([key, val]) => (
          <div key={key} className="bg-white/2 border border-white/5 rounded-lg p-3 space-y-1">
            <div className="text-xs text-zinc-500 capitalize">{key}</div>
            <div className="text-lg font-semibold text-white">{val}%</div>
            <Bar value={val} cls="bg-blue-500" />
          </div>
        ))}
      </div>
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Regime Confidence Score" consequence="Confidence score determines appropriate position sizing for this regime." onUnlock={onUnlock}requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  if (!confidence) return null;
  return (
    <CardShell>
      <Label>Regime Confidence Score</Label>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// VOL ENVIRONMENT
// ─────────────────────────────────────────
function VolEnvironment({ env, isPro, onUnlock, requiredTier }) {
  function envColor(label) {
    if (["Low", "Strong", "Normal"].includes(label)) return "text-green-400";
    if (["Moderate", "Weak"].includes(label)) return "text-yellow-400";
    if (["High", "Elevated", "Extreme", "Thin", "Deteriorating"].includes(label)) return "text-red-400";
    return "text-gray-400";
  }

  const items = [
    { label: "Volatility", value: env?.volatility_label, score: env?.volatility_score },
    { label: "Trend Stability", value: env?.stability_label, score: env?.stability_score },
    { label: "Market Stress", value: env?.stress_label, score: env?.stress_score },
    { label: "Liquidity", value: env?.liquidity_label, score: null },
  ];

  const inner = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(({ label, value, score }) => (
        <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
          <div className="text-xs text-zinc-400">{label}</div>
          <div className={`text-xl font-semibold ${envColor(value)}`}>{value ?? "—"}</div>
          {score != null && (
            <>
              <Bar value={score} cls={score > 70 ? "bg-red-500" : score > 40 ? "bg-yellow-500" : "bg-green-500"} />
              <div className="text-xs text-gray-700">{score}%</div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Volatility & Liquidity Environment" consequence="Volatility environment determines stop placement and position sizing precision." onUnlock={onUnlock}requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  if (!env) return null;
  return (
    <CardShell>
      <Label>Market Conditions</Label>
      <h2 className="text-base font-semibold">Volatility & Liquidity Environment</h2>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// TRANSITION MATRIX
// ─────────────────────────────────────────
function TransitionMatrix({ transitions, isPro, onUnlock, requiredTier }) {
  const inner = (
    <div className="space-y-3">
      {Object.entries(transitions?.transitions || {}).map(([state, prob]) => (
        <div key={state} className="flex items-center gap-4">
          <div className="w-44 text-xs text-gray-400 shrink-0">{state}</div>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ${
                  state === transitions?.current_state ? "bg-white" :
                  state.includes("Risk-On") ? "bg-green-500" :
                  state.includes("Risk-Off") ? "bg-red-500" : "bg-yellow-500"
                }`}
                style={{ width: `${prob}%` }}
              />
            </div>
            <div className="text-sm font-semibold text-white w-10 text-right">{prob}%</div>
          </div>
        </div>
      ))}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Regime Transition Probability" consequence="Transition probabilities show where the regime is statistically likely to move next." onUnlock={onUnlock}requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  if (!transitions?.transitions) return null;
  return (
    <CardShell>
      <div>
        <Label>Regime Transition Probability</Label>
        <h2 className="text-base font-semibold">
          Next Transition — Current:{" "}
          <span className={regimeText(transitions.current_state)}>{transitions.current_state}</span>
        </h2>
        {!transitions.data_sufficient && (
          <div className="text-xs text-zinc-500 mt-1">
            Estimated · {transitions.sample_size} historical transitions
          </div>
        )}
      </div>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// PORTFOLIO ALLOCATOR — FIX: token + authHeaders
// ─────────────────────────────────────────
function PortfolioAllocator({ stack, token, isPro, onUnlock, requiredTier }) {
  const [accountSize, setAccountSize] = useState(10000);
  const [strategyMode, setStrategyMode] = useState("balanced");
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculate = async () => {
    if (!isPro) { onUnlock(); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(
        `/portfolio-allocator?account_size=${accountSize}&strategy_mode=${strategyMode}&coin=${stack?.coin || "BTC"}`,
        token,
        { method: "POST" }
      );
      setAllocation(data);
    } catch {
      setError("Calculation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CardShell>
      <div>
        <Label>Portfolio Exposure Allocator</Label>
        <h2 className="text-base font-semibold">Risk-Adjusted Capital Allocation</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Account Size (USD)</div>
          <input
            type="number"
            value={accountSize}
            onChange={(e) => setAccountSize(Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Strategy Mode</div>
          <div className="flex gap-2">
            {["conservative", "balanced", "aggressive"].map((m) => (
              <button
                key={m}
                onClick={() => setStrategyMode(m)}
                className={`flex-1 py-3 rounded-xl text-xs font-medium capitalize transition-colors ${
                  strategyMode === m ? "bg-white text-black" : "bg-zinc-950 text-gray-400 border border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end">
          <button
            onClick={calculate}
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? "Calculating..." : isPro ? "Calculate Allocation" : <><Lock />Pro Only</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-900 bg-red-950 px-4 py-3 text-red-400 text-sm rounded-lg">{error}</div>
      )}

      {allocation && !allocation.error && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Deployed", value: `
$$
{allocation.deployed_capital?.toLocaleString()}`, color: exposureColor(allocation.adjusted_exposure) },
              { label: "Spot", value: `
$$
{allocation.spot_allocation?.toLocaleString()}`, color: "text-blue-400" },
              { label: "Swing", value: `
$$
{allocation.swing_allocation?.toLocaleString()}`, color: "text-purple-400" },
              { label: "Cash Reserve", value: `
$$
{allocation.cash_reserve?.toLocaleString()}`, color: "text-gray-300" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
                <div className="text-xs text-zinc-400">{label}</div>
                <div className={`text-xl font-semibold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
          <div className="border border-white/5 px-4 py-3 text-xs text-zinc-500 space-x-4 rounded-lg">
            <span>Adjusted exposure: <span className="text-gray-400">{allocation.adjusted_exposure}%</span></span>
            <span>Strategy: <span className="text-gray-400 capitalize">{allocation.strategy_mode}</span></span>
            <span>Confidence: <span className="text-gray-400">{allocation.confidence}%</span></span>
          </div>
        </div>
      )}

      {!isPro && (
        <div
          className="border border-dashed border-zinc-700 p-6 text-center space-y-2 cursor-pointer hover:border-zinc-500 transition-colors rounded-lg"
          onClick={onUnlock}
        >
          <div className="text-sm text-gray-400"><Lock />Portfolio allocator requires Pro</div>
          <div className="text-xs text-zinc-500">Unlock deployed capital · spot vs swing split · cash reserve calculation</div>
        </div>
      )}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// CORRELATION PANEL
// ─────────────────────────────────────────
function CorrelationPanel({ correlation, isPro, onUnlock, requiredTier }) {
  const inner = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {(correlation?.pairs || []).map(({ pair, correlation: corr, label }) => {
          const abs = Math.abs(corr);
          return (
            <div key={pair} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-gray-300">{pair}</div>
              <div className={`text-2xl font-semibold ${
                abs > 0.8 ? "text-emerald-400" : abs > 0.5 ? "text-yellow-400" : "text-red-400"
              }`}>
                {Number(corr).toFixed(2)}
              </div>
              <div className="text-xs text-zinc-500">{label}</div>
              <Bar value={abs * 100} cls={abs > 0.8 ? "bg-emerald-500" : abs > 0.5 ? "bg-yellow-500" : "bg-red-500"} />
            </div>
          );
        })}
      </div>
      {correlation?.alerts?.map((alert, i) => (
        <div key={i} className="border border-red-900 bg-red-900/10 px-4 py-3 text-red-400 text-sm rounded-lg">
          ⚠ {alert}
        </div>
      ))}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Cross-Asset Correlation Monitor" consequence="Correlation breakdown between assets is an early warning of regime stress." onUnlock={onUnlock}requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  if (!correlation?.pairs?.length) return null;
  return (
    <CardShell>
      <div>
        <Label>Cross-Asset Correlation Monitor</Label>
        <h2 className="text-base font-semibold">Pairwise Return Correlation (24H)</h2>
      </div>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// REGIME HEATMAP
// ─────────────────────────────────────────
function RegimeHeatmap({ overview, isPro, onUnlock, requiredTier }) {
  function cellStyle(label) {
    if (label === "Strong Risk-On") return "bg-emerald-900/40 text-emerald-400 border-emerald-900/50";
    if (label === "Risk-On") return "bg-green-900/30 text-green-400 border-green-900/40";
    if (label === "Strong Risk-Off") return "bg-red-900/40 text-red-400 border-red-900/50";
    if (label === "Risk-Off") return "bg-red-900/20 text-red-400 border-red-900/30";
    if (label === "Neutral") return "bg-yellow-900/20 text-yellow-400 border-yellow-900/30";
    return "bg-zinc-950/40 text-zinc-500 border-white/5";
  }
  function shortLabel(label) {
    if (!label) return "—";
    if (label === "Strong Risk-On") return "S.R+";
    if (label === "Risk-On") return "R+";
    if (label === "Strong Risk-Off") return "S.R-";
    if (label === "Risk-Off") return "R-";
    return "NEU";
  }

  const inner = (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-zinc-400 pb-3 pr-6 font-normal uppercase tracking-widest">Asset</th>
              {[
                { label: "Execution", tf: "1H" },
                { label: "Trend", tf: "4H" },
                { label: "Macro", tf: "1D" },
              ].map(({ label, tf }) => (
                <th key={tf} className="text-zinc-400 pb-3 px-3 font-normal uppercase tracking-widest text-center">
                  {label} <span className="text-gray-700">({tf})</span>
                </th>
              ))}
              <th className="text-zinc-400 pb-3 px-3 font-normal uppercase tracking-widest text-center">Align</th>
              <th className="text-zinc-400 pb-3 px-3 font-normal uppercase tracking-widest text-center">Dir</th>
            </tr>
          </thead>
          <tbody>
            {(overview || []).map((item) => (
              <tr key={item.coin} className="border-t border-white/5">
                <td className="pr-6 py-2.5 font-semibold text-white">{item.coin}</td>
                {[item.execution, item.trend, item.macro].map((regime, i) => (
                  <td key={i} className="px-3 py-2.5 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-sm border text-xs font-medium ${cellStyle(regime)}`}>
                      {shortLabel(regime)}
                    </span>
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-sm font-semibold ${alignColor(item.alignment || 0)}`}>
                    {item.alignment ?? "—"}%
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${dirBadge(item.direction || "mixed")}`}>
                    {item.direction === "bullish" ? "↑" : item.direction === "bearish" ? "↓" : "→"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 flex-wrap pt-1">
        {[
          { label: "S.R+", cls: "bg-emerald-900/40 text-emerald-400 border-emerald-900/50" },
          { label: "R+", cls: "bg-green-900/30 text-green-400 border-green-900/40" },
          { label: "NEU", cls: "bg-yellow-900/20 text-yellow-400 border-yellow-900/30" },
          { label: "R-", cls: "bg-red-900/20 text-red-400 border-red-900/30" },
          { label: "S.R-", cls: "bg-red-900/40 text-red-400 border-red-900/50" },
        ].map(({ label, cls }) => (
          <span key={label} className={`text-xs px-2 py-0.5 rounded-sm border ${cls}`}>{label}</span>
        ))}
        <span className="text-xs text-zinc-500 ml-2 self-center">
          S = Strong · R+ = Risk-On · R- = Risk-Off · NEU = Neutral
        </span>
      </div>
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Regime Heatmap" consequence="Heatmap shows regime alignment across all assets simultaneously." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  if (!overview?.length) return null;
  return (
    <CardShell>
      <div>
        <Label>Regime Heatmap</Label>
        <h2 className="text-base font-semibold">Asset × Timeframe Regime Grid</h2>
        <p className="text-xs text-zinc-400 mt-1">Full regime snapshot across every asset and timeframe</p>
      </div>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// RISK EVENTS
// ─────────────────────────────────────────
function RiskEvents({ events }) {
  if (!events?.length) return null;

  function impactStyle(impact) {
    if (impact === "High") return "text-red-400 border-red-900 bg-red-900/10";
    if (impact === "Medium") return "text-yellow-400 border-yellow-900 bg-yellow-900/10";
    return "text-gray-400 border-white/5 bg-zinc-950/20";
  }

  const sorted = [...events].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return (order[a.impact] ?? 2) - (order[b.impact] ?? 2);
  });

  return (
    <CardShell>
      <div>
        <Label>Risk Event Monitor</Label>
        <h2 className="text-base font-semibold">Active Macro Risk Flags</h2>
        <p className="text-xs text-zinc-400 mt-1">Conditions that may trigger regime transitions</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sorted.map((e) => (
          <div key={e.name} className={`border px-4 py-3 rounded-lg space-y-1.5 ${impactStyle(e.impact)}`}>
            <div className="font-medium text-sm">{e.name}</div>
            <div className="text-xs opacity-70">{e.type}</div>
            <div className={`text-xs font-medium px-2 py-0.5 rounded-full border inline-block ${impactStyle(e.impact)}`}>
              {e.impact} Impact
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

// ─────────────────────────────────────────
// REGIME MATURITY
// ─────────────────────────────────────────
function RegimeMaturity({ regimeAge, avgDuration, maturityLabel, isPro, onUnlock, requiredTier }) {
  const maturityPct = avgDuration > 0 ? Math.min(100, (regimeAge / avgDuration) * 100) : 0;

  const phaseColor =
    maturityLabel === "Overextended" ? "text-red-400" :
    maturityLabel === "Late Phase" ? "text-orange-400" :
    maturityLabel === "Mid Phase" ? "text-yellow-400" : "text-emerald-400";

  const phaseCls =
    maturityLabel === "Overextended" ? "bg-red-500" :
    maturityLabel === "Late Phase" ? "bg-orange-500" :
    maturityLabel === "Mid Phase" ? "bg-yellow-500" : "bg-emerald-500";

  const inner = (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className={`text-3xl font-semibold ${phaseColor}`}>{maturityLabel ?? "—"}</div>
        <div className="text-sm text-zinc-400 pb-1">
          {regimeAge.toFixed(1)}h / {(avgDuration || 0).toFixed(0)}h avg
        </div>
      </div>
      <Bar value={maturityPct} cls={phaseCls} />
      <div className="grid grid-cols-4 gap-1 text-xs text-center">
        {["Early Phase", "Mid Phase", "Late Phase", "Overextended"].map((ph) => (
          <div
            key={ph}
            className={`py-1.5 rounded-lg ${
              maturityLabel === ph ? "bg-white text-black font-semibold" : "text-zinc-500 border border-white/5"
            }`}
          >
            {ph}
          </div>
        ))}
      </div>
      <div className="text-xs text-zinc-500">
        0% = regime just started · 100% = statistically overdue for transition
      </div>
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Regime Maturity" consequence="Regime maturity tells you how much statistical life remains in the current trend." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Regime Maturity</Label>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// REGIME HISTORY CHART
// ─────────────────────────────────────────
function RegimeTimeline({ history, coin }) {
  if (!history?.length) return null;
  return (
    <CardShell>
      <div>
        <Label>Regime Score History</Label>
        <h2 className="text-base font-semibold">{coin} 48H Momentum Signal</h2>
        <p className="text-xs text-zinc-400 mt-1">Composite regime score over time</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={history}>
          <defs>
            <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
          <XAxis dataKey="hour" stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} />
          <YAxis stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} domain={[-100, 100]} />
          <Tooltip content={<PremiumTooltip formatter={(v) => [`${v?.toFixed(2)}`, "Score"]} />} />

          <ReferenceLine y={0} stroke="#27272a" />
          <ReferenceLine y={35} stroke="#16a34a" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine y={-35} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.4} />
          <Area type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} fill="url(#hGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
        <table className="sr-only" aria-label="Regime score history">
          <caption>{coin} regime score over the last 48 hours</caption>
          <thead>
            <tr>
              <th scope="col">Hour</th>
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            {history.filter((_, i) => i % 4 === 0).map((point, i) => (
              <tr key={i}>
                <td>{point.hour}</td>
                <td>{point.score?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
    </CardShell>
  );
}

// ─────────────────────────────────────────
// MARKET BREADTH
// ─────────────────────────────────────────
function BreadthPanel({ breadth }) {
  if (!breadth?.total) return null;
  const { bullish, neutral, bearish, total, breadth_score } = breadth;

  const scoreColor = breadth_score > 30 ? "text-green-400" : breadth_score < -30 ? "text-red-400" : "text-yellow-400";
  const trendLabel =
    breadth_score > 60 ? "Strong Participation" :
    breadth_score > 20 ? "Healthy" :
    breadth_score > -20 ? "Mixed" :
    breadth_score > -60 ? "Weak" : "Broad Risk-Off";

  return (
    <CardShell>
      <div className="flex justify-between items-start">
        <div>
          <Label>Market Breadth</Label>
          <h2 className="text-base font-semibold">Trend Participation ({total} assets)</h2>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-semibold ${scoreColor}`}>
            {breadth_score > 0 ? "+" : ""}{breadth_score}
          </div>
          <div className={`text-xs mt-0.5 ${scoreColor}`}>{trendLabel}</div>
        </div>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {bullish > 0 && <div className="bg-green-500 transition-all" style={{ width: `${(bullish / total) * 100}%` }} />}
        {neutral > 0 && <div className="bg-yellow-500 transition-all" style={{ width: `${(neutral / total) * 100}%` }} />}
        {bearish > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(bearish / total) * 100}%` }} />}
      </div>
      <div className="flex gap-6 text-xs">
        <span className="text-green-400">{bullish} bullish</span>
        <span className="text-yellow-400">{neutral} neutral</span>
        <span className="text-red-400">{bearish} bearish</span>
        <span className="text-zinc-500 ml-auto">{Math.round(((bullish + bearish) / total) * 100)}% trending</span>
      </div>
    </CardShell>
  );
}

// ─────────────────────────────────────────
// MULTI-ASSET REGIME MAP
// ─────────────────────────────────────────
function RegimeMap({ overview, activeCoin, onSelect }) {
  if (!overview?.length) return null;
  return (
    <CardShell>
      <Label>Multi-Asset Regime Map</Label>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {overview.map((item) => (
          <button
            key={item.coin}
            onClick={() => onSelect(item.coin)}
            className={`border p-3 text-left space-y-1.5 transition-colors rounded-lg ${
              item.coin === activeCoin ? "border-white" : "border-white/5 hover:border-zinc-600"
            }`}
          >
            <div className="font-semibold text-sm">{item.coin}</div>
            {[
              { l: "M", v: item.macro },
              { l: "T", v: item.trend },
              { l: "E", v: item.execution },
            ].map(({ l, v }) => (
              <div key={l} className="flex items-center gap-1">
                <span className="text-zinc-500 text-xs w-3">{l}</span>
                <span className={`text-xs ${regimeText(v)}`}>
                  {v ? v.replace("Strong ", "S.").replace("Risk-On", "R+").replace("Risk-Off", "R-") : "—"}
                </span>
              </div>
            ))}
            {item.alignment != null && (
              <div className={`text-xs font-medium ${alignColor(item.alignment)}`}>{item.alignment}%</div>
            )}
          </button>
        ))}
      </div>
    </CardShell>
  );
}

// ─────────────────────────────────────────
// SURVIVAL CURVE
// ─────────────────────────────────────────
function SurvivalCurve({ curve, regimeAge, isPro, onUnlock, requiredTier }) {
  // Generate a fake curve for the teaser so free users see something behind the gate
  const teaserCurve = Array.from({ length: 48 }, (_, i) => ({
    hour: i,
    survival: Math.max(10, 100 - (i * 1.8) - Math.sin(i * 0.3) * 8),
    hazard: Math.min(90, 5 + (i * 1.2) + Math.cos(i * 0.4) * 5),
  }));

  const displayCurve = isPro && curve?.length > 0 ? curve : teaserCurve;

  return (
    <CardShell>
      <div>
        <Label>Survival Curve</Label>
        <h2 className="text-base font-semibold">Regime Persistence Probability</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Probability current regime persists · white line = current age
        </p>
      </div>

      {/* Chart — always rendered, blurred for free users */}
      <div className={`relative ${!isPro ? "pointer-events-none" : ""}`}>
        <div className={!isPro ? "blur-sm opacity-60" : ""}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={displayCurve}>
              <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                stroke="#3f3f46"
                tick={{ fill: "#52525b", fontSize: 10 }}
              />
              <YAxis
                stroke="#3f3f46"
                tick={{ fill: "#52525b", fontSize: 10 }}
                domain={[0, 100]}
              />
              <Tooltip
                content={
                  <PremiumTooltip
                    formatter={(v, n) => [`${v?.toFixed(1)}%`, n]}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="survival"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Survival %"
              />
              <Line
                type="monotone"
                dataKey="hazard"
                stroke="#f87171"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="Hazard %"
              />
              <ReferenceLine
                x={Math.round(regimeAge)}
                stroke="#ffffff"
                strokeDasharray="3 3"
                label={{ value: "Now", fill: "#71717a", fontSize: 10 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <table className="sr-only" aria-label="Survival curve data">
            <caption>Regime persistence probability over time</caption>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col">Survival %</th>
                <th scope="col">Hazard %</th>
              </tr>
            </thead>
            <tbody>
              {(isPro && curve?.length > 0 ? curve : []).filter((_, i) => i % 6 === 0).map((point) => (
                <tr key={point.hour}>
                  <td>{point.hour}h</td>
                  <td>{point.survival?.toFixed(1)}%</td>
                  <td>{point.hazard?.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lock overlay for free users */}
        {!isPro && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-zinc-950/95 border border-zinc-700 px-6 py-5 text-center space-y-3 rounded-xl shadow-2xl backdrop-blur-sm max-w-xs">
              <div className="text-sm font-semibold text-white flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Survival Curve
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed">
                Without survival modeling, you cannot quantify regime decay probability.
              </div>
              <button
                onClick={onUnlock}
                className="w-full bg-white text-black px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-zinc-100 hover:-translate-y-[1px] transition-all shadow-lg"
              >
                Unlock — Essential $39/month
              </button>
              <div className="text-[10px] text-zinc-700">7-day free trial · Cancel anytime</div>
            </div>
          </div>
        )}
      </div>

      {/* If Pro but no data yet */}
      {isPro && (!curve || curve.length === 0) && (
        <div className="text-xs text-zinc-500 text-center py-4">
          Survival curve data loading...
        </div>
      )}
    </CardShell>
  );
}


// ─────────────────────────────────────────
// INTERPRETATION PANEL
// ─────────────────────────────────────────
function InterpretationPanel({ stack, latest, isPro }) {
  if (!stack) return null;
  const regimeAge = stack.regime_age_hours ?? 0;
  const hazard = stack.hazard ?? 0;
  const survival = stack.survival ?? 0;
  const alignment = stack.alignment ?? 0;

  return (
    <CardShell>
      <Label>Signal Interpretation</Label>
      <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-400">
        <div>Regime Age: <span className="text-white">{regimeAge.toFixed(1)}h</span></div>
        {latest && (
          <>
            <div>
              4H Momentum:{" "}
              <span className={(latest.momentum_4h || 0) >= 0 ? "text-green-400" : "text-red-400"}>
                {latest.momentum_4h?.toFixed(2) ?? "—"}%
              </span>
            </div>
            <div>
              24H Momentum:{" "}
              <span className={(latest.momentum_24h || 0) >= 0 ? "text-green-400" : "text-red-400"}>
                {latest.momentum_24h?.toFixed(2) ?? "—"}%
              </span>
            </div>
            <div>Volatility: <span className="text-white">{latest.volatility?.toFixed(2) ?? "—"}</span></div>
          </>
        )}
      </div>
      {isPro && hazard > 60 && (
        <div className="text-red-400 text-sm pt-1">⚠ Elevated hazard above 60% — deterioration risk is statistically significant.</div>
      )}
      {isPro && survival > 70 && (
        <div className="text-green-400 text-sm pt-1">✓ Regime persistence statistically strong at current age.</div>
      )}
      {alignment < 40 && (
        <div className="text-yellow-400 text-sm pt-1">⚡ Low alignment — timeframes in conflict. Reduce position size.</div>
      )}
      {stack.macro?.label?.includes("Risk-Off") && stack.execution?.label?.includes("Risk-On") && (
        <div className="border border-yellow-900 bg-yellow-900/10 px-4 py-3 text-yellow-400 text-sm rounded-lg">
          Counter-trend detected: short-term bullish inside bearish macro. Exposure automatically reduced.
        </div>
      )}
      {stack.macro?.label?.includes("Risk-On") && stack.execution?.label?.includes("Risk-Off") && (
        <div className="border border-blue-900 bg-blue-900/10 px-4 py-3 text-blue-400 text-sm rounded-lg">
          Pullback within bullish macro — potential re-entry zone. Await execution alignment before adding size.
        </div>
      )}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// DECISION ENGINE PANEL — FIX: uses token + apiFetch
// ─────────────────────────────────────────
function DecisionEnginePanel({ stack, token, isPro, onUnlock, onDecisionLoaded, requiredTier }) {
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stack?.coin || !isPro) return;
    setLoading(true);
    apiFetch(`/decision-engine?coin=${stack.coin}`, token)
      .then((d) => {
        if (!d.error) {
          setDecision(d);
          if (onDecisionLoaded) onDecisionLoaded(d);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [stack?.coin, isPro, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const directiveStyle = (action) => {
    if (action === "aggressive") return { border: "border-emerald-700", bg: "bg-emerald-950", text: "text-emerald-300", bar: "bg-emerald-500" };
    if (action === "hold") return { border: "border-green-800", bg: "bg-green-950", text: "text-green-300", bar: "bg-green-500" };
    if (action === "trim") return { border: "border-yellow-800", bg: "bg-yellow-950", text: "text-yellow-300", bar: "bg-yellow-500" };
    if (action === "defensive") return { border: "border-orange-800", bg: "bg-orange-950", text: "text-orange-300", bar: "bg-orange-500" };
    return { border: "border-red-800", bg: "bg-red-950", text: "text-red-300", bar: "bg-red-500" };
  };

  const inner = decision ? (
    <div className="space-y-6">
      {(() => {
        const s = directiveStyle(decision.action);
        return (
          <div className={`border ${s.border} ${s.bg} p-6 space-y-3 rounded-lg`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">ChainPulse Directive</div>
                <div className={`text-3xl font-bold ${s.text}`}>{decision.directive}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Decision Score</div>
                <div className={`text-3xl font-bold ${s.text}`}>{decision.score}</div>
              </div>
            </div>
            <div className={`text-sm ${s.text} opacity-80`}>{decision.description}</div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-700 ${s.bar}`} style={{ width: `${decision.score}%` }} />
            </div>
          </div>
        );
      })()}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Recommended Actions</div>
          <ul className="space-y-2">
            {(decision?.actions || []).map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-white mt-0.5 shrink-0 font-bold">→</span>{a}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Signal Breakdown</div>
          <div className="space-y-2">
            {Object.entries(decision?.components || {}).map(([key, val]) => (
              <div key={key} className="flex items-center gap-3">
                <div className="text-xs text-zinc-500 w-20 capitalize shrink-0">{key}</div>
                <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${val >= 70 ? "bg-emerald-500" : val >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${val}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 w-8 text-right">{val}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/2 border border-white/5 rounded-lg p-4">
        <div className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Decision Score Map</div>
        <div className="grid grid-cols-5 gap-1 text-xs text-center">
          {[
            { range: "80–100", label: "Increase", cls: "bg-emerald-900/40 text-emerald-400 border-emerald-900" },
            { range: "60–79", label: "Maintain", cls: "bg-green-900/30 text-green-400 border-green-900" },
            { range: "40–59", label: "Trim", cls: "bg-yellow-900/30 text-yellow-400 border-yellow-900" },
            { range: "20–39", label: "Defensive", cls: "bg-orange-900/30 text-orange-400 border-orange-900" },
            { range: "0–19", label: "Risk-Off", cls: "bg-red-900/30 text-red-400 border-red-900" },
          ].map(({ range, label, cls }) => {
            const [lo, hi] = range.split("–").map(Number);
            const active = decision.score >= lo && decision.score <= (hi || 100);
            return (
              <div key={range} className={`border px-2 py-2 rounded-sm space-y-0.5 ${cls} ${active ? "ring-1 ring-white" : ""}`}>
                <div className="font-semibold">{label}</div>
                <div className="opacity-60">{range}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  ) : loading ? (
    <div className="text-sm text-zinc-400">Computing directive...</div>
  ) : (
    <div className="text-sm text-zinc-400">Insufficient data</div>
  );

  if (!isPro)
    return (
      <ProGate label="Decision Engine" consequence="Without the decision engine, you have no systematic directive for today's session." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Decision Engine</Label>
      <p className="text-xs text-zinc-400 mb-4">Systematic directive based on all regime signals — updated every hour</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// IF YOU DO NOTHING PANEL — FIX: uses token + apiFetch
// ─────────────────────────────────────────
function IfNothingPanel({ stack, token, isPro, onUnlock, requiredTier }) {
  const [userExposure, setUserExposure] = useState(50);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyse = async () => {
    if (!stack?.coin) return;
    setLoading(true);
    try {
      const data = await apiFetch(
        `/if-nothing-panel?coin=${stack.coin}&user_exposure=${userExposure}`,
        token,
        { method: "POST" }
      );
      if (!data.error) setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const severityStyle = (severity) => {
    if (severity === "high") return "border-red-800 bg-red-950 text-red-300";
    if (severity === "medium") return "border-yellow-800 bg-yellow-950 text-yellow-300";
    return "border-emerald-800 bg-emerald-950 text-emerald-300";
  };

  const inner = (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="space-y-2 flex-1">
          <div className="text-xs text-zinc-400">Your current exposure %</div>
          <input
            type="number"
            value={userExposure}
            onChange={(e) => setUserExposure(Number(e.target.value))}
            min={0}
            max={200}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <button
          onClick={analyse}
          disabled={loading}
          className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "Analysing..." : "Show Consequences"}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className={`border p-5 space-y-2 rounded-lg ${severityStyle(result.severity)}`}>
            <div className="font-semibold text-sm">{result.message}</div>
            <div className="text-xs opacity-70">{result.sub}</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Your Exposure", value: `${result.user_exposure}%`, color: exposureColor(result.user_exposure) },
              { label: "Model Recommendation", value: `${result.model_exposure}%`, color: exposureColor(result.model_exposure) },
              {
                label: "Drawdown Probability",
                value: `${result.drawdown_prob}%`,
                color: riskColor(result.drawdown_prob),
                sub: result.dd_prob_increase > 0 ? `+${result.dd_prob_increase}% vs model` : "Within model range",
              },
              {
                label: "Expected Loss Risk",
                value: `${result.expected_loss_pct}%`,
                color: riskColor(result.expected_loss_pct),
                sub: `Model: ${result.model_loss_pct}%`,
              },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
                <div className="text-xs text-zinc-400">{label}</div>
                <div className={`text-xl font-semibold ${color}`}>{value}</div>
                {sub && <div className="text-xs text-zinc-500">{sub}</div>}
              </div>
            ))}
          </div>

          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-3">
            <div className="text-xs text-zinc-400">Your exposure vs model recommendation</div>
            <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-zinc-700/60"
                style={{ left: `${Math.max(0, result.model_exposure - 10)}%`, width: "20%" }}
              />
              <div
                className="absolute h-full w-0.5 bg-white opacity-60"
                style={{ left: `${Math.min(99, result.model_exposure)}%` }}
              />
              <div
                className={`absolute h-full w-1 rounded-full ${
                  result.severity === "high" ? "bg-red-400" :
                  result.severity === "medium" ? "bg-yellow-400" : "bg-emerald-400"
                }`}
                style={{ left: `${Math.min(99, result.user_exposure)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>0%</span>
              <span className="text-gray-400">← Model: {result.model_exposure}%&nbsp;&nbsp;|&nbsp;&nbsp;You: {result.user_exposure}% →</span>
              <span>100%</span>
            </div>
          </div>

          {result.over_exposed && result.delta_abs > 15 && (
            <div className="border border-red-900 bg-red-950 px-4 py-3 text-red-300 text-sm rounded-lg">
              ⚠ If this regime shifts while you are over-exposed, estimated drawdown impact is{" "}
              {result.expected_loss_pct}% of portfolio vs {result.model_loss_pct}% if following the model.
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Consequence Simulator" consequence="See exactly what happens to your portfolio if you ignore regime signals." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Consequence Simulator</Label>
      <p className="text-xs text-zinc-400 mb-4">The cost of maintaining your current exposure in this regime</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// PNL IMPACT ESTIMATOR
// ─────────────────────────────────────────
function PnLImpactEstimator({ stack, isPro, onUnlock, requiredTier }) {
  const [portfolioSize, setPortfolioSize] = useState(10000);
  const [userExposure, setUserExposure] = useState(50);
  const [result, setResult] = useState(null);

  const estimate = () => {
    if (!stack) return;
    const modelExposure = stack.exposure ?? 50;
    const hazard = stack.hazard ?? 30;
    const shiftRisk = stack.shift_risk ?? 30;
    const survival = stack.survival ?? 70;
    const execLabel = stack.execution?.label ?? "Neutral";

    const expectedMoveUp = execLabel.includes("Risk-On") ? 0.08 : execLabel === "Neutral" ? 0.03 : 0.01;
    const expectedMoveDown = execLabel.includes("Risk-Off") ? 0.12 : execLabel === "Neutral" ? 0.05 : 0.03;

    const upProb = survival / 100;
    const downProb = (hazard + shiftRisk) / 200;

    const userUpPnL = portfolioSize * (userExposure / 100) * expectedMoveUp;
    const modelUpPnL = portfolioSize * (modelExposure / 100) * expectedMoveUp;
    const userDownPnL = portfolioSize * (userExposure / 100) * expectedMoveDown * -1;
    const modelDownPnL = portfolioSize * (modelExposure / 100) * expectedMoveDown * -1;

    const userEV = upProb * userUpPnL + downProb * userDownPnL;
    const modelEV = upProb * modelUpPnL + downProb * modelDownPnL;

    setResult({
      userEV: Math.round(userEV),
      modelEV: Math.round(modelEV),
      evDelta: Math.round(userEV - modelEV),
      userUpPnL: Math.round(userUpPnL),
      modelUpPnL: Math.round(modelUpPnL),
      userDownPnL: Math.round(userDownPnL),
      modelDownPnL: Math.round(modelDownPnL),
      upProb: Math.round(upProb * 100),
      downProb: Math.round(downProb * 100),
      modelExposure,
      execLabel,
    });
  };

  const inner = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Portfolio Size (USD)</div>
          <input type="number" value={portfolioSize} onChange={(e) => setPortfolioSize(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Your Current Exposure %</div>
          <input type="number" value={userExposure} onChange={(e) => setUserExposure(Number(e.target.value))} min={0} max={200} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <button onClick={estimate} className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100">
        Estimate PnL Impact
      </button>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className={`border p-5 space-y-2 rounded-lg ${result.userEV >= 0 ? "border-emerald-900 bg-emerald-950" : "border-red-900 bg-red-950"}`}>
              <div className="text-xs text-zinc-400">Your Expected Value</div>
              <div className={`text-3xl font-bold ${result.userEV >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {result.userEV >= 0 ? "+" : ""}{result.userEV.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-400">At {userExposure}% exposure</div>
            </div>
            <div className={`border p-5 space-y-2 rounded-lg ${result.modelEV >= 0 ? "border-blue-900 bg-blue-950" : "border-white/5 bg-zinc-950"}`}>
              <div className="text-xs text-zinc-400">Model Expected Value</div>
              <div className={`text-3xl font-bold ${result.modelEV >= 0 ? "text-blue-300" : "text-gray-300"}`}>
                {result.modelEV >= 0 ? "+" : ""}{result.modelEV.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-400">At {result.modelExposure}% exposure</div>
            </div>
          </div>

          {result.evDelta !== 0 && (
            <div className={`border px-4 py-3 text-sm rounded-lg ${
              result.evDelta < 0 ? "border-red-900 bg-red-950 text-red-300" : "border-emerald-900 bg-emerald-950 text-emerald-300"
            }`}>
              {result.evDelta < 0
                ? `⚠ Your exposure reduces expected value by 
$$
{Math.abs(result.evDelta).toLocaleString()} vs model.`
                : `✓ Your exposure increases expected value by
$$
{result.evDelta.toLocaleString()} vs model.`}
            </div>
          )}

          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-3">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">Scenario Breakdown</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <div className="text-zinc-400">Upside ({result.upProb}% probability)</div>
                <div className="flex gap-3">
                  <span className="text-emerald-400">You: +${result.userUpPnL.toLocaleString()}</span>
                  <span className="text-blue-400">Model: +${result.modelUpPnL.toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-zinc-400">Downside ({result.downProb}% probability)</div>
                <div className="flex gap-3">
                  <span className="text-red-400">You: -${Math.abs(result.userDownPnL).toLocaleString()}</span>
                  <span className="text-orange-400">Model: -${Math.abs(result.modelDownPnL).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-700 border-t border-white/5 pt-2">
              Based on {result.execLabel} regime · probabilities derived from survival and hazard modeling
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="PnL Impact Estimator" consequence="Without PnL modeling you cannot quantify the expected value of your exposure decision." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>PnL Impact Estimator</Label>
      <p className="text-xs text-zinc-400 mb-4">Expected value of your current exposure vs model recommendation</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// DRAWDOWN SIMULATOR
// ─────────────────────────────────────────
function DrawdownSimulator({ stack, isPro, onUnlock, requiredTier }) {
  const [portfolioSize, setPortfolioSize] = useState(10000);
  const [userExposure, setUserExposure] = useState(50);
  const [result, setResult] = useState(null);

  const simulate = () => {
    if (!stack) return;
    const modelExposure = stack.exposure ?? 50;
    const scenarios = [
      { label: "Moderate", pct: 10, color: "text-yellow-400", barCls: "bg-yellow-500" },
      { label: "Severe", pct: 20, color: "text-orange-400", barCls: "bg-orange-500" },
      { label: "Extreme", pct: 30, color: "text-red-400", barCls: "bg-red-500" },
    ];
    const results = scenarios.map(({ label, pct, color, barCls }) => {
      const userLoss = (userExposure / 100) * (pct / 100) * portfolioSize;
      const modelLoss = (modelExposure / 100) * (pct / 100) * portfolioSize;
      const saving = userLoss - modelLoss;
      return {
        label, pct, color, barCls,
        userLoss: Math.round(userLoss),
        modelLoss: Math.round(modelLoss),
        saving: Math.round(saving),
        userPct: ((userLoss / portfolioSize) * 100).toFixed(1),
        modelPct: ((modelLoss / portfolioSize) * 100).toFixed(1),
        savingPct: ((saving / portfolioSize) * 100).toFixed(1),
      };
    });
    setResult({ scenarios: results, modelExposure });
  };

  const inner = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Portfolio Size (USD)</div>
          <input type="number" value={portfolioSize} onChange={(e) => setPortfolioSize(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Your Current Exposure %</div>
          <input type="number" value={userExposure} onChange={(e) => setUserExposure(Number(e.target.value))} min={0} max={200} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <button onClick={simulate} className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100">
        Run Drawdown Scenarios
      </button>

      {result && (
        <div className="space-y-4">
          <div className="border border-white/5 px-4 py-3 text-xs text-zinc-400 rounded-lg">
            <span>Model recommendation: <span className="text-gray-300">{result.modelExposure}%</span></span>
            <span className="mx-3">·</span>
            <span>Your exposure: <span className="text-gray-300">{userExposure}%</span></span>
            <span className="mx-3">·</span>
            <span>Portfolio: <span className="text-gray-300">${portfolioSize.toLocaleString()}</span></span>
          </div>
          {result.scenarios.map(({ label, pct, color, barCls, userLoss, modelLoss, saving, userPct, modelPct, savingPct }) => (
            <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className={`text-lg font-semibold ${color}`}>{label} Drawdown — {pct}% price decline</div>
                  <div className="text-xs text-zinc-400 mt-0.5">Simulated portfolio impact</div>
                </div>
                {saving > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Model saves you</div>
                    <div className="text-lg font-semibold text-emerald-400">${saving.toLocaleString()}</div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs text-zinc-400">Your loss</div>
                  <div className={`text-2xl font-semibold ${color}`}>-${userLoss.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">-{userPct}% of portfolio</div>
                  <Bar value={Number(userPct)} cls={barCls} />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-zinc-400">Model loss</div>
                  <div className="text-2xl font-semibold text-gray-300">-${modelLoss.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">-{modelPct}% of portfolio</div>
                  <Bar value={Number(modelPct)} cls="bg-zinc-500" />
                </div>
              </div>
              {saving > 0 && (
                <div className="border border-emerald-900 bg-emerald-950 px-3 py-2 text-emerald-300 text-xs rounded-lg">
                  Following the model saves ${saving.toLocaleString()} ({savingPct}%) in this scenario.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Drawdown Simulator" consequence="Without drawdown simulation you cannot quantify the real cost of your current exposure." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Drawdown Simulator</Label>
      <p className="text-xs text-zinc-400 mb-4">Three drawdown scenarios at your exposure vs model recommendation</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// RISK PROFILE PANEL — FIX: uses token + authHeaders
// ─────────────────────────────────────────
function RiskProfilePanel({ email, token, isPro, onUnlock, onProfileSaved, requiredTier }) {
  const [drawdown, setDrawdown] = useState(20);
  const [leverage, setLeverage] = useState(1);
  const [holding, setHolding] = useState(10);
  const [identity, setIdentity] = useState("balanced");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const data = await apiFetch("/user-profile", token, {
        method: "POST",
        body: JSON.stringify({
          email, max_drawdown_pct: drawdown, typical_leverage: leverage,
          holding_period_days: holding, risk_identity: identity,
        }),
      });
      if (data.status === "saved") {
        setSaved(true);
        if (onProfileSaved) onProfileSaved(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const identityDesc = {
    conservative: "Lower returns, minimal drawdowns. Capital preservation first.",
    balanced: "Standard regime-based allocation. Model defaults.",
    aggressive: "Maximum exposure in strong regimes. Higher volatility accepted.",
  };

  const inner = (
    <div className="space-y-6">
      {saved && (
        <div className="border border-emerald-800 bg-emerald-950 px-4 py-3 text-emerald-300 text-sm rounded-lg">
          ✓ Risk profile saved. Exposure recommendations are now personalised.
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-5">
          {[
            { l: "Max Tolerable Drawdown", val: drawdown, set: setDrawdown, min: 5, max: 50, step: 5, fmt: (v) => `${v}%`, left: "5% (conservative)", right: "50% (aggressive)" },
            { l: "Typical Leverage", val: leverage, set: setLeverage, min: 1, max: 10, step: 0.5, fmt: (v) => `${v}x`, left: "1x (spot)", right: "10x" },
            { l: "Typical Holding Period", val: holding, set: setHolding, min: 1, max: 30, step: 1, fmt: (v) => `${v} days`, left: "1 day (scalp)", right: "30 days (swing)" },
          ].map(({ l, val, set, min, max, step, fmt, left, right }) => (
            <div key={l} className="space-y-2">
              <div className="flex justify-between">
                <div className="text-xs text-zinc-400">{l}</div>
                <div className="text-xs text-white font-medium">{fmt(val)}</div>
              </div>
              <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full accent-white" />
              <div className="flex justify-between text-xs text-gray-700"><span>{left}</span><span>{right}</span></div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="text-xs text-zinc-400">Trader Identity</div>
          <div className="space-y-2">
            {["conservative", "balanced", "aggressive"].map((id) => (
              <button
                key={id}
                onClick={() => setIdentity(id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors space-y-1 ${
                  identity === id ? "border-white bg-zinc-800" : "border-white/5 hover:border-zinc-600"
                }`}
              >
                <div className="text-sm font-medium capitalize">{id}</div>
                <div className="text-xs text-zinc-500">{identityDesc[id]}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={save} disabled={loading || !email} className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 disabled:opacity-50">
        {loading ? "Saving..." : "Save Risk Profile"}
      </button>
      {!email && <div className="text-xs text-zinc-500">Sign in to save your profile.</div>}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Risk Profile Calibration" consequence="Without a risk profile, exposure recommendations cannot be personalised to your capital." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Risk Profile Calibration</Label>
      <p className="text-xs text-zinc-400 mb-4">Personalise exposure recommendations to your trading style and capital</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// EXPOSURE LOGGER — FIX: uses token + apiFetch
// ─────────────────────────────────────────
function ExposureLogger({ stack, email, token, isPro, onUnlock, requiredTier }) {
  const [userExposure, setUserExposure] = useState(50);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const logIt = async () => {
    if (!email || !stack?.coin) return;
    setLoading(true);
    try {
      const data = await apiFetch("/log-exposure", token, {
        method: "POST",
        body: JSON.stringify({ email, coin: stack.coin, user_exposure_pct: userExposure }),
      });
      setResult(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const inner = (
    <div className="space-y-5">
      <p className="text-xs text-zinc-400">Log your actual exposure to build your discipline score and performance tracking over time.</p>
      <div className="flex gap-4 items-end">
        <div className="space-y-2 flex-1">
          <div className="text-xs text-zinc-400">My current exposure in {stack?.coin ?? "BTC"} (%)</div>
          <input type="number" value={userExposure} onChange={(e) => setUserExposure(Number(e.target.value))} min={0} max={200} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-zinc-500">Model says</div>
          <div className={`text-xl font-semibold ${exposureColor(stack?.exposure ?? 0)}`}>{stack?.exposure ?? "—"}%</div>
        </div>
        <button onClick={logIt} disabled={loading || !email} className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 whitespace-nowrap">
          {loading ? "Logging..." : "Log Exposure"}
        </button>
      </div>
      {result && (
        <div className={`border px-4 py-3 space-y-1 text-sm rounded-lg ${
          result.severity === "warning" ? "border-red-900 bg-red-950 text-red-300" :
          result.severity === "caution" ? "border-yellow-900 bg-yellow-950 text-yellow-300" :
          "border-emerald-900 bg-emerald-950 text-emerald-300"
        }`}>
          <div className="font-semibold">{result.feedback}</div>
          <div className="text-xs opacity-70">Delta vs model: {result.delta > 0 ? "+" : ""}{result.delta}% · Regime: {result.regime}</div>
        </div>
      )}
      {!email && <div className="text-xs text-zinc-500">Sign in to log exposure and track discipline over time.</div>}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Exposure Logger" consequence="Without logging, you cannot build a discipline score or track your performance vs the model." onUnlock={onUnlock}requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Exposure Logger</Label>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// STREAK TRACKER 
// ─────────────────────────────────────────
function StreakTracker({ disciplineData: data, isPro, onUnlock, requiredTier }) {
  const streak = data?.followed ?? 0;
  const total = data?.total ?? 0;
  const streakColor = streak >= 7 ? "text-emerald-400" : streak >= 3 ? "text-yellow-400" : "text-red-400";
  const streakLabel = streak >= 10 ? "Elite Discipline" : streak >= 7 ? "Strong Streak" : streak >= 3 ? "Building Momentum" : streak >= 1 ? "Getting Started" : "No streak yet";

  const inner = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
      <div className="space-y-2 shrink-0">
        <div className={`text-6xl font-bold ${streakColor}`}>{streak}</div>
        <div className={`text-sm font-medium ${streakColor}`}>{streakLabel}</div>
        <div className="text-xs text-zinc-500">consecutive aligned sessions</div>
      </div>
      <div className="flex-1 space-y-3 w-full">
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: Math.min(total, 20) }).map((_, i) => (
            <div key={i} className={`w-6 h-6 rounded-sm border transition-all ${
              i < streak ? "bg-emerald-500 border-emerald-400" : "bg-zinc-800 border-zinc-700"
            }`} />
          ))}
          {total === 0 && <div className="text-xs text-zinc-500">Log your exposure to start building a streak.</div>}
        </div>
        {total > 0 && <div className="text-xs text-zinc-500">{streak}/{total} sessions · Last 20 shown</div>}
        {streak >= 7 && (
          <div className="border border-emerald-800 bg-emerald-950 px-3 py-2 text-emerald-300 text-xs rounded-lg">✓ Consistent discipline — regime-aligned trader</div>
        )}
        {streak === 0 && total > 0 && (
          <div className="border border-red-900 bg-red-950 px-3 py-2 text-red-300 text-xs rounded-lg">⚠ Last session deviated from model — refocus on protocol</div>
        )}
      </div>
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Discipline Streak" consequence="Streak tracking creates daily accountability and reduces impulsive deviation." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
  <CardShell>
    <div className="relative">
      <StreakConfetti streak={streak} />
      <Label>Discipline Streak</Label>
      <p className="text-xs text-zinc-400 mb-4">Consecutive sessions where your exposure aligned with regime recommendation</p>
      {!data ? <div className="text-sm text-zinc-400">Loading streak...</div> : inner}
</div>
    </CardShell>
  );
}

// ─────────────────────────────────────────
// DISCIPLINE PANEL — FIX: uses token + apiFetch
// ─────────────────────────────────────────
function DisciplinePanel({ disciplineData: data, isPro, onUnlock, requiredTier }) {
  const scoreColor = (s) => {
    if (s === null) return "text-zinc-400";
    if (s >= 85) return "text-emerald-400";
    if (s >= 70) return "text-green-400";
    if (s >= 50) return "text-yellow-400";
    if (s >= 30) return "text-orange-400";
    return "text-red-400";
  };
  const inner = data ? (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <div className={`text-6xl font-bold ${scoreColor(data.score)}`}>{data.score !== null ? `${data.score}` : "—"}</div>
          <div className={`text-lg font-medium ${scoreColor(data.score)}`}>{data.label}</div>
          <Bar value={data.score ?? 0} cls={
            (data.score ?? 0) >= 85 ? "bg-emerald-500" : (data.score ?? 0) >= 70 ? "bg-green-500" :
            (data.score ?? 0) >= 50 ? "bg-yellow-500" : (data.score ?? 0) >= 30 ? "bg-orange-500" : "bg-red-500"
          } />
          <div className="text-xs text-zinc-500">{data.summary}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {[
            { l: "Followed", v: data.followed, c: "text-emerald-400" },
            { l: "Total", v: data.total, c: "text-white" },
            { l: "Bonuses", v: `+${data.bonuses ?? 0}`, c: "text-emerald-400" },
            { l: "Penalties", v: `-${data.penalties ?? 0}`, c: "text-red-400" },
          ].map(({ l, v, c }) => (
            <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-3 text-center space-y-1">
              <div className="text-xs text-zinc-500">{l}</div>
              <div className={`text-xl font-semibold ${c}`}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {data.flags?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Recent Flags</div>
          <div className="space-y-2">
            {data.flags.map((flag, i) => (
              <div key={i} className={`border px-4 py-3 text-sm flex justify-between items-center rounded-lg ${
                flag.type === "penalty" ? "border-red-900 bg-red-950 text-red-300" : "border-emerald-900 bg-emerald-950 text-emerald-300"
              }`}>
                <span>{flag.label}</span>
                <span className="text-xs opacity-60">{flag.date} · {flag.regime}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="text-sm text-zinc-400">No data yet. Log your exposure to start building your discipline score.</div>

  );

  if (!isPro)
    return (
      <ProGate label="Discipline Score" consequence="Without discipline tracking, you cannot identify the patterns that are costing you money." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Discipline Score</Label>
      <p className="text-xs text-zinc-400 mb-4">How consistently you follow regime-based risk protocols</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// MISTAKE REPLAY PANEL 
// ─────────────────────────────────────────
const MistakeReplayPanel = memo(function MistakeReplayPanel({ email, coin, token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const isVisible = useLazyPanel(containerRef);

  useEffect(() => {
    if (!email || !isPro || !isVisible) return;
    setLoading(true);
    apiFetch(`/mistake-replay?email=${encodeURIComponent(email)}&coin=${coin}`, token)
      .then((d) => { if (!d.error) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, coin, isPro, token, isVisible]);

  const severityStyle = (s) => {
    if (s === "high") return "border-red-800 bg-red-950 text-red-300";
    if (s === "medium") return "border-orange-800 bg-orange-950 text-orange-300";
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  };

  const inner = data?.replays?.length > 0 ? (
    <div className="space-y-3">
      {data.replays.map((replay, i) => (
        <div key={i} className={`border p-5 space-y-3 rounded-lg ${severityStyle(replay.severity)}`}>
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="text-sm font-semibold">{replay.message}</div>
              <div className="text-xs opacity-70 mt-0.5">{replay.date} · {replay.regime}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 capitalize ${
              replay.severity === "high" ? "border-red-700 text-red-300" :
              replay.severity === "medium" ? "border-orange-700 text-orange-300" : "border-yellow-700 text-yellow-300"
            }`}>{replay.severity}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="text-zinc-400">Your Exposure</div>
              <div className={`font-semibold ${exposureColor(replay.user_exp)}`}>{replay.user_exp}%</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-zinc-400">Model Said</div>
              <div className={`font-semibold ${exposureColor(replay.model_exp)}`}>{replay.model_exp}%</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-zinc-400">Delta</div>
              <div className={`font-semibold ${replay.delta > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {replay.delta > 0 ? "+" : ""}{replay.delta}%
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/10 pt-3">
            <div><span className="text-zinc-400">Hazard at time: </span><span className={riskColor(replay.signals_at_time?.hazard ?? 0)}>{replay.signals_at_time?.hazard ?? "—"}%</span></div>
            <div><span className="text-zinc-400">Shift risk: </span><span className={riskColor(replay.signals_at_time?.shift_risk ?? 0)}>{replay.signals_at_time?.shift_risk ?? "—"}%</span></div>
          </div>
        </div>
      ))}
    </div>
  ) : loading ? (
    <div className="text-sm text-zinc-400">Analysing deviation history...</div>
  ) : (
    <div className="text-sm text-zinc-400">
      {data?.count === 0 ? "No significant deviations detected. Discipline is strong." : "Log exposure over time to generate mistake replay analysis."}
    </div>
  );

  if (!isPro)
    return (
      <div ref={containerRef}>
        <ProGate label="Mistake Replay Engine" consequence="Mistake replay identifies the exact conditions where your decisions cost you money." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
          {inner}
        </ProGate>
      </div>
    );

  return (
    <div ref={containerRef}>
      <CardShell>
        <Label>Mistake Replay Engine</Label>
        <p className="text-xs text-zinc-400 mb-4">Sessions where you deviated from the model during elevated risk conditions</p>
        {inner}
      </CardShell>
    </div>
  );
});

// ─────────────────────────────────────────
// PERFORMANCE PANEL — already had token, kept clean
// ─────────────────────────────────────────
const PerformancePanel = memo(function PerformancePanel({ email, coin, token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !isPro) return;
    setLoading(true);
    apiFetch(`/performance-comparison?email=${encodeURIComponent(email)}&coin=${coin}`, token)
      .then(setData)
      .catch((e) => { if (e?.status !== 403) console.error(e); })
      .finally(() => setLoading(false));
  }, [email, coin, isPro, token]);

  const inner = loading ? (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
            <div className="h-3 w-16 rounded skeleton-shimmer" />
            <div className="h-8 w-20 rounded skeleton-shimmer" style={{ animationDelay: "100ms" }} />
          </div>
        ))}
      </div>
      <div className="h-48 rounded-xl skeleton-shimmer" style={{ animationDelay: "200ms" }} />
    </div>
  ) : data ? (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Your Return",   value: data.user_total_return  !== null ? `${(data.user_total_return ?? 0)  > 0 ? "+" : ""}${data.user_total_return?.toFixed(1)}%`  : "—", color: (data.user_total_return  ?? 0) >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Model Return",  value: data.model_total_return !== null ? `${(data.model_total_return ?? 0) > 0 ? "+" : ""}${data.model_total_return?.toFixed(1)}%` : "—", color: (data.model_total_return ?? 0) >= 0 ? "text-blue-400"    : "text-red-400" },
          { label: "Alpha vs Model",value: data.alpha              !== null ? `${(data.alpha ?? 0)              > 0 ? "+" : ""}${data.alpha?.toFixed(1)}%`              : "—", color: (data.alpha              ?? 0) >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Periods Tracked",value: data.periods ?? "—", color: "text-gray-300" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
            <div className="text-xs text-zinc-400">{label}</div>
            <div className={`text-2xl font-semibold ${color}`}>{value}</div>
          </div>
        ))}
      </div>
      {data.message && <div className="text-xs text-zinc-500 border border-white/5 px-4 py-3 rounded-lg">{data.message}</div>}
      {data.curve?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Cumulative Return Comparison</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.curve}>
              <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
              <XAxis dataKey="period" stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} />
              <YAxis stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} />
              <Tooltip content={<PremiumTooltip formatter={(v, n) => [`${v?.toFixed(1)}%`, n]} labelFormatter={(l) => `Period ${l}`} />} />
              <ReferenceLine y={0} stroke="#27272a" />
              <Line type="monotone" dataKey="user_cum"  stroke="#22c55e" strokeWidth={2} dot={false} name="Your Return" />
              <Line type="monotone" dataKey="model_cum" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Model Return" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.regime_breakdown && Object.keys(data.regime_breakdown).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Performance by Regime</div>
          <div className="space-y-2">
            {Object.entries(data.regime_breakdown).map(([regime, stats]) => (
              <div key={regime} className="flex items-center justify-between border border-white/5 px-4 py-3 rounded-lg">
                <div className={`text-sm font-medium w-36 shrink-0 ${regimeText(regime)}`}>{regime}</div>
                <div className="flex gap-6 text-xs">
                  <span>You: <span className={stats.user_avg >= 0 ? "text-emerald-400" : "text-red-400"}>{stats.user_avg > 0 ? "+" : ""}{stats.user_avg?.toFixed(1)}%</span></span>
                  <span>Model: <span className={stats.model_avg >= 0 ? "text-blue-400" : "text-red-400"}>{stats.model_avg > 0 ? "+" : ""}{stats.model_avg?.toFixed(1)}%</span></span>
                  <span className="text-zinc-500">{stats.count} periods</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {(data.best_regime || data.worst_regime) && (
        <div className="grid grid-cols-2 gap-4">
          {data.best_regime && (
            <div className="border border-emerald-900 bg-emerald-950 p-4 space-y-1 rounded-lg">
              <div className="text-xs text-zinc-400">Best Regime for You</div>
              <div className={`text-sm font-semibold ${regimeText(data.best_regime)}`}>{data.best_regime}</div>
            </div>
          )}
          {data.worst_regime && (
            <div className="border border-red-900 bg-red-950 p-4 space-y-1 rounded-lg">
              <div className="text-xs text-zinc-400">Worst Regime for You</div>
              <div className={`text-sm font-semibold ${regimeText(data.worst_regime)}`}>{data.worst_regime}</div>
            </div>
          )}
        </div>
      )}
    </div>
  ) : (
    <div className="text-sm text-zinc-400">No performance data yet. Log your exposure over multiple periods to begin tracking.</div>
  );

  if (!isPro)
    return (
      <ProGate label="Performance Comparison" consequence="Without performance tracking, you cannot measure whether your decisions are adding or destroying alpha." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        <div className="h-32 bg-zinc-900/40 rounded-xl" />
      </ProGate>
    );

  return (
    <CardShell>
      <Label>Performance Comparison</Label>
      <p className="text-xs text-zinc-400 mb-4">Your actual returns vs following the model — compounded over time</p>
      {inner}
    </CardShell>
  );
});

// ─────────────────────────────────────────
// EDGE PROFILE PANEL 
// ─────────────────────────────────────────
const EdgeProfilePanel = memo(function EdgeProfilePanel({ email, token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const isVisible = useLazyPanel(containerRef);

  useEffect(() => {
    if (!email || !isPro || !isVisible) return;
    setLoading(true);
    apiFetch(`/edge-profile?email=${encodeURIComponent(email)}`, token)
      .then((d) => { if (!d.error) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, isPro, token, isVisible]);

  const perfColor = (perf) => {
    if (perf === "Strong") return "text-emerald-400";
    if (perf === "Good") return "text-green-400";
    if (perf === "Weak") return "text-yellow-400";
    return "text-red-400";
  };

  const inner = !data ? (
    loading
      ? <div className="text-sm text-zinc-400">Building your edge profile...</div>
      : <div className="text-sm text-zinc-400">Log exposure across multiple sessions to unlock your edge profile.</div>
  ) : !data.ready ? (
    <div className="space-y-3">
      <div className="border border-white/5 px-4 py-3 text-sm text-zinc-400 rounded-lg">{data.message}</div>
      <div className="w-full bg-zinc-800 rounded-full h-1">
        <div className="h-1 bg-blue-500 rounded-full transition-all" style={{ width: `${((data.entry_count ?? 0) / 5) * 100}%` }} />
      </div>
      <div className="text-xs text-zinc-500">{data.entry_count ?? 0} / 5 entries to unlock</div>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {data.best_regime && (
          <div className="border border-emerald-900 bg-emerald-950 p-4 space-y-1 rounded-lg">
            <div className="text-xs text-zinc-400">Your Best Regime</div>
            <div className={`text-base font-semibold ${regimeText(data.best_regime)}`}>{data.best_regime}</div>
            <div className="text-xs text-zinc-400">Strongest historical edge</div>
          </div>
        )}
        {data.worst_regime && (
          <div className="border border-red-900 bg-red-950 p-4 space-y-1 rounded-lg">
            <div className="text-xs text-zinc-400">Your Worst Regime</div>
            <div className={`text-base font-semibold ${regimeText(data.worst_regime)}`}>{data.worst_regime}</div>
            <div className="text-xs text-zinc-400">Underperforms here historically</div>
          </div>
        )}
      </div>

      {data.profile && Object.keys(data.profile).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Performance by Regime</div>
          <div className="space-y-2">
            {Object.entries(data.profile).map(([regime, stats]) => (
              <div key={regime} className="border border-white/5 px-4 py-3 flex items-center justify-between gap-4 rounded-lg">
                <div className={`text-sm font-medium w-36 shrink-0 ${regimeText(regime)}`}>{regime}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>{stats.count} sessions</span>
                    <span>WR: {stats.win_rate}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        stats.avg_return >= 2 ? "bg-emerald-500" : stats.avg_return >= 0.5 ? "bg-green-500" :
                        stats.avg_return >= -1 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, 50 + stats.avg_return * 10))}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div className={`text-sm font-semibold ${stats.avg_return >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {stats.avg_return > 0 ? "+" : ""}{stats.avg_return}%
                  </div>
                  <div className={`text-xs ${perfColor(stats.performance)}`}>{stats.performance}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recommendations?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Personalised Recommendations</div>
          {data.recommendations.map((rec, i) => (
            <div key={i} className="border border-white/5 px-4 py-3 text-sm text-gray-300 flex items-start gap-2 rounded-lg">
              <span className="text-blue-400 shrink-0 mt-0.5">→</span>{rec}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!isPro)
    return (
      <div ref={containerRef}>
        <ProGate label="Edge Profile" consequence="Without an edge profile you cannot identify which regimes you consistently outperform in." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
          {inner}
        </ProGate>
      </div>
    );

  return (
    <div ref={containerRef}>
      <CardShell>
        <Label>Edge Profile</Label>
        <p className="text-xs text-zinc-400 mb-4">Your historical performance breakdown by regime type</p>
        {inner}
      </CardShell>
    </div>
  );
});

// ─────────────────────────────────────────
// WEEKLY REPORT PANEL 
// ─────────────────────────────────────────
const WeeklyReportPanel = memo(function WeeklyReportPanel({ email, coin, token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const isVisible = useLazyPanel(containerRef);

  useEffect(() => {
    if (!email || !isPro || !isVisible) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/discipline-score?email=${encodeURIComponent(email)}`, token),
      apiFetch(`/performance-comparison?email=${encodeURIComponent(email)}&coin=${coin}`, token),
    ])
      .then(([discipline, performance]) => setData({ discipline, performance }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, coin, isPro, token, isVisible]);

  const inner = data ? (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Discipline Score", value: data.discipline?.score !== null ? `${data.discipline?.score}` : "—", suffix: "", color: data.discipline?.score >= 70 ? "text-emerald-400" : data.discipline?.score >= 50 ? "text-yellow-400" : "text-red-400", sub: data.discipline?.label ?? "—" },
          { label: "Your Return", value: data.performance?.user_total_return !== null ? `${(data.performance?.user_total_return ?? 0) > 0 ? "+" : ""}${data.performance?.user_total_return?.toFixed(1)}` : "—", suffix: data.performance?.user_total_return !== null ? "%" : "", color: (data.performance?.user_total_return ?? 0) >= 0 ? "text-emerald-400" : "text-red-400", sub: "This period" },
          { label: "Model Return", value: data.performance?.model_total_return !== null ? `${(data.performance?.model_total_return ?? 0) > 0 ? "+" : ""}${data.performance?.model_total_return?.toFixed(1)}` : "—", suffix: data.performance?.model_total_return !== null ? "%" : "", color: "text-blue-400", sub: "If followed model" },
          { label: "Alpha", value: data.performance?.alpha !== null ? `${(data.performance?.alpha ?? 0) > 0 ? "+" : ""}${data.performance?.alpha?.toFixed(1)}` : "—", suffix: data.performance?.alpha !== null ? "%" : "", color: (data.performance?.alpha ?? 0) >= 0 ? "text-emerald-400" : "text-red-400", sub: "vs model" },
        ].map(({ label, value, suffix, color, sub }) => (
          <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
            <div className="text-xs text-zinc-400">{label}</div>
            <div className={`text-2xl font-semibold ${color}`}>{value}{suffix}</div>
            <div className="text-xs text-zinc-500">{sub}</div>
          </div>
        ))}
      </div>

      {data.discipline?.flags?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Notable Events This Period</div>
          {data.discipline.flags.slice(0, 5).map((flag, i) => (
            <div key={i} className={`border px-4 py-2.5 text-xs flex justify-between items-center rounded-lg ${
              flag.type === "penalty" ? "border-red-900 bg-red-950/50 text-red-300" : "border-emerald-900 bg-emerald-950/50 text-emerald-300"
            }`}>
              <span>{flag.label}</span>
              <span className="opacity-60">{flag.date} · {flag.regime}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border border-white/5 px-4 py-3 text-xs text-zinc-400 space-y-1 rounded-lg">
        <div className="font-medium text-gray-400">Period Summary</div>
        <div>{data.performance?.message ?? "Log more sessions to generate a full weekly summary."}</div>
      </div>
    </div>
  ) : loading ? (
    <div className="text-sm text-zinc-400">Loading weekly report...</div>
  ) : (
    <div className="text-sm text-zinc-400">No report data yet. Log exposure to generate your weekly summary.</div>
  );

  if (!isPro)
    return (
      <div ref={containerRef}>
        <ProGate label="Weekly Performance Report" consequence="Weekly reports show whether your discipline is improving or deteriorating over time." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
          {inner}
        </ProGate>
      </div>
    );

  return (
    <div ref={containerRef}>
      <CardShell>
        <Label>Weekly Performance Report</Label>
        <p className="text-xs text-zinc-400 mb-4">Discipline score, returns, and notable events from this period</p>
        {inner}
      </CardShell>
    </div>
  );
});

// ─────────────────────────────────────────
// PORTFOLIO HEALTH SCORE — FIX: uses token + apiFetch
// ─────────────────────────────────────────
function PortfolioHealthScore({ stack, disciplineData, isPro, onUnlock, requiredTier }) {
  const regimeQuality = deriveQuality(stack);
  const disciplineScore = disciplineData?.score ?? null;
  const exposureDelta = Math.abs((stack?.exposure ?? 50) - 50);
  const exposureAlign = Math.max(0, 100 - exposureDelta * 1.5);

  const healthScore = disciplineScore !== null && regimeQuality
    ? Math.round(regimeQuality.score * 0.40 + disciplineScore * 0.35 + exposureAlign * 0.25)
    : regimeQuality ? regimeQuality.score : null;

  const healthColor = healthScore === null ? "text-zinc-400" : healthScore >= 80 ? "text-emerald-400" : healthScore >= 60 ? "text-green-400" : healthScore >= 40 ? "text-yellow-400" : healthScore >= 20 ? "text-orange-400" : "text-red-400";
  const healthLabel = healthScore === null ? "Insufficient data" : healthScore >= 80 ? "Optimal" : healthScore >= 60 ? "Healthy" : healthScore >= 40 ? "Moderate Risk" : healthScore >= 20 ? "Elevated Risk" : "High Risk";
  const healthBarCls = healthScore === null ? "bg-zinc-700" : healthScore >= 80 ? "bg-emerald-500" : healthScore >= 60 ? "bg-green-500" : healthScore >= 40 ? "bg-yellow-500" : healthScore >= 20 ? "bg-orange-500" : "bg-red-500";

  const components = [
    { label: "Regime Quality", value: regimeQuality?.score ?? null, weight: "40%", hint: regimeQuality?.structural ?? "—" },
    { label: "Discipline Score", value: disciplineScore, weight: "35%", hint: disciplineData?.label ?? "Log exposure to unlock" },
    { label: "Exposure Alignment", value: Math.round(exposureAlign), weight: "25%", hint: "vs regime recommendation" },
  ];

  const inner = (
    <div className="space-y-6">
      <div className="flex items-center gap-8">
        <div className="text-center space-y-2 shrink-0">
          <div className={`text-6xl font-bold ${healthColor}`}>{healthScore ?? "—"}</div>
          <div className={`text-sm font-medium ${healthColor}`}>{healthLabel}</div>
          <Bar value={healthScore ?? 0} cls={healthBarCls} />
          <div className="text-xs text-zinc-500">Portfolio Health</div>
        </div>
        <div className="flex-1 space-y-4">
          {components.map(({ label, value, weight, hint }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">{label}</span>
                <div className="flex gap-3">
                  <span className="text-gray-700">{weight}</span>
                  <span className={value === null ? "text-zinc-500" : value >= 70 ? "text-emerald-400" : value >= 50 ? "text-yellow-400" : "text-red-400"}>
                    {value !== null ? `${value}%` : "—"}
                  </span>
                </div>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all ${
                    value === null ? "bg-zinc-700" : value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${value ?? 0}%` }}
                />
              </div>
              <div className="text-xs text-gray-700">{hint}</div>
            </div>
          ))}
        </div>
      </div>
      {healthScore !== null && healthScore < 40 && (
        <div className="border border-red-900 bg-red-950 px-4 py-3 text-red-300 text-sm rounded-lg">
          ⚠ Portfolio health is low. Review regime quality and exposure alignment before adding positions.
        </div>
      )}
      {healthScore !== null && healthScore >= 80 && (
        <div className="border border-emerald-900 bg-emerald-950 px-4 py-3 text-emerald-300 text-sm rounded-lg">
          ✓ Portfolio health is optimal. Conditions are favourable for disciplined position sizing.
        </div>
      )}
    </div>
  );

  // ... continuing PortfolioHealthScore
  if (!isPro)
    return (
      <ProGate label="Portfolio Health Score" consequence="Without a health score you have no single metric to assess your overall trading posture." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Portfolio Health Score</Label>
      <p className="text-xs text-zinc-400 mb-4">Composite score across regime quality, discipline, and exposure alignment</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// ARCHETYPE OVERLAY PANEL (consolidated — replaces both old panels)
// ─────────────────────────────────────────
function ArchetypeOverlayPanel({ coin, email, token, isPro, onUnlock, requiredTier }) {
  const [archetype, setArchetype] = useState("swing");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  const load = useCallback(() => {
    if (!isPro || !coin) return;
    setLoading(true);
    apiFetch(`/archetype-overlay?coin=${coin}&archetype=${archetype}&email=${encodeURIComponent(email || "")}`, token)
      .then((d) => { if (!d.error) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [coin, archetype, email, isPro, token]);

  useEffect(() => { load(); }, [load]);

  const saveArchetype = async () => {
    if (!email) return;
    try {
      await apiFetch("/save-archetype", token, {
        method: "POST",
        body: JSON.stringify({ email, archetype }),
      });
      setSaveMsg("Archetype saved!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch { setSaveMsg("Save failed"); }
  };

  const inner = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {Object.entries(ARCHETYPE_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setArchetype(key)}
            className={`py-3 px-2 rounded-xl text-xs font-medium border transition-all text-center space-y-0.5 ${
              archetype === key ? "bg-white text-black border-white" : "bg-transparent text-zinc-400 border-white/10 hover:border-white/20"
            }`}
          >
            <div>{cfg.label}</div>
          </button>
        ))}
      </div>
      <div className="text-xs text-zinc-500">{ARCHETYPE_CONFIG[archetype]?.description}</div>

      {data && !data.error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
              <div className="text-xs text-zinc-400">Adjusted Exposure</div>
              <div className={`text-2xl font-semibold ${exposureColor(data.adjusted_exposure)}`}>{data.adjusted_exposure}%</div>
              <div className="text-xs text-zinc-500">Base: {data.base_exposure}% × {data.exposure_multiplier}</div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
              <div className="text-xs text-zinc-400">Max Hold</div>
              <div className="text-2xl font-semibold text-white">{data.max_hold_days}d</div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
              <div className="text-xs text-zinc-400">Stop Width</div>
              <div className="text-2xl font-semibold text-white">{data.stop_width_multiplier}x</div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
              <div className="text-xs text-zinc-400">Alert Now?</div>
              <div className={`text-2xl font-semibold ${data.should_alert_now ? "text-red-400" : "text-green-400"}`}>
                {data.should_alert_now ? "YES" : "No"}
              </div>
            </div>
          </div>

          {data.archetype_actions?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Archetype-Specific Actions</div>
              {data.archetype_actions.map((a, i) => (
                <div key={i} className="border border-white/5 px-4 py-3 text-sm text-gray-300 flex items-start gap-2 rounded-lg">
                  <span className="text-blue-400 shrink-0">→</span>{a}
                </div>
              ))}
            </div>
          )}

          <div className="border border-white/5 px-4 py-3 text-xs text-zinc-500 flex gap-4 flex-wrap rounded-lg">
            <span>Sensitivity: <span className="text-gray-300">{data.alert_sensitivity}</span></span>
            <span>Timeframe: <span className="text-gray-300">{data.preferred_timeframe}</span></span>
            <span>Playbook: <span className="text-gray-300">{data.playbook_bias}</span></span>
          </div>
        </>
      )}

      {loading && <div className="text-sm text-zinc-400">Loading archetype overlay...</div>}

      <div className="flex gap-3 items-center">
        <button
          onClick={saveArchetype}
          disabled={!email}
          className="bg-white text-black px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          Save as My Archetype
        </button>
        {saveMsg && <span className="text-xs text-emerald-400">{saveMsg}</span>}
      </div>
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Trader Archetype Overlay" consequence="Without archetype personalization, exposure recommendations don't match your trading style." onUnlock={onUnlock} requiredTier={requiredTier || "institutional"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Trader Archetype Overlay</Label>
      <p className="text-xs text-zinc-400 mb-4">Personalized regime interpretation for your trading style</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// ALERT THRESHOLDS PANEL
// ─────────────────────────────────────────
function AlertThresholdsPanel({ email, token, isPro, onUnlock, requiredTier }) {
  const [thresholds, setThresholds] = useState([]);
  const [coin, setCoin] = useState("BTC");
  const [shiftRisk, setShiftRisk] = useState(70);
  const [exposureChange, setExposureChange] = useState(10);
  const [setupQuality, setSetupQuality] = useState(70);
  const [regimeQuality, setRegimeQuality] = useState(50);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isPro || !email) return;
    apiFetch(`/alert-thresholds?email=${encodeURIComponent(email)}`, token)
      .then((d) => { if (d.thresholds) setThresholds(d.thresholds); })
      .catch(console.error);
  }, [email, isPro, token]);

  const save = async () => {
    if (!email) return;
    setSaving(true);
    try {
      await apiFetch("/alert-thresholds", token, {
        method: "POST",
        body: JSON.stringify({
          email, coin,
          shift_risk_threshold: shiftRisk,
          exposure_change_threshold: exposureChange,
          setup_quality_threshold: setupQuality,
          regime_quality_threshold: regimeQuality,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      const d = await apiFetch(`/alert-thresholds?email=${encodeURIComponent(email)}`, token);
      if (d.thresholds) setThresholds(d.thresholds);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const inner = (
    <div className="space-y-6">
      {saved && (
        <div className="border border-emerald-800 bg-emerald-950 px-4 py-3 text-emerald-300 text-sm rounded-lg">✓ Alert thresholds saved for {coin}.</div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Coin</div>
          <select value={coin} onChange={(e) => setCoin(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2.5 rounded-xl text-sm">
            {SUPPORTED_COINS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {[
          { l: "Shift Risk ≥", v: shiftRisk, s: setShiftRisk },
          { l: "Exposure Δ ≥", v: exposureChange, s: setExposureChange },
          { l: "Setup Quality ≥", v: setupQuality, s: setSetupQuality },
          { l: "Regime Quality ≤", v: regimeQuality, s: setRegimeQuality },
        ].map(({ l, v, s }) => (
          <div key={l} className="space-y-2">
            <div className="text-xs text-zinc-400">{l}</div>
            <input type="number" value={v} onChange={(e) => s(Number(e.target.value))} min={0} max={100} className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2.5 rounded-xl text-sm" />
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving || !email} className="bg-white text-black px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50">
        {saving ? "Saving..." : "Save Thresholds"}
      </button>

      {thresholds.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Current Thresholds</div>
          <div className="space-y-1">
            {thresholds.map((t, i) => (
              <div key={i} className="border border-white/5 px-4 py-2.5 text-xs flex justify-between items-center rounded-lg">
                <span className="font-semibold text-white">{t.coin}</span>
                <div className="flex gap-4 text-zinc-400">
                  <span>Shift≥{t.shift_risk_threshold}%</span>
                  <span>ExpΔ≥{t.exposure_change_threshold}%</span>
                  <span>Setup≥{t.setup_quality_threshold}</span>
                  <span>Quality≤{t.regime_quality_threshold}</span>
                  <span className={t.enabled ? "text-emerald-400" : "text-red-400"}>{t.enabled ? "ON" : "OFF"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!email && <div className="text-xs text-zinc-500">Sign in to configure alert thresholds.</div>}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Dynamic Alert Thresholds" consequence="Without custom alerts, you miss critical regime shifts." onUnlock={onUnlock} requiredTier={requiredTier || "institutional"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Dynamic Alert Thresholds</Label>
      <p className="text-xs text-zinc-400 mb-4">Configure per-coin alert triggers for shift risk, setup quality, and more</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// USER ALERTS INBOX
// ─────────────────────────────────────────
function UserAlertsInbox({ email, token, isPro, onUnlock, requiredTier }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPro || !email) return;
    setLoading(true);
    apiFetch(`/evaluate-alerts?email=${encodeURIComponent(email)}`, token)
      .then((d) => { if (d.alerts) setAlerts(d.alerts); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, isPro, token]);

  const sevStyle = (s) => {
    if (s === "high") return "border-red-800 bg-red-950 text-red-300";
    if (s === "medium") return "border-yellow-800 bg-yellow-950 text-yellow-300";
    if (s === "positive") return "border-emerald-800 bg-emerald-950 text-emerald-300";
    return "border-white/5 text-zinc-400";
  };

  const inner = (
    <div className="space-y-3">
      {loading && <div className="text-sm text-zinc-400">Evaluating alerts...</div>}
      {!loading && alerts.length === 0 && (
        <div className="border border-emerald-900 bg-emerald-950 px-4 py-3 text-emerald-300 text-sm rounded-lg">
          ✓ No active alerts. All conditions within thresholds.
        </div>
      )}
      {alerts.map((a, i) => (
        <div key={i} className={`border rounded-lg p-4 space-y-2 ${sevStyle(a.severity)}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-semibold">{a.coin} — {a.type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
              <div className="text-xs opacity-80 mt-0.5">{a.message}</div>
            </div>
            <span className="text-xs capitalize opacity-60 shrink-0">{a.severity}</span>
          </div>
          {a.action && <div className="text-xs opacity-70">→ {a.action}</div>}
          {a.signals?.length > 0 && (
            <div className="text-xs opacity-60 space-y-0.5 border-t border-white/10 pt-2">
              {a.signals.map((s, j) => <div key={j}>• {s}</div>)}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Alert Inbox" consequence="Without alert evaluation, you miss actionable regime warnings." onUnlock={onUnlock} requiredTier={requiredTier || "pro"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Alert Inbox</Label>
      <p className="text-xs text-zinc-400 mb-4">Active alerts based on your custom thresholds</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// PERFORMANCE LOGGER
// ─────────────────────────────────────────
function PerformanceLogger({ coin, email, token, isPro, onUnlock, requiredTier }) {
  const [userExp, setUserExp] = useState(50);
  const [priceOpen, setPriceOpen] = useState(0);
  const [priceClose, setPriceClose] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const log = async () => {
    if (!email || priceOpen <= 0 || priceClose <= 0) return;
    setLoading(true);
    try {
      const d = await apiFetch("/log-performance", token, {
        method: "POST",
        body: JSON.stringify({ email, coin, user_exposure_pct: userExp, price_open: priceOpen, price_close: priceClose }),
      });
      if (!d.error) setResult(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const inner = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "Your Exposure %", v: userExp, s: setUserExp },
          { l: "Entry Price", v: priceOpen, s: setPriceOpen },
          { l: "Exit Price", v: priceClose, s: setPriceClose },
        ].map(({ l, v, s }) => (
          <div key={l} className="space-y-2">
            <div className="text-xs text-zinc-400">{l}</div>
            <input type="number" value={v} onChange={(e) => s(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
          </div>
        ))}
        <div className="flex items-end">
          <button onClick={log} disabled={loading || !email} className="w-full bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50">
            {loading ? "Logging..." : "Log Period"}
          </button>
        </div>
      </div>
      {result && (
        <div className={`border p-4 text-sm space-y-1 rounded-lg ${result.alpha >= 0 ? "border-emerald-900 bg-emerald-950 text-emerald-300" : "border-red-900 bg-red-950 text-red-300"}`}>
          <div className="font-semibold">Period logged: {result.price_return > 0 ? "+" : ""}{result.price_return}% price move</div>
          <div className="text-xs opacity-80">
            Your return: {result.user_return > 0 ? "+" : ""}{result.user_return}% · Model: {result.model_return > 0 ? "+" : ""}{result.model_return}% · Alpha: {result.alpha > 0 ? "+" : ""}{result.alpha}%
          </div>
          {result.discipline_flags?.length > 0 && (
            <div className="text-xs opacity-60 flex gap-2 flex-wrap pt-1">
              {result.discipline_flags.map((f, i) => (
                <span key={i} className="px-2 py-0.5 border border-white/10 rounded-full">{f.replace(/_/g, " ")}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {!email && <div className="text-xs text-zinc-500">Sign in to log performance.</div>}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Performance Logger" consequence="Without logging trades, you cannot measure alpha vs the model." onUnlock={onUnlock} requiredTier={requiredTier || "essential"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Performance Logger</Label>
      <p className="text-xs text-zinc-400 mb-4">Log trade periods to build your performance comparison and edge profile</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// MODEL VERSION BADGE
// ─────────────────────────────────────────
function ModelVersionBadge({ version, durationMs, lastUpdated }) {
  if (!version) return null;
  return (
    <div className="flex items-center gap-3 text-xs text-zinc-600 border border-white/5 px-4 py-2 rounded-lg">
      <span>Model v{version}</span>
      {durationMs && <><span>·</span><span>Computed in {durationMs}ms</span></>}
      <span>·</span>
      <span>{lastUpdated ? lastUpdated.toLocaleTimeString() : new Date().toLocaleTimeString()}</span>
    </div>
  );
}

// ─────────────────────────────────────────
// SETUP QUALITY PANEL
// ─────────────────────────────────────────
function SetupQualityPanel({ coin, token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPro || !coin) return;
    setLoading(true);
    apiFetch(`/setup-quality?coin=${coin}`, token)
      .then((d) => { if (!d.error) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [coin, isPro, token]);

  function qualityColor(score) {
    if (score >= 80) return "text-emerald-400";
    if (score >= 65) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    if (score >= 35) return "text-orange-400";
    return "text-red-400";
  }

  function chaseColor(v) {
    if (v > 75) return "text-red-400";
    if (v > 50) return "text-yellow-400";
    return "text-green-400";
  }

  const inner = data ? (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-2 text-center">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Setup Quality</div>
          <div className={`text-5xl font-bold ${qualityColor(data.setup_quality_score)}`}>{data.setup_quality_score}</div>
          <div className={`text-sm font-medium ${qualityColor(data.setup_quality_score)}`}>{data.setup_label}</div>
          <Bar value={data.setup_quality_score} cls={data.setup_quality_score >= 65 ? "bg-emerald-500" : data.setup_quality_score >= 40 ? "bg-yellow-500" : "bg-red-500"} />
        </div>
        <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-2">
          <div className="text-xs text-zinc-400">Entry Mode</div>
          <div className="text-xl font-semibold text-white">{data.entry_mode}</div>
          <div className="text-xs text-zinc-500">Current recommendation</div>
        </div>
        <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-2">
          <div className="text-xs text-zinc-400">Chase Risk</div>
          <div className={`text-3xl font-semibold ${chaseColor(data.chase_risk)}`}>{data.chase_risk}%</div>
          <Bar value={data.chase_risk} cls={data.chase_risk > 75 ? "bg-red-500" : data.chase_risk > 50 ? "bg-yellow-500" : "bg-green-500"} />
          <div className="text-xs text-zinc-500">{data.chase_risk > 75 ? "⚠ High — wait for pullback" : data.chase_risk > 50 ? "Moderate" : "Low — entry conditions favorable"}</div>
        </div>
        <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-2">
          <div className="text-xs text-zinc-400">Trend Exhaustion</div>
          <div className={`text-3xl font-semibold ${data.trend_exhaustion > 65 ? "text-red-400" : data.trend_exhaustion > 40 ? "text-yellow-400" : "text-green-400"}`}>{data.trend_exhaustion}%</div>
          <Bar value={data.trend_exhaustion} cls={data.trend_exhaustion > 65 ? "bg-red-500" : data.trend_exhaustion > 40 ? "bg-yellow-500" : "bg-green-500"} />
          <div className="text-xs text-zinc-500">{data.trend_exhaustion > 65 ? "Momentum fading" : "Trend has room"}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "Pullback Quality", v: data.pullback_quality, hint: "Quality of current pullback for entry" },
          { l: "Breakout Quality", v: data.breakout_quality, hint: "Strength of potential breakout" },
          { l: "Volume Confirmation", v: data.volume_confirmation, hint: "Recent volume vs prior" },
          { l: "Range Position", v: data.range_position, hint: `${data.range_position}% through recent range` },
        ].map(({ l, v, hint }) => (
          <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
            <div className="text-xs text-zinc-400">{l}</div>
            <div className={`text-xl font-semibold ${v >= 65 ? "text-emerald-400" : v >= 40 ? "text-yellow-400" : "text-red-400"}`}>{v?.toFixed(1)}%</div>
            <Bar value={v} cls={v >= 65 ? "bg-emerald-500" : v >= 40 ? "bg-yellow-500" : "bg-red-500"} />
            <div className="text-xs text-zinc-500">{hint}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-3">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Optimal Entry Zone</div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-xs text-zinc-500">Entry Low</div><div className="text-lg font-semibold text-white">${data.optimal_entry_zone?.low?.toLocaleString()}</div></div>
            <div><div className="text-xs text-zinc-500">Entry High</div><div className="text-lg font-semibold text-white">${data.optimal_entry_zone?.high?.toLocaleString()}</div></div>
          </div>
          <div className="border-t border-white/5 pt-3">
            <div className="text-xs text-zinc-500">Invalidation Level</div>
            <div className="text-lg font-semibold text-red-400">${data.invalidation_level?.toLocaleString()}</div>
          </div>
          {data.take_profit_zones?.length > 0 && (
            <div className="border-t border-white/5 pt-3">
              <div className="text-xs text-zinc-500 mb-2">Take Profit Zones</div>
              <div className="flex gap-3">
                {data.take_profit_zones.map((tp, i) => (
                  <div key={i} className="text-sm font-semibold text-emerald-400">${tp?.toLocaleString()}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-3">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Stop Guidance</div>
          <div className="space-y-3">
            {[
              { l: "Tight Stop", v: data.stop_guidance?.tight, desc: "Aggressive — for strong setups" },
              { l: "Normal Stop", v: data.stop_guidance?.normal, desc: "Recommended default" },
              { l: "Wide Stop", v: data.stop_guidance?.wide, desc: "For high-conviction holds" },
            ].map(({ l, v, desc }) => (
              <div key={l} className="flex items-center justify-between">
                <div><div className="text-sm text-white font-medium">{l}</div><div className="text-xs text-zinc-500">{desc}</div></div>
                <div className="text-sm font-semibold text-gray-300">${v?.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-3 text-xs text-zinc-500">Normal stop = {data.stop_guidance?.normal_pct}% of current price · ATR-based</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "Extension from 20MA", v: `${data.extension_from_mean_pct}%`, c: Math.abs(data.extension_from_mean_pct) > 3 ? "text-yellow-400" : "text-green-400" },
          { l: "Momentum Slope 1H", v: data.momentum_slope_1h?.toFixed(3), c: data.momentum_slope_1h > 0 ? "text-green-400" : "text-red-400" },
          { l: "Momentum Slope 4H", v: data.momentum_slope_4h?.toFixed(3), c: data.momentum_slope_4h > 0 ? "text-green-400" : "text-red-400" },
        ].map(({ l, v, c }) => (
          <div key={l} className="bg-white/2 border border-white/5 rounded-lg p-3 space-y-1">
            <div className="text-xs text-zinc-400">{l}</div>
            <div className={`text-lg font-semibold ${c}`}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  ) : loading ? (
    <div className="text-sm text-zinc-400">Analysing setup quality...</div>
  ) : (
    <div className="text-sm text-zinc-400">No setup data available</div>
  );

  if (!isPro)
    return (
      <ProGate label="Setup Quality Engine" consequence="Without setup quality, you cannot distinguish good entries from chasing extended moves." onUnlock={onUnlock} requiredTier={requiredTier || "pro"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Setup Quality Engine</Label>
      <p className="text-xs text-zinc-400 mb-4">Entry timing, chase risk, exhaustion, and optimal entry zones</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// OPPORTUNITY RANKING PANEL
// ─────────────────────────────────────────
const OpportunityRankingPanel = memo(function OpportunityRankingPanel({ token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPro) return;
    setLoading(true);
    apiFetch("/opportunity-ranking", token)
      .then((d) => { if (!d.error) setData(d); })
      .catch((e) => { if (e?.status !== 403) console.error(e); })
      .finally(() => setLoading(false));
  }, [isPro, token]);

  function oppColor(score) {
    if (score >= 70) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    if (score >= 30) return "text-orange-400";
    return "text-red-400";
  }

  const inner = loading ? (
    <div className="space-y-3 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 rounded skeleton-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  ) : data ? (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap">
        {data.best_long && (
          <div className="border border-emerald-900 bg-emerald-950 px-4 py-2 rounded-lg">
            <div className="text-xs text-zinc-400">Best Long</div>
            <div className="text-lg font-semibold text-emerald-400">{data.best_long}</div>
          </div>
        )}
        {data.most_defensive && (
          <div className="border border-blue-900 bg-blue-950 px-4 py-2 rounded-lg">
            <div className="text-xs text-zinc-400">Most Defensive</div>
            <div className="text-lg font-semibold text-blue-400">{data.most_defensive}</div>
          </div>
        )}
        {data.avoid?.length > 0 && (
          <div className="border border-red-900 bg-red-950 px-4 py-2 rounded-lg">
            <div className="text-xs text-zinc-400">Avoid</div>
            <div className="text-lg font-semibold text-red-400">{data.avoid.join(", ")}</div>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {(data.rankings || []).map((r, i) => (
          <div key={r.coin} className="border border-white/5 rounded-lg p-4 flex items-center gap-4">
            <div className="text-lg font-bold text-zinc-500 w-8 text-center">#{i + 1}</div>
            <div className="w-16 shrink-0">
              <div className="text-base font-semibold text-white">{r.coin}</div>
              <div className={`text-xs ${r.direction === "bullish" ? "text-green-400" : r.direction === "bearish" ? "text-red-400" : "text-yellow-400"}`}>{r.direction}</div>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${oppColor(r.opportunity_score)}`}>{r.opportunity_score}</div>
                <div className="flex-1">
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${r.opportunity_score >= 70 ? "bg-emerald-500" : r.opportunity_score >= 50 ? "bg-yellow-500" : r.opportunity_score >= 30 ? "bg-orange-500" : "bg-red-500"}`} style={{ width: `${r.opportunity_score}%` }} />
                  </div>
                </div>
              </div>
              <div className="text-xs text-zinc-500">{r.reason}</div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-center shrink-0">
              <div><div className="text-zinc-500">Setup</div><div className={`font-semibold ${r.setup_quality_score >= 60 ? "text-green-400" : "text-yellow-400"}`}>{r.setup_quality_score}</div></div>
              <div><div className="text-zinc-500">Grade</div><div className={`font-semibold ${gradeColor(r.regime_quality_grade)}`}>{r.regime_quality_grade}</div></div>
              <div><div className="text-zinc-500">Chase</div><div className={`font-semibold ${r.chase_risk > 70 ? "text-red-400" : r.chase_risk > 50 ? "text-yellow-400" : "text-green-400"}`}>{r.chase_risk}%</div></div>
            </div>
          </div>
        ))}
      </div>
      {data.rotation_signals?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Rotation Signals</div>
          {data.rotation_signals.map((sig, i) => (
            <div key={i} className="border border-blue-900 bg-blue-950 px-4 py-3 text-blue-300 text-sm rounded-lg">→ {sig}</div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  if (!isPro)
    return (
      <ProGate label="Opportunity Ranking" consequence="Without opportunity ranking, you cannot identify the best risk-adjusted entry across all assets." onUnlock={onUnlock} requiredTier={requiredTier || "pro"}>
        <div className="h-32 bg-zinc-900/40 rounded-xl" />
      </ProGate>
    );

  return (
    <CardShell>
      <Label>Opportunity Ranking</Label>
      <p className="text-xs text-zinc-400 mb-4">Cross-asset opportunity ranking — where is the best entry right now?</p>
      {inner}
    </CardShell>
  );
});

// ─────────────────────────────────────────
// SCENARIOS PANEL
// ─────────────────────────────────────────
const ScenariosPanel = memo(function ScenariosPanel({ coin, token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPro || !coin) return;
    setLoading(true);
    apiFetch(`/scenarios?coin=${coin}`, token)
      .then((d) => { if (!d.error) setData(d); })
      .catch((e) => { if (e?.status !== 403) console.error(e); })
      .finally(() => setLoading(false));
  }, [coin, isPro, token]);

  const scenarioStyle = (name) => {
    if (name === "Bull Case") return { border: "border-emerald-800", bg: "bg-emerald-950", text: "text-emerald-300", bar: "bg-emerald-500" };
    if (name === "Bear Case") return { border: "border-red-800", bg: "bg-red-950", text: "text-red-300", bar: "bg-red-500" };
    return { border: "border-blue-800", bg: "bg-blue-950", text: "text-blue-300", bar: "bg-blue-500" };
  };

  const inner = loading ? (
    <div className="grid md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-48 rounded-xl skeleton-shimmer" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  ) : data ? (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {(data.scenarios || []).map((s) => {
          const st = scenarioStyle(s.name);
          return (
            <div key={s.name} className={`border ${st.border} ${st.bg} rounded-lg p-5 space-y-4`}>
              <div className="flex justify-between items-start">
                <div className={`text-lg font-semibold ${st.text}`}>{s.name}</div>
                <div className={`text-3xl font-bold ${st.text}`}>{s.probability}%</div>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className={`h-2 rounded-full ${st.bar}`} style={{ width: `${s.probability}%` }} />
              </div>
              <div className="text-sm text-gray-300">{s.outcome}</div>
              <div className="border-t border-white/10 pt-3 space-y-2">
                <div className="text-xs text-zinc-400">Exposure</div>
                <div className="text-sm font-medium text-white">{s.exposure}</div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs text-zinc-400">Actions</div>
                {s.actions?.map((a, i) => (
                  <div key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                    <span className={`${st.text} shrink-0`}>→</span>{a}
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-2">
                <div className="text-xs text-zinc-500">Invalidation: {s.invalidation}</div>
              </div>
            </div>
          );
        })}
      </div>
      {data.expected_path && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
            <div className="text-xs text-zinc-400">Expected Path — Next 24H</div>
            <div className="text-sm text-gray-300">{data.expected_path["24h"]}</div>
          </div>
          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
            <div className="text-xs text-zinc-400">Expected Path — Next 7D</div>
            <div className="text-sm text-gray-300">{data.expected_path["7d"]}</div>
          </div>
        </div>
      )}
      {data.invalidation_triggers?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">What Invalidates Base Case</div>
          {data.invalidation_triggers.map((t, i) => (
            <div key={i} className="border border-yellow-900 bg-yellow-950 px-4 py-2 text-yellow-300 text-sm rounded-lg">⚠ {t}</div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  if (!isPro)
    return (
      <ProGate label="Probabilistic Scenarios" consequence="Without scenario analysis, you have no framework for multiple outcomes." onUnlock={onUnlock} requiredTier={requiredTier || "pro"}>
        <div className="h-32 bg-zinc-900/40 rounded-xl" />
      </ProGate>
    );

  return (
    <CardShell>
      <Label>Probabilistic Scenarios</Label>
      <p className="text-xs text-zinc-400 mb-4">Base / Bull / Bear case with probability-weighted outcomes</p>
      {inner}
    </CardShell>
  );
});

// ─────────────────────────────────────────
// INTERNAL DAMAGE PANEL
// ─────────────────────────────────────────
const InternalDamagePanel = memo(function InternalDamagePanel({ coin, token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPro || !coin) return;
    setLoading(true);
    apiFetch(`/internal-damage?coin=${coin}`, token)
      .then((d) => { if (!d.error && d.internal_damage_score !== null) setData(d); })
      .catch((e) => { if (e?.status !== 403) console.error(e); })
      .finally(() => setLoading(false));
  }, [coin, isPro, token]);

  const inner = loading ? (
    <div className="space-y-3 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-4 rounded skeleton-shimmer" style={{ width: `${[85, 65, 75, 55][i]}%`, animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  ) : data ? (
    <div className="space-y-6">
      <div className="flex items-center gap-8">
        <div className="text-center space-y-2 shrink-0">
          <div className={`text-6xl font-bold ${damageColor(data.internal_damage_score)}`}>{data.internal_damage_score}</div>
          <div className={`text-sm font-medium ${damageColor(data.internal_damage_score)}`}>{data.damage_label}</div>
          <Bar value={data.internal_damage_score} cls={data.internal_damage_score >= 70 ? "bg-red-500" : data.internal_damage_score >= 50 ? "bg-orange-500" : data.internal_damage_score >= 30 ? "bg-yellow-500" : "bg-green-500"} />
        </div>
        <div className="flex-1 space-y-3">
          <div className="text-sm text-gray-400">{data.damage_message}</div>
          {Object.entries(data.components || {}).map(([key, val]) => (
            <div key={key} className="flex items-center gap-3">
              <div className="text-xs text-zinc-500 w-40 shrink-0 capitalize">{key.replace(/_/g, " ")}</div>
              <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${val >= 60 ? "bg-red-500" : val >= 35 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, val)}%` }} />
              </div>
              <div className="text-xs text-zinc-400 w-8 text-right">{Math.round(val)}</div>
            </div>
          ))}
        </div>
      </div>
      {data.signals?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Damage Signals ({data.high_severity_count} high severity)</div>
          {data.signals.map((sig, i) => (
            <div key={i} className={`border px-4 py-3 text-sm rounded-lg ${
              sig.severity === "high" ? "border-red-800 bg-red-950 text-red-300" :
              sig.severity === "medium" ? "border-orange-800 bg-orange-950 text-orange-300" :
              "border-yellow-800 bg-yellow-950 text-yellow-300"
            }`}>
              <div className="flex justify-between items-start">
                <span>{sig.message}</span>
                <span className="text-xs opacity-60 capitalize shrink-0 ml-3">{sig.severity}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.signals?.length === 0 && (
        <div className="border border-emerald-900 bg-emerald-950 px-4 py-3 text-emerald-300 text-sm rounded-lg">
          ✓ No internal damage signals detected. Structure intact.
        </div>
      )}
    </div>
  ) : null;

  if (!isPro)
    return (
      <ProGate label="Internal Damage Monitor" consequence="Internal damage often precedes visible regime shifts. Without it, you're blindsided." onUnlock={onUnlock} requiredTier={requiredTier || "pro"}>
        <div className="h-32 bg-zinc-900/40 rounded-xl" />
      </ProGate>
    );

  return (
    <CardShell>
      <Label>Internal Damage Monitor</Label>
      <p className="text-xs text-zinc-400 mb-4">Detects structural weakening before it appears in price</p>
      {inner}
    </CardShell>
  );
});

// ─────────────────────────────────────────
// BEHAVIORAL ALPHA PANEL
// ─────────────────────────────────────────
const BehavioralAlphaPanel = memo(function BehavioralAlphaPanel({ email, token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const isVisible = useLazyPanel(containerRef);

  useEffect(() => {
    if (!isPro || !email || !isVisible) return;
    setLoading(true);
    apiFetch(`/behavioral-alpha?email=${encodeURIComponent(email)}&lookback_days=30`, token)
      .then((d) => { if (!d.error) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, isPro, token, isVisible]);

  function gradeStyle(grade) {
    if (grade === "A") return "text-emerald-400";
    if (grade === "B+" || grade === "B") return "text-green-400";
    if (grade === "C") return "text-yellow-400";
    return "text-red-400";
  }

  const inner = data?.ready ? (
    <div className="space-y-6">
      <div className="flex items-start gap-8">
        <div className="text-center space-y-2 shrink-0">
          <div className={`text-6xl font-bold ${gradeStyle(data.behavior_grade)}`}>{data.behavior_grade}</div>
          <div className={`text-sm font-medium ${gradeStyle(data.behavior_grade)}`}>{data.behavior_label}</div>
        </div>
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/2 border border-white/5 rounded-lg p-3 text-center">
              <div className="text-xs text-zinc-500">Alpha Drag</div>
              <div className="text-xl font-semibold text-red-400">-{data.total_estimated_alpha_drag_pct}%</div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-lg p-3 text-center">
              <div className="text-xs text-zinc-500">Follow Rate</div>
              <div className="text-xl font-semibold text-white">{data.follow_rate}%</div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-lg p-3 text-center">
              <div className="text-xs text-zinc-500">Active Leaks</div>
              <div className="text-xl font-semibold text-orange-400">{data.leaks?.length ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      {data.leaks?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Behavioral Leaks Detected</div>
          {data.leaks.map((leak, i) => (
            <div key={i} className="border border-red-900 bg-red-950/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-semibold text-red-300">{leak.label}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{leak.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-red-400">-{leak.estimated_alpha_drag_pct}%</div>
                  <div className="text-xs text-zinc-500">{leak.frequency}x</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.strengths?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Strengths</div>
          {data.strengths.map((s, i) => (
            <div key={i} className="border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-emerald-300 text-sm flex items-center gap-2 rounded-lg">
              <span className="shrink-0">✓</span>{s}
            </div>
          ))}
        </div>
      )}

      {data.recommendations?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Recommendations</div>
          {data.recommendations.map((r, i) => (
            <div key={i} className="border border-white/5 px-4 py-3 text-sm text-gray-300 flex items-start gap-2 rounded-lg">
              <span className="text-blue-400 shrink-0 mt-0.5">→</span>{r}
            </div>
          ))}
        </div>
      )}
    </div>
  ) : data && !data.ready ? (
    <div className="space-y-3">
      <div className="text-sm text-zinc-400">{data.message}</div>
      <div className="w-full bg-zinc-800 rounded-full h-1">
        <div className="h-1 bg-blue-500 rounded-full" style={{ width: `${((data.log_count || 0) / 3) * 100}%` }} />
      </div>
    </div>
  ) : loading ? (
    <div className="text-sm text-zinc-400">Building behavioral alpha report...</div>
  ) : (
    <div className="text-sm text-zinc-400">Log exposure to start building your behavioral profile.</div>
  );

  if (!isPro)
    return (
      <div ref={containerRef}>
        <ProGate label="Behavioral Alpha Report" consequence="Without behavioral analysis, you cannot identify the specific patterns costing you money." onUnlock={onUnlock} requiredTier={requiredTier || "pro"}>
          {inner}
        </ProGate>
      </div>
    );

  return (
    <div ref={containerRef}>
      <CardShell>
        <Label>Behavioral Alpha Report</Label>
        <p className="text-xs text-zinc-400 mb-4">Identifies specific behavioral leaks and their estimated cost</p>
        {inner}
      </CardShell>
    </div>
  );
});

// ─────────────────────────────────────────
// EVENT RISK OVERLAY PANEL
// ─────────────────────────────────────────
const EventRiskOverlayPanel = memo(function EventRiskOverlayPanel({ coin, token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPro || !coin) return;
    setLoading(true);
    apiFetch(`/event-risk-overlay?coin=${coin}`, token)
      .then((d) => { if (!d.error) setData(d); })
      .catch((e) => { if (e?.status !== 403) console.error(e); })
      .finally(() => setLoading(false));
  }, [coin, isPro, token]);

  const inner = loading ? (
    <div className="space-y-3 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-4 rounded skeleton-shimmer" style={{ width: `${[85, 65, 75, 55][i]}%`, animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  ) : data ? (
    <div className="space-y-6">
      <div className={`border p-5 rounded-lg space-y-2 ${
        data.exposure_adjustment < -15 ? "border-red-800 bg-red-950" :
        data.exposure_adjustment < 0 ? "border-yellow-800 bg-yellow-950" :
        "border-emerald-800 bg-emerald-950"
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <div className={`text-lg font-semibold ${data.exposure_adjustment < -15 ? "text-red-300" : data.exposure_adjustment < 0 ? "text-yellow-300" : "text-emerald-300"}`}>
              {data.adjustment_label}
            </div>
            <div className="text-sm text-gray-300 mt-1">{data.adjustment_message}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-400">Risk Multiplier</div>
            <div className="text-2xl font-bold text-white">{data.event_risk_multiplier}x</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div><div className="text-xs text-zinc-500">Exposure Before</div><div className="text-lg font-semibold text-white">{data.exposure_before_event}%</div></div>
          <div><div className="text-xs text-zinc-500">Adjusted Exposure</div><div className={`text-lg font-semibold ${data.exposure_adjusted < data.exposure_before_event ? "text-yellow-400" : "text-emerald-400"}`}>{data.exposure_adjusted}%</div></div>
        </div>
      </div>
      {data.imminent_events?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Imminent Events (within 48h)</div>
          <div className="grid md:grid-cols-2 gap-3">
            {data.imminent_events.map((e, i) => (
              <div key={i} className={`border rounded-lg p-4 space-y-2 ${e.impact === "High" ? "border-red-900 bg-red-950/50" : "border-yellow-900 bg-yellow-950/50"}`}>
                <div className="flex justify-between items-start">
                  <div className="text-sm font-semibold text-white">{e.name}</div>
                  <div className={`text-xs px-2 py-0.5 rounded-full border ${e.impact === "High" ? "border-red-700 text-red-300" : "border-yellow-700 text-yellow-300"}`}>{e.impact}</div>
                </div>
                <div className="text-xs text-zinc-400">~{e.hours_until}h away · Vol mult: {e.vol_multiplier}x</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.event_guidance?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Event-Specific Guidance</div>
          {data.event_guidance.map((g, i) => (
            <div key={i} className="border border-white/5 px-4 py-3 text-sm text-gray-300 space-y-1 rounded-lg">
              <div className="font-medium text-white">{g.event}</div>
              <div>{g.action}</div>
              <div className="text-xs text-zinc-500">{g.stop_guidance}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  if (!isPro)
    return (
      <ProGate label="Event Risk Overlay" consequence="Without event-aware sizing, you risk being caught by macro volatility." onUnlock={onUnlock} requiredTier={requiredTier || "pro"}>
        <div className="h-32 bg-zinc-900/40 rounded-xl" />
      </ProGate>
    );

  return (
    <CardShell>
      <Label>Event Risk Overlay</Label>
      <p className="text-xs text-zinc-400 mb-4">Dynamic position adjustments based on upcoming macro events</p>
      {inner}
    </CardShell>
  );
});

// ─────────────────────────────────────────
// TRADE PLAN PANEL
// ─────────────────────────────────────────
function TradePlanPanel({ coin, email, token, isPro, onUnlock,   requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accountSize, setAccountSize] = useState(10000);
  const [archetype, setArchetype] = useState("swing");

  const generate = async () => {
    if (!isPro) { onUnlock(); return; }
    setLoading(true);
    try {
      const d = await apiFetch("/trade-plan", token, {
        method: "POST",
        body: JSON.stringify({ email: email || "", coin, account_size: accountSize, strategy_mode: archetype }),
      });
      if (!d.error) setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const inner = (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Account Size (USD)</div>
          <input type="number" value={accountSize} onChange={(e) => setAccountSize(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Trader Archetype</div>
          <select value={archetype} onChange={(e) => setArchetype(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500">
                        {/* continuing TradePlanPanel */}
            {Object.entries(ARCHETYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={generate} disabled={loading} className="w-full bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50">
            {loading ? "Generating..." : "Generate Trade Plan"}
          </button>
        </div>
      </div>

      {data && (
        <div className="space-y-5">
          <div className={`border p-5 rounded-lg space-y-3 ${
            data.bias === "Long" ? "border-emerald-800 bg-emerald-950" :
            data.bias === "Short / Cash" ? "border-red-800 bg-red-950" :
            "border-yellow-800 bg-yellow-950"
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <div className={`text-2xl font-bold ${
                  data.bias === "Long" ? "text-emerald-300" :
                  data.bias === "Short / Cash" ? "text-red-300" : "text-yellow-300"
                }`}>{data.bias}</div>
                <div className="text-xs text-zinc-400 mt-1">{data.archetype} · {data.entry_style}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-400">Allocation Band</div>
                <div className="text-xl font-bold text-white">{data.allocation_band}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div><span className="text-zinc-500">Setup Quality: </span><span className="text-white">{data.setup_quality}</span></div>
              <div><span className="text-zinc-500">Chase Risk: </span><span className={data.chase_risk > 70 ? "text-red-400" : "text-white"}>{data.chase_risk}%</span></div>
              <div><span className="text-zinc-500">Hold: </span><span className="text-white">~{data.time_horizon_days}d</span></div>
            </div>
          </div>

          <div className="bg-white/2 border border-white/5 rounded-lg p-5 space-y-3">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">Entry Tranches</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.tranches?.amounts?.map((amt, i) => (
                <div key={i} className="bg-white/3 border border-white/5 rounded-lg p-3 text-center">
                  <div className="text-xs text-zinc-500">Tranche {i + 1} ({data.tranches.percentages[i]}%)</div>
                  <div className="text-lg font-semibold text-white">${amt?.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-zinc-500">Total deployed: ${data.tranches?.deployed_total?.toLocaleString()} · Adj exposure: {data.adjusted_exposure}%</div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Stop Loss</div>
              <div className="text-xl font-semibold text-red-400">${data.stop?.price?.toLocaleString()}</div>
              <div className="text-xs text-zinc-500">{data.stop?.distance_pct}% away · {data.stop?.type}</div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Risk Per Trade</div>
              <div className="text-xl font-semibold text-white">${data.risk_per_trade?.usd?.toLocaleString()}</div>
              <div className="text-xs text-zinc-500">{data.risk_per_trade?.pct_of_account}% of account</div>
            </div>
          </div>

          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">Profit Taking Rules</div>
            {data.profit_taking?.map((r, i) => (
              <div key={i} className="text-sm text-gray-300 flex items-start gap-2"><span className="text-emerald-400 shrink-0">→</span>{r}</div>
            ))}
          </div>

          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">If-Then Actions</div>
            {data.conditional_actions?.map((ca, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <div className="text-yellow-400">If: {ca.condition}</div>
                <div className="text-white">Then: {ca.action}</div>
              </div>
            ))}
          </div>

          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">Invalidation Conditions</div>
            {data.invalidation?.map((inv, i) => (
              <div key={i} className="text-sm text-red-300 flex items-start gap-2"><span className="text-red-400 shrink-0">✕</span>{inv}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="Trade Plan Generator" consequence="Without a trade plan, you're entering positions without defined risk parameters." onUnlock={onUnlock} requiredTier={requiredTier || "pro"}>
        {inner}
      </ProGate>
    );
  return (
    <CardShell>
      <Label>Trade Plan Generator</Label>
      <p className="text-xs text-zinc-400 mb-4">Complete trade plan with tranches, stops, targets, and if-then actions</p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// WHAT CHANGED PANEL
// ─────────────────────────────────────────
const WhatChangedPanel = memo(function WhatChangedPanel({ token, isPro, onUnlock, requiredTier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPro) return;
    setLoading(true);
    apiFetch("/what-changed?lookback_hours=24", token)
      .then((d) => { if (!d.error) setData(d); })
      .catch((e) => { if (e?.status !== 403) console.error(e); })
      .finally(() => setLoading(false));
  }, [isPro, token]);

  const toneColor = {
    improving: "text-emerald-400",
    deteriorating: "text-red-400",
    mixed: "text-yellow-400",
    stable: "text-zinc-400",
  };

  const inner = loading ? (
    <div className="space-y-3 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-4 rounded skeleton-shimmer" style={{ width: `${[85, 65, 75, 55][i]}%`, animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  ) : data ? (
    <div className="space-y-5">
      <div className={`text-lg font-semibold ${toneColor[data.tone] || "text-zinc-400"}`}>{data.headline}</div>
      <div className="flex gap-3 text-xs">
        <span className="text-emerald-400">{data.upgrades} upgrades</span>
        <span className="text-red-400">{data.downgrades} downgrades</span>
        <span className="text-zinc-500">{data.change_count} total changes</span>
      </div>
      {data.changes?.length > 0 && (
        <div className="space-y-2">
          {data.changes.map((c, i) => (
            <div key={i} className={`border px-4 py-3 flex items-center justify-between rounded-lg ${
              c.severity === "positive" ? "border-emerald-900 bg-emerald-950/50" : "border-red-900 bg-red-950/50"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">{c.coin}</span>
                <span className="text-xs text-zinc-500">{c.timeframe_label}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={regimeText(c.previous)}>{c.previous}</span>
                <span className="text-zinc-500">→</span>
                <span className={regimeText(c.current)}>{c.current}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.changes?.length === 0 && (
        <div className="text-sm text-zinc-400">No regime changes in the last 24 hours.</div>
      )}
      {data.takeaways?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Key Takeaways</div>
          {data.takeaways.map((t, i) => (
            <div key={i} className="text-sm text-gray-300 flex items-start gap-2">
              <span className="text-blue-400 shrink-0">→</span>{t}
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  if (!isPro)
    return (
      <ProGate label="What Changed (24H)" consequence="Without change tracking, you start each session without knowing what shifted." onUnlock={onUnlock} requiredTier={requiredTier || "pro"}>
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-full" />
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
        </div>
      </ProGate>
    );

  return (
    <CardShell>
      <Label>What Changed — Last 24 Hours</Label>
      <p className="text-xs text-zinc-400 mb-4">Regime shifts, upgrades, and downgrades across all assets</p>
      {inner}
    </CardShell>
  );
});

// ─────────────────────────────────────────
// LIVE PRICE TICKER
// ─────────────────────────────────────────
function LivePriceTicker({ activeCoin, onCoinSelect }) {
  const [prices, setPrices] = useState({});
const [changes, setChanges] = useState({});
const [prev, setPrev] = useState({});
const [sparklines, setSparklines] = useState({});


  useEffect(() => {
  const fetchPrices = async () => {
    try {
      const symbols = SUPPORTED_COINS.map((c) => `${c}USDT`);
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`);
      const data = await res.json();
      const p = {}, ch = {};
      data.forEach((item) => {
        const coin = item.symbol.replace("USDT", "");
        p[coin] = parseFloat(item.lastPrice);
        ch[coin] = parseFloat(item.priceChangePercent);
      });
      setPrices((current) => {
        setPrev(current);  // ← captures actual previous
        return p;
      });
      setChanges(ch);
// Sparklines fetched separately after a short delay to avoid rate limiting
setTimeout(() => {
  Promise.all(
    SUPPORTED_COINS.map((c) => {
      const url = new URL("[api.binance.com](https://api.binance.com/api/v3/klines)");
      url.searchParams.set("symbol", `${c}USDT`);
      url.searchParams.set("interval", "1h");
      url.searchParams.set("limit", "24");
      return fetch(url.toString())
        .then((r) => r.ok ? r.json() : [])
        .then((k) => ({ c, data: Array.isArray(k) ? k.map((x) => parseFloat(x[4])) : [] }))
        .catch(() => ({ c, data: [] }));
    })
  ).then((results) => {
    const sp = {};
    results.forEach(({ c, data }) => { sp[c] = data; });
    setSparklines(sp);
  }).catch(() => {});
}, 500);

    } catch (err) { console.error("Price fetch error:", err); }
  };
  fetchPrices();
  const iv = setInterval(fetchPrices, 30_000);
  return () => clearInterval(iv);
}, []);

  const fmt = (price) => {
    if (!price) return "—";
    if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-0.5 flex-nowrap">

      {SUPPORTED_COINS.map((coin) => {
        const price = prices[coin];
        const change = changes[coin];
        const isPos = (change ?? 0) >= 0;
        const isActive = coin === activeCoin;
        const flash = prev[coin] && price && price !== prev[coin];
        return (
          <button
            key={coin}
            onClick={() => onCoinSelect?.(coin)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 shrink-0 border ${
  isActive
    ? "border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.06)]"
    : "border-white/5 hover:border-white/10"
} ${flash ? "animate-pulse" : ""}`}
style={isActive ? { backgroundColor: "#1a1a1d" } : { backgroundColor: "rgba(255,255,255,0.02)" }}

          >
            <span className={`text-xs font-semibold ${isActive ? "text-white" : "text-zinc-300"}`}>{coin}</span>

{sparklines[coin]?.length > 1 && (
  <svg width="28" height="14" className="shrink-0 opacity-80">
    {(() => {
      const d = sparklines[coin];
      const min = Math.min(...d);
      const max = Math.max(...d);
      const range = max - min || 1;
      const pts = d.map((v, i) =>
        `${(i / (d.length - 1)) * 28},${14 - ((v - min) / range) * 12}`
      ).join(" ");
      return (
        <polyline
          points={pts}
          fill="none"
          stroke={isPos ? "#4ade80" : "#f87171"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    })()}
  </svg>
)}

<span className="text-xs text-zinc-400 tabular-nums font-mono">${fmt(price)}</span>

            {change !== undefined && (
              <span className={`text-xs font-medium tabular-nums ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                {isPos ? "+" : ""}{change?.toFixed(2)}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────
// SITE HEADER
// ─────────────────────────────────────────
function SiteHeader({ coin, onCoinSelect, isPro, onUnlock, wsStatus, wsLastHeartbeat, wsConnectionCount }) {

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-14 gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-6 h-6 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">ChainPulse</span>
            <span className="text-xs text-zinc-600 hidden sm:block">Quant</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "Home", href: "/" },
              { label: "Dashboard", href: "/app" },
              { label: "Pricing", href: "/pricing" },
              { label: "Methodology", href: "/methodology" },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors rounded-xl hover:bg-white/4">
                {label}
              </a>
            ))}
          </nav>
{/* Command palette hint */}
<button
  onClick={() => {
    const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
    window.dispatchEvent(e);
  }}
  className="hidden md:flex items-center gap-1.5 text-xs text-zinc-600 border border-zinc-800 px-2.5 py-1 rounded-lg hover:border-zinc-600 hover:text-zinc-400 transition-colors"
  title="Open command palette"
>
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
  <span>⌘K</span>
</button>

          <div className="flex items-center gap-3 shrink-0">
            {wsStatus && wsStatus !== "disconnected" ? (
  <LiveStatusIndicator status={wsStatus} lastHeartbeat={wsLastHeartbeat} connectionCount={wsConnectionCount} />
) : (
  <div className="hidden sm:flex items-center gap-2">
    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span>Live</span>
    </div>
    {wsConnectionCount && wsConnectionCount > 0 && (
      <div className="text-[10px] text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded-full">
        {wsConnectionCount.toLocaleString()} online
      </div>
    )}
  </div>
)}


            {isPro ? (
              <span className="text-xs text-emerald-400 border border-emerald-900/60 bg-emerald-950/40 px-3 py-1.5 rounded-xl">Pro Active</span>
            ) : (
              <button onClick={onUnlock} className="bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors shadow-sm">View Plans</button>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-white/4 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-6 py-2">
          <LivePriceTicker activeCoin={coin} onCoinSelect={onCoinSelect} />
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────
// EMAIL CAPTURE
// ─────────────────────────────────────────
function EmailCapture({ onEmailSet }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    const email = input.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
if (!email || !emailRegex.test(email)) { setError("Enter a valid email address."); return; }
if (email.length > 254) { setError("Email address is too long."); return; }
    setLoading(true);
    setError(null);
    try {
      await fetch(`${BACKEND}/subscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      setDone(true);
      if (typeof window !== "undefined") localStorage.setItem("cp_email", email);
      onEmailSet(email);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div className="border border-emerald-800 bg-emerald-950 px-6 py-4 text-emerald-300 text-sm rounded-2xl">✓ Daily regime brief confirmed. Check your inbox.</div>
  );

  return (
    <CardShell>
      <div className="space-y-1">
        <div className="text-sm font-medium text-white">Get the daily regime brief</div>
        <div className="text-xs text-zinc-400">Regime verdict, shift risk, and directive — delivered every morning. Free.</div>
      </div>
      <div className="flex gap-2">
        <input type="email" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="your@email.com" className="flex-1 bg-zinc-800 border border-zinc-700 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-zinc-500 placeholder-zinc-600" />
        <button onClick={submit} disabled={loading} className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 whitespace-nowrap">
          {loading ? "..." : "Get Brief"}
        </button>
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
    </CardShell>
  );
}

// ─────────────────────────────────────────
// ADVANCED ANALYTICS
// ─────────────────────────────────────────
function AdvancedAnalytics({ children, isPro }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full border border-white/5 px-6 py-4 flex justify-between items-center hover:border-zinc-600 transition-colors rounded-2xl">
        <div className="text-left space-y-0.5">
          <div className="text-sm font-medium text-white">Advanced Analytics</div>
          <div className="text-xs text-zinc-400">Correlation · Heatmap · Transition matrix · Timeline · Breadth · Risk events</div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {!isPro && <span className="text-xs text-zinc-500 flex items-center gap-1"><Lock />Some require Pro</span>}
          <svg className={`w-4 h-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────
// TODAY PANEL
// ─────────────────────────────────────────
function TodayPanel({ stack, decision, isPro, onUnlock, requiredTier }) {
  if (!stack) return null;
  const execLabel = stack.execution?.label ?? "—";
  const exposure = stack.exposure ?? 0;
  const shiftRisk = stack.shift_risk ?? 0;
  const regimeAge = stack.regime_age_hours ?? 0;

  return (
    <CardShell>
      <div className="flex items-center justify-between">
        <Label>Today at a glance</Label>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`rounded-lg p-4 space-y-1 border ${
  execLabel?.includes("Risk-Off") ? "border-red-900/50 bg-red-950/20" :
  execLabel?.includes("Risk-On") ? "border-emerald-900/50 bg-emerald-950/20" :
  "border-yellow-900/40 bg-yellow-950/10"
}`}>
  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Regime</div>
  <div className={`text-lg font-semibold ${regimeText(execLabel)}`}>{execLabel}</div>
  <div className="text-xs text-zinc-600">{regimeAge.toFixed(1)}h active</div>
</div>

        <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Exposure</div>
          {isPro ? (
            <div className={`text-lg font-semibold tabular-nums ${exposureColor(exposure)}`}>{exposure}%</div>
          ) : (
            <div className="text-lg font-semibold text-zinc-700 blur-sm select-none">00%</div>
          )}
          <div className="text-xs text-zinc-600">recommended</div>
        </div>
        <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Shift Risk</div>
          {isPro ? (
            <div className={`text-lg font-semibold tabular-nums ${riskColor(shiftRisk)}`}>{shiftRisk}%</div>
          ) : (
            <div className="text-lg font-semibold text-zinc-700 blur-sm select-none">00%</div>
          )}
          <div className="text-xs text-zinc-600">deterioration signal</div>
        </div>
        <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-1">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Directive</div>
          {isPro && decision ? (
            <div className="text-lg font-semibold text-white">{decision.directive}</div>
          ) : (
            <button onClick={onUnlock} className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"><Lock />Essential</button>
          )}
          <div className="text-xs text-zinc-600">today's action</div>
        </div>
      </div>
    </CardShell>
  );
}

// ─────────────────────────────────────────
// PRO MODAL
// ─────────────────────────────────────────
// ─────────────────────────────────────────
// PRO MODAL — MULTI-TIER
// ─────────────────────────────────────────
function ProModal({ onClose, email }) {
  const [selectedTier, setSelectedTier] = useState("pro");
  const [billingCycle, setBillingCycle] = useState("annual");
  const [loading, setLoading] = useState(false);
  const [showValue, setShowValue] = useState(true);

  const tiers = {
    essential: {
      name: "Essential", monthlyPrice: 39, annualPrice: 29, annualTotal: 348,
      badge: null, color: "text-blue-400", borderActive: "border-blue-500",
      features: [
        "Full regime stack (all timeframes)",
        "Exposure recommendation % — regime-adjusted",
        "Shift risk warnings",
        "Hazard assessment",
        "Playbook recommendations",
        "Survival curve",
        "Decision engine directive",
        "Funding rates + open interest",
        "CSV export — exposure log and performance",
      ],
      description: "Complete regime intelligence for disciplined traders.",
    },
    pro: {
      name: "Pro", monthlyPrice: 79, annualPrice: 59, annualTotal: 708,
      badge: "MOST POPULAR", color: "text-emerald-400", borderActive: "border-emerald-500",
      features: [
        "Everything in Essential",
        "Setup quality scoring + entry zones",
        "Probabilistic scenarios (Bull/Base/Bear)",
        "Internal damage monitor",
        "Behavioral alpha leak detection",
        "Trade plan generator with tranches",
        "Historical analog matching",
        "PnL impact estimator",
        "Drawdown simulator",
        "Mistake replay engine",
        "AI Regime Analyst narrative",
        "Backtesting engine (5 strategies)",
        "Monte Carlo VaR simulation",
        "Kelly Criterion position sizer",
        "Comparison mode (side-by-side assets)",
      ],
      description: "Full analytical suite for serious traders managing real capital.",
    },
    institutional: {
      name: "Institutional", monthlyPrice: 149, annualPrice: 119, annualTotal: 1428,
      badge: null, color: "text-purple-400", borderActive: "border-purple-500",
      features: [
        "Everything in Pro",
        "REST API access (1,000 req/day)",
        "Up to 3 API keys with usage tracking",
        "Custom per-coin alert thresholds",
        "Custom regime score boundaries",
        "Trader archetype overlay",
        "Priority alert delivery (1hr cooldown)",
        "Webhook delivery + HMAC signatures",
        "Up to 5 webhook endpoints",
        "Delivery logs with retry status",
      ],
      description: "For power users and teams who need API access and full customization.",
    },
  };

  const tier = tiers[selectedTier];
  const price = billingCycle === "annual" ? tier.annualPrice : tier.monthlyPrice;
  const savingsPct = Math.round((1 - tier.annualPrice / tier.monthlyPrice) * 100);

  const checkout = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing_cycle: billingCycle, tier: selectedTier, email: email || undefined }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="bg-zinc-950 border border-white/8 rounded-2xl max-w-2xl w-full p-8 space-y-6 relative shadow-2xl shadow-black/50">
        <button onClick={onClose} aria-label="Close modal" className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {showValue ? (
          <div className="space-y-6">
            <div className="space-y-2 pr-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Label>ChainPulse Pro</Label>
              </div>
              <h2 className="text-2xl font-semibold leading-tight">
                One avoided drawdown pays for years of Pro
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                For traders managing $5,000+, a single 3% avoided over-exposure event saves $150 — more than four months of Essential.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "📊", title: "Exposure Modeling",    desc: "Know exactly how much to deploy in every regime"     },
                { icon: "⚡", title: "Shift Risk Alerts",     desc: "Get warned before deterioration hits price"          },
                { icon: "🎯", title: "Daily Directive",       desc: "One clear action — Increase, Trim, or Defensive"     },
                { icon: "🔬", title: "Setup Quality",         desc: "Know if now is a good entry or a chase"              },
                { icon: "🤖", title: "AI Regime Analyst",     desc: "Plain English explanation of current conditions"     },
                { icon: "📉", title: "Backtesting Engine",    desc: "See how any strategy performed across regimes"       },
                { icon: "🛡️", title: "Trade Plan Generator", desc: "Entry zones, stops, tranches — generated instantly"  },
                { icon: "🧠", title: "Behavioral Tracking",   desc: "Find the exact patterns that cost you money"         },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-white/2 border border-white/5">
                  <span className="text-xl shrink-0">{icon}</span>
                  <div>
                    <div className="text-xs font-semibold text-white">{title}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowValue(false)}
              className="w-full bg-white text-black py-4 rounded-xl font-semibold hover:bg-zinc-100 hover:-translate-y-[1px] transition-all text-sm shadow-lg"
            >
              See Pricing →
            </button>
            <div className="text-center text-zinc-600 text-xs">7-day free trial · Cancel anytime · Instant access</div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2 pr-6">
              <button onClick={() => setShowValue(true)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1 mb-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <h2 className="text-2xl font-semibold leading-tight tracking-tight">Choose your edge</h2>
              <p className="text-zinc-500 text-sm leading-relaxed">Institutional-grade regime intelligence for every level of trader.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "monthly", label: "Monthly", sub: "$" + tier.monthlyPrice + "/mo" },
                { key: "annual",  label: "Annual",  sub: "$" + tier.annualPrice  + "/mo", badge: "SAVE " + savingsPct + "%" },
              ].map(({ key, label, sub, badge }) => (
                <button key={key} onClick={() => setBillingCycle(key)} className={`py-3 rounded-xl text-sm font-medium border transition-all relative ${billingCycle === key ? "bg-white text-black border-white" : "bg-transparent text-zinc-400 border-white/10 hover:border-white/20"}`}>
                  {badge && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">{badge}</div>}
                  <div>{label}</div>
                  <div className="text-xs font-normal opacity-70">{sub}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Object.entries(tiers).map(([key, t]) => (
                <button key={key} onClick={() => setSelectedTier(key)} className={`py-4 px-3 rounded-xl border transition-all text-center space-y-1 relative ${selectedTier === key ? `${t.borderActive} bg-white/5` : "border-white/10 hover:border-white/20"}`}>
                  {t.badge && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">{t.badge}</div>}
                  <div className={`text-sm font-semibold ${selectedTier === key ? t.color : "text-zinc-400"}`}>{t.name}</div>
                  <div className="text-lg font-bold text-white">${billingCycle === "annual" ? t.annualPrice : t.monthlyPrice}<span className="text-xs text-zinc-500 font-normal">/mo</span></div>
                  {billingCycle === "annual" && <div className="text-[10px] text-zinc-600">${t.annualTotal}/yr</div>}
                </button>
              ))}
            </div>

            <div className="text-sm text-zinc-400">{tier.description}</div>

            <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-3 max-h-52 overflow-y-auto">
              {tier.features.map((text) => (
                <div key={text} className="flex items-center gap-3 text-sm text-zinc-300">
                  <span className="text-emerald-400 shrink-0">→</span>{text}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button onClick={checkout} disabled={loading} className="w-full bg-white text-black py-4 rounded-xl font-semibold hover:bg-zinc-100 hover:-translate-y-[1px] transition-all disabled:opacity-50 text-sm shadow-lg">
                {loading ? "Redirecting..." : billingCycle === "annual" ? "Start " + tier.name + " — $" + tier.annualTotal + "/year" : "Start " + tier.name + " — $" + tier.monthlyPrice + "/month"}
              </button>
              <div className="text-center text-zinc-600 text-xs">7-day risk-free evaluation · Cancel anytime · Instant access</div>
            </div>

            <div className="border-t border-white/5 pt-4 text-center">
              <div className="text-xs text-zinc-600">For swing traders managing $5,000+</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// FEATURE 1 — WEBSOCKET HOOK
// ─────────────────────────────────────────────────────────
function useRegimeWebSocket({ coin, token, isPro, onUpdate }) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const backoff = useRef(1000);
  const [status, setStatus] = useState("disconnected");
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const [connectionCount, setConnectionCount] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/ws/stats`, {
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (data.active_connections !== undefined) {
        setConnectionCount(data.active_connections);
      }
    } catch {}
  }, [token]);

  const connect = useCallback(() => {
    if (!isPro || !coin || !token) return;
    const wsUrl = `${BACKEND.replace(/^https?/, (m) => m === "https" ? "wss" : "ws")}/ws/regime/${coin}?token=${token}`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        setStatus("connected");
        backoff.current = 1000;
        fetchStats();
      };
      ws.onmessage = (evt) => {
  const raw = evt.data;
  if (raw === "pong") return;
  try {
    const msg = JSON.parse(raw);
    if (msg.type === "heartbeat") {
      setLastHeartbeat(new Date(msg.timestamp));
      ws.send("ping");
    } else if (msg.type === "regime_snapshot" || msg.type === "regime_update") {
      // Fire toast on regime change
      if (msg.type === "regime_update" && msg.data) {
        const newLabel = msg.data.execution?.label;
        const shiftRisk = msg.data.shift_risk ?? 0;
        if (newLabel && shiftRisk > 70) {
          emitToast({
            type: shiftRisk > 80 ? "critical" : "warning",
            title: `⚠ High Shift Risk — ${msg.data.coin ?? ""}`,
            message: `${newLabel} · ${shiftRisk}% deterioration probability`,
            duration: shiftRisk > 80 ? 10000 : 6000,
          });
        }
      }
      if (onUpdate) onUpdate(msg.data);
    }
  } catch {}
};

      ws.onerror = () => { setStatus("reconnecting"); };
      ws.onclose = () => {
        setStatus("reconnecting");
        reconnectTimer.current = setTimeout(() => {
          backoff.current = Math.min(backoff.current * 2, 30000);
          connect();
        }, backoff.current);
      };
    } catch { setStatus("disconnected"); }
  }, [coin, token, isPro, onUpdate, fetchStats]);

  useEffect(() => {
    if (!isPro) return;
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect, isPro]);

  return { status, lastHeartbeat, connectionCount };
}

function LiveStatusIndicator({ status, lastHeartbeat, connectionCount }) {
  if (status === "disconnected") return null;
  const secondsAgo = lastHeartbeat ? Math.round((Date.now() - lastHeartbeat.getTime()) / 1000) : null;
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${
          status === "connected" ? "bg-emerald-400 animate-pulse" :
          status === "reconnecting" ? "bg-yellow-400 animate-pulse" : "bg-zinc-600"
        }`} />
        <span className={
          status === "connected" ? "text-emerald-400" :
          status === "reconnecting" ? "text-yellow-400" : "text-zinc-500"
        }>
          {status === "connected" ? "Live" : status === "reconnecting" ? "Reconnecting..." : "Offline"}
        </span>
      </div>
      {secondsAgo !== null && <span className="text-zinc-600">Updated {secondsAgo}s ago</span>}
      {connectionCount !== null && <span className="text-zinc-600">{connectionCount.toLocaleString()} users live</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// FEATURE 2 — AI NARRATIVE
// ─────────────────────────────────────────────────────────
const AINarrativePanel = memo(function AINarrativePanel({ coin, token, isPro, onUnlock }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchNarrative = useCallback(() => {
    if (!isPro || !coin) return;
    setLoading(true);
    apiFetch(`/ai-narrative?coin=${coin}`, token)
      .then((d) => { if (!d.error) setData(d); })
      .catch((e) => { if (e?.status !== 403) console.error(e); })
      .finally(() => setLoading(false));
  }, [coin, token, isPro]);

  useEffect(() => { fetchNarrative(); }, [fetchNarrative]);

  const minutesAgo = data?.generated_at
    ? Math.round((Date.now() - new Date(data.generated_at).getTime()) / 60000)
    : null;

  const inner = loading ? (
    <div className="space-y-3 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-4 rounded skeleton-shimmer" style={{ width: `${[95, 85, 90, 70, 80][i]}%`, animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  ) : !data ? null : !data.available ? (
    <div className="border border-zinc-800 bg-zinc-900/40 px-5 py-4 rounded-xl text-sm text-zinc-400">
      AI narrative is not configured on this deployment. OpenAI integration required.
    </div>
  ) : (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-full">
            AI — {data.model}
          </span>
          {minutesAgo !== null && (
            <span className="text-xs text-zinc-600">
              Updated {minutesAgo < 1 ? "just now" : `${minutesAgo}m ago`}
            </span>
          )}
        </div>
        <button
          onClick={fetchNarrative}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-white border border-zinc-700 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Regenerating..." : "↺ Regenerate"}
        </button>
      </div>
      <div className="space-y-3">
        {data.narrative?.split("\n\n").filter(Boolean).map((para, i) => (
          <p key={i} className="text-sm text-zinc-300 leading-relaxed">{para}</p>
        ))}
      </div>
      {data.regime_context && (
        <div className="flex flex-wrap gap-2 pt-2">
          {[
            ["Macro", data.regime_context.macro],
            ["Trend", data.regime_context.trend],
            ["Execution", data.regime_context.execution],
            ["Hazard", `${data.regime_context.hazard}%`],
            ["Shift Risk", `${data.regime_context.shift_risk}%`],
          ].map(([k, v]) => (
            <span key={k} className="text-[10px] border border-zinc-700 bg-zinc-900/60 px-2 py-1 rounded-full text-zinc-400">
              {k}: {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (!isPro)
    return (
      <ProGate label="AI Regime Analyst" consequence="Get a 3-paragraph AI-generated narrative explaining current regime conditions and what to do." onUnlock={onUnlock} requiredTier="pro">
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-full" />
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          <div className="h-4 bg-zinc-800 rounded w-5/6" />
        </div>
      </ProGate>
    );

  return (
    <CardShell>
      <Label>AI Regime Analyst</Label>
      {inner}
    </CardShell>
  );
});

// ─────────────────────────────────────────────────────────
// FEATURE 3 — ON-CHAIN INTELLIGENCE
// ─────────────────────────────────────────────────────────
const OnChainIntelligencePanel = memo(function OnChainIntelligencePanel({ coin, token, isEssential, isPro, onUnlock }) {
  const [funding, setFunding] = useState(null);
  const [oi, setOi] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEssential || !coin) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/funding-rates/${coin}`, token).catch(() => null),
      apiFetch(`/open-interest/${coin}`, token).catch(() => null),
    ]).then(([f, o]) => {
      if (f && !f.error) setFunding(f);
      if (o && !o.error) setOi(o);
    }).catch((e) => { if (e?.status !== 403) console.error(e); })
    .finally(() => setLoading(false));
  }, [coin, token, isEssential]);

  const inner = (
    <div className="space-y-5">
      {loading && (
        <div className="space-y-3 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 rounded skeleton-shimmer" style={{ width: `${[85, 65, 75, 55][i]}%`, animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      )}

      {!loading && funding && (
        <div className={`border rounded-xl p-5 space-y-3 ${fundingSignalBorder(funding.signal)}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Funding Rate</div>
              <div className={`text-3xl font-bold ${fundingSignalColor(funding.signal)}`}>
                {funding.annualized_pct?.toFixed(1)}%
                <span className="text-sm font-normal text-zinc-400 ml-1">annualized</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className={`text-xs px-2 py-0.5 rounded-full border inline-block capitalize ${
                funding.signal === "overleveraged_longs" ? "border-red-700 text-red-300" :
                funding.signal === "overleveraged_shorts" ? "border-emerald-700 text-emerald-300" :
                "border-yellow-700 text-yellow-300"
              }`}>
                {funding.signal?.replace(/_/g, " ")}
              </div>
              <div className="text-xs text-zinc-500 capitalize">{funding.sentiment?.replace(/_/g, " ")}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-zinc-500">8h rate: </span><span className="text-white">{funding.current_rate_pct?.toFixed(4)}%</span></div>
            <div><span className="text-zinc-500">8-period avg: </span><span className="text-white">{funding.avg_rate_8period_pct?.toFixed(4)}%</span></div>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">{funding.interpretation}</p>
        </div>
      )}

      {!loading && oi && (
        <div className="border border-white/10 bg-white/2 rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Open Interest</div>
              <div className="text-2xl font-bold text-white">${oi.current_oi_usd_millions?.toFixed(1)}M</div>
            </div>
            <div className={`text-lg font-bold flex items-center gap-1 ${oi.oi_change_24h_pct > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {oi.oi_change_24h_pct > 0 ? "↑" : "↓"}
              {Math.abs(oi.oi_change_24h_pct)?.toFixed(1)}%
              <span className="text-xs text-zinc-500 font-normal ml-1">24h</span>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            <span className="text-zinc-400 capitalize">{oi.oi_signal?.replace(/_/g, " ")}</span>
            {" · "}{oi.current_oi_contracts?.toLocaleString()} contracts
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">{oi.interpretation}</p>
        </div>
      )}

      {!loading && !funding && !oi && isEssential && (
        <div className="text-sm text-zinc-500 text-center py-4">No on-chain data available.</div>
      )}
    </div>
  );

  if (!isEssential)
    return (
      <ProGate label="On-Chain Intelligence" consequence="Funding rates and open interest reveal leverage positioning before price reacts." onUnlock={onUnlock} requiredTier="essential">
        <div className="h-24 bg-zinc-900/40 rounded-xl" />
      </ProGate>
    );

  return (
    <CardShell>
      <Label>On-Chain Intelligence</Label>
      {inner}
    </CardShell>
  );
});


// ─────────────────────────────────────────────────────────
// FEATURE 4 — BACKTESTING ENGINE
// ─────────────────────────────────────────────────────────
const BacktestingEnginePanel = memo(function BacktestingEnginePanel({ coin: propCoin, token, isPro, onUnlock }) {
  const [coin, setCoin] = useState(propCoin || "BTC");
  const [days, setDays] = useState(90);
  const [strategy, setStrategy] = useState("follow_model");
  const [data, setData] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("single");
  const containerRef = useRef(null);
  const isVisible = useLazyPanel(containerRef);

  useEffect(() => { setCoin(propCoin || "BTC"); }, [propCoin]);

  const runBacktest = async () => {
    setLoading(true);
    try {
      if (view === "compare") {
        const d = await apiFetch(`/backtest-compare/${coin}?days=${days}`, token);
        if (!d.error) setCompareData(d);
      } else {
        const d = await apiFetch(`/backtest/${coin}?days=${days}&strategy=${strategy}`, token);
        if (!d.error) setData(d);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const r = data?.results;

  const inner = (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Coin</div>
          <select value={coin} onChange={(e) => setCoin(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2.5 rounded-xl text-sm">
            {SUPPORTED_COINS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Period</div>
          <div className="flex gap-1">
            {BACKTEST_DAYS.map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${days === d ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 border border-zinc-700"}`}>{d}d</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">View</div>
          <div className="flex gap-1">
            {["single", "compare"].map((v) => (
              <button key={v} onClick={() => setView(v)} className={`flex-1 py-2 rounded-lg text-xs capitalize font-medium transition-colors ${view === v ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 border border-zinc-700"}`}>{v}</button>
            ))}
          </div>
        </div>
        <div className="flex items-end">
          <button onClick={runBacktest} disabled={loading} className="w-full bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50">
            {loading ? "Running..." : "Run Backtest"}
          </button>
        </div>
      </div>

      {view === "single" && (
        <div className="flex flex-wrap gap-2">
          {BACKTEST_STRATEGIES.map((s) => (
            <button key={s.key} onClick={() => setStrategy(s.key)} className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${strategy === s.key ? "bg-white text-black border-white" : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {view === "single" && r && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">Total Return</div>
              <div className={`text-3xl font-bold ${r.total_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>{r.total_return_pct > 0 ? "+" : ""}{r.total_return_pct?.toFixed(1)}%</div>
              <div className="text-xs text-zinc-500">${r.initial_capital?.toLocaleString()} → ${r.final_capital?.toLocaleString()}</div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">vs Benchmark</div>
              <div className="text-2xl font-bold text-blue-400">{r.benchmark_return_pct > 0 ? "+" : ""}{r.benchmark_return_pct?.toFixed(1)}%</div>
              <div className={`text-xs font-medium ${r.alpha_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>Alpha: {r.alpha_pct > 0 ? "+" : ""}{r.alpha_pct?.toFixed(1)}%</div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">Max Drawdown</div>
              <div className="text-2xl font-bold text-red-400">-{r.max_drawdown_pct?.toFixed(1)}%</div>
              <div className="text-xs text-zinc-500">Sharpe: {r.sharpe_ratio?.toFixed(2)}</div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">Win Rate</div>
              <div className={`text-2xl font-bold ${r.win_rate_pct >= 50 ? "text-emerald-400" : "text-red-400"}`}>{r.win_rate_pct?.toFixed(1)}%</div>
              <div className="text-xs text-zinc-500">{r.total_trades} trades</div>
            </div>
          </div>

          {data.equity_curve?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Equity Curve vs Benchmark</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.equity_curve}>
                  <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 9 }} tickFormatter={(v) => v ? new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""} />
                  <YAxis stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} />
                  <Tooltip content={<PremiumTooltip formatter={(v, n) => [`$${v?.toLocaleString()}`, n]} labelFormatter={(l) => l ? new Date(l).toLocaleDateString() : ""} />} />
                  <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} name="Strategy" />
                  <Line type="monotone" dataKey="benchmark" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Benchmark" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.regime_breakdown && Object.keys(data.regime_breakdown).length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Performance by Regime</div>
              {Object.entries(data.regime_breakdown).map(([regime, stats]) => (
                <div key={regime} className="flex items-center justify-between border border-white/5 px-4 py-2.5 rounded-lg text-xs">
                  <span className="font-medium" style={{ color: REGIME_CHART_COLORS[regime] || "#71717a" }}>{regime}</span>
                  <span className="text-zinc-400">{stats.hours}h</span>
                  <span className={stats.strategy_avg_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {stats.strategy_avg_return_pct > 0 ? "+" : ""}{(stats.strategy_avg_return_pct * 100).toFixed(3)}% avg
                  </span>
                </div>
              ))}
            </div>
          )}

          {data.recent_trades?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Recent Trades</div>
              {data.recent_trades.slice(0, 8).map((t, i) => (
                <div key={i} className="flex items-center justify-between border border-white/5 px-4 py-2 rounded-lg text-xs">
                  <span className="text-zinc-400">{new Date(t.timestamp).toLocaleDateString()}</span>
                  <span style={{ color: REGIME_CHART_COLORS[t.regime] || "#71717a" }}>{t.regime}</span>
                  <span className="text-white">{t.from_exposure}% → {t.to_exposure}%</span>
                </div>
              ))}
            </div>
          )}

          {data.disclaimer && <p className="text-[10px] text-zinc-600 leading-relaxed">{data.disclaimer}</p>}
        </div>
      )}

      {view === "compare" && compareData && (
        <div className="space-y-4">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">All Strategies Ranked</div>
          {(compareData.strategies || [])
            .sort((a, b) => (b.results?.total_return_pct || 0) - (a.results?.total_return_pct || 0))
            .map((s, i) => {
              const sr = s.results;
              if (!sr) return null;
              return (
                <div key={s.strategy} className="border border-white/5 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-zinc-500">#{i + 1}</span>
                      <div>
                        <div className="text-sm font-semibold text-white capitalize">{s.strategy.replace(/_/g, " ")}</div>
                        <div className="text-xs text-zinc-500">{s.strategy_description}</div>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${sr.total_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {sr.total_return_pct > 0 ? "+" : ""}{sr.total_return_pct?.toFixed(1)}%
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div><span className="text-zinc-500">Alpha: </span><span className={sr.alpha_pct >= 0 ? "text-emerald-400" : "text-red-400"}>{sr.alpha_pct > 0 ? "+" : ""}{sr.alpha_pct?.toFixed(1)}%</span></div>
                    <div><span className="text-zinc-500">Drawdown: </span><span className="text-red-400">-{sr.max_drawdown_pct?.toFixed(1)}%</span></div>
                    <div><span className="text-zinc-500">Sharpe: </span><span className="text-white">{sr.sharpe_ratio?.toFixed(2)}</span></div>
                    <div><span className="text-zinc-500">Win rate: </span><span className="text-white">{sr.win_rate_pct?.toFixed(1)}%</span></div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );

  if (!isPro)
    return (
      <div ref={containerRef}>
        <ProGate label="Backtesting Engine" consequence="Test how different strategies performed across historical regime conditions." onUnlock={onUnlock} requiredTier="pro">
          <div className="h-32 bg-zinc-900/40 rounded-xl" />
        </ProGate>
      </div>
    );

  return (
    <div ref={containerRef}>
      <CardShell>
        <Label>Backtesting Engine</Label>
        <p className="text-xs text-zinc-400 mb-4">Simulate strategy performance across historical regime conditions</p>
        {inner}
      </CardShell>
    </div>
  );
});

// ─────────────────────────────────────────────────────────
// FEATURES 5 & 6 — PORTFOLIO RISK ENGINE
// ─────────────────────────────────────────────────────────
function MonteCarloTab({ coin, token }) {
  const [exposure, setExposure] = useState(50);
  const [accountSize, setAccountSize] = useState(10000);
  const [horizon, setHorizon] = useState(7);
  const [simulations, setSimulations] = useState(5000);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const d = await apiFetch(
        `/monte-carlo-var?coin=${coin}&exposure_pct=${exposure}&account_size=${accountSize}&horizon_days=${horizon}&simulations=${simulations}`,
        token, { method: "POST" }
      );
      if (!d.error) setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Exposure %</div>
          <input type="number" value={exposure} onChange={(e) => setExposure(Number(e.target.value))} min={1} max={200} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Account Size ($)</div>
          <input type="number" value={accountSize} onChange={(e) => setAccountSize(Number(e.target.value))} min={100} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Horizon (days)</div>
          <div className="flex gap-1">
            {[1, 3, 7, 14, 30].map((h) => (
              <button key={h} onClick={() => setHorizon(h)} className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-colors ${horizon === h ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-700"}`}>{h}d</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Simulations</div>
          <div className="flex gap-1">
            {[1000, 5000, 10000].map((s) => (
              <button key={s} onClick={() => setSimulations(s)} className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-colors ${simulations === s ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-700"}`}>{s >= 1000 ? `${s / 1000}k` : s}</button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={run} disabled={loading} className="bg-white text-black px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50">
        {loading ? `Running ${simulations.toLocaleString()} simulations...` : "Run Monte Carlo"}
      </button>

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-red-900 bg-red-950/30 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">VaR 95% ({horizon}d)</div>
              <div className="text-3xl font-bold text-red-400">{data.value_at_risk?.var_95_pct?.toFixed(1)}%</div>
              <div className="text-sm text-red-300">-${data.value_at_risk?.var_95_usd?.toLocaleString()}</div>
            </div>
            <div className="border border-red-800 bg-red-950/50 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">VaR 99% ({horizon}d)</div>
              <div className="text-3xl font-bold text-red-500">{data.value_at_risk?.var_99_pct?.toFixed(1)}%</div>
              <div className="text-sm text-red-300">-${data.value_at_risk?.var_99_usd?.toLocaleString()}</div>
            </div>
          </div>

          {data.outcome_distribution && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Outcome Distribution</div>
              {[
                { label: "Worst 5%", value: data.outcome_distribution.worst_5pct, color: "#ef4444" },
                { label: "P25", value: data.outcome_distribution.p25, color: "#f87171" },
                { label: "Median", value: data.outcome_distribution.median_pct, color: "#facc15" },
                { label: "P75", value: data.outcome_distribution.p75, color: "#4ade80" },
                { label: "Best 5%", value: data.outcome_distribution.best_5pct, color: "#10b981" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-3 text-xs">
                  <span className="text-zinc-500 w-16 shrink-0">{label}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-zinc-800 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${Math.min(100, Math.abs(value || 0) * 5)}%`, backgroundColor: color }} />
                    </div>
                    <span style={{ color }} className="w-14 text-right font-medium">{(value || 0) > 0 ? "+" : ""}{value?.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.loss_probabilities && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Any loss", value: data.loss_probabilities.any_loss_pct },
                { label: "> 5% loss", value: data.loss_probabilities.loss_gt_5pct },
                { label: "> 10% loss", value: data.loss_probabilities.loss_gt_10pct },
                { label: "> 20% loss", value: data.loss_probabilities.loss_gt_20pct },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-3 space-y-1">
                  <div className="text-xs text-zinc-500">{label}</div>
                  <div className={`text-xl font-semibold ${value > 30 ? "text-red-400" : value > 15 ? "text-yellow-400" : "text-green-400"}`}>{value?.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-zinc-500 leading-relaxed">{data.interpretation}</p>
        </div>
      )}
    </div>
  );
}

function KellyTab({ coin, token }) {
  const [winRate, setWinRate] = useState(55);
  const [avgWin, setAvgWin] = useState(3);
  const [avgLoss, setAvgLoss] = useState(2);
  const [accountSize, setAccountSize] = useState(10000);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch(
        `/kelly-criterion?coin=${coin}&win_rate=${winRate / 100}&avg_win_pct=${avgWin}&avg_loss_pct=${avgLoss}&account_size=${accountSize}`,
        token
      );
      if (!d.error) setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [coin, token, winRate, avgWin, avgLoss, accountSize]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetch_, 500);
    return () => clearTimeout(debounceRef.current);
  }, [fetch_]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="text-xs text-zinc-400">Win Rate</div>
            <span className="text-sm font-medium text-white">{winRate}%</span>
          </div>
          <input type="range" min={10} max={90} step={1} value={winRate} onChange={(e) => setWinRate(Number(e.target.value))} className="w-full accent-white" />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Avg Win %</div>
          <input type="number" value={avgWin} onChange={(e) => setAvgWin(Number(e.target.value))} min={0.1} step={0.1} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Avg Loss %</div>
          <input type="number" value={avgLoss} onChange={(e) => setAvgLoss(Number(e.target.value))} min={0.1} step={0.1} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Account Size ($)</div>
          <input type="number" value={accountSize} onChange={(e) => setAccountSize(Number(e.target.value))} min={100} className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      {loading && <div className="text-xs text-zinc-500">Calculating...</div>}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Full Kelly", pct: data.kelly_fractions?.full_kelly_pct, usd: data.position_sizes?.full_kelly_usd, isRec: false },
              { label: "Half Kelly", pct: data.kelly_fractions?.half_kelly_pct, usd: data.position_sizes?.recommended_usd, isRec: true },
              { label: "Quarter Kelly", pct: data.kelly_fractions?.half_kelly_pct ? data.kelly_fractions.half_kelly_pct / 2 : null, usd: data.position_sizes?.recommended_usd ? data.position_sizes.recommended_usd / 2 : null, isRec: false },
            ].map(({ label, pct, usd, isRec }) => (
              <div key={label} className={`rounded-xl p-5 space-y-2 border ${isRec ? "border-white bg-white/8" : "border-white/10 bg-white/2"}`}>
                <div className="text-xs text-zinc-400">{label}</div>
                <div className={`text-2xl font-bold ${isRec ? "text-white" : "text-zinc-300"}`}>{pct?.toFixed(1)}%</div>
                <div className={`text-sm ${isRec ? "text-zinc-300" : "text-zinc-500"}`}>${usd?.toLocaleString()}</div>
                {isRec && <div className="text-[10px] text-emerald-400 uppercase tracking-widest">Recommended</div>}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">{data.interpretation}</p>
        </div>
      )}
    </div>
  );
}

function PortfolioRiskEnginePanel({ coin, token, isPro, onUnlock }) {
  const [activeTab, setActiveTab] = useState("montecarlo");

  if (!isPro)
    return (
      <ProGate label="Portfolio Risk Engine" consequence="Quantify exactly how much capital is at risk under different market scenarios." onUnlock={onUnlock} requiredTier="pro">
        <div className="h-32 bg-zinc-900/40 rounded-xl" />
      </ProGate>
    );

  return (
    <CardShell>
      <Label>Portfolio Risk Engine</Label>
      <div className="flex gap-2">
        {[{ key: "montecarlo", label: "Monte Carlo VaR" }, { key: "kelly", label: "Kelly Criterion" }].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${activeTab === t.key ? "bg-white text-black border-white" : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === "montecarlo" && <MonteCarloTab coin={coin} token={token} />}
      {activeTab === "kelly" && <KellyTab coin={coin} token={token} />}
    </CardShell>
  );
}

// ─────────────────────────────────────────────────────────
// FEATURE 8 — CSV EXPORT BUTTON
// ─────────────────────────────────────────────────────────
function ExportButton({ url, filename, token, label = "Export CSV" }) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const fullUrl = url.startsWith("http") ? url : `${BACKEND}${url}`;
      const res = await fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) { console.error(e); }
    finally { setDownloading(false); }
  };

  return (
    <button
      onClick={download}
      disabled={downloading}
      className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition-colors ${downloading ? "border-zinc-700 text-zinc-500 cursor-not-allowed" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"}`}
    >
      {downloading ? (
        <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Downloading...</>
      ) : (
        <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>{label}</>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// FEATURE 10 — CUSTOM REGIME THRESHOLDS
// ─────────────────────────────────────────────────────────
function CustomRegimeThresholdsPanel({ email, token, isInstitutional, onUnlock }) {
  const [thresholds, setThresholds] = useState({
    strong_risk_on_min: 35,
    risk_on_min: 15,
    risk_off_max: -15,
    strong_risk_off_max: -35,
  });
  const [usingDefaults, setUsingDefaults] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isInstitutional || !email) return;
    setLoading(true);
    apiFetch(`/api/v1/regime-thresholds?email=${encodeURIComponent(email)}`, token)
      .then((d) => {
        if (d.thresholds) {
          setThresholds(d.thresholds);
          setUsingDefaults(d.using_defaults ?? true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email, token, isInstitutional]);

  const save = async () => {
    if (!email) return;
    setSaving(true);
    try {
      await apiFetch(
        `/api/v1/regime-thresholds?email=${encodeURIComponent(email)}&strong_risk_on_min=${thresholds.strong_risk_on_min}&risk_on_min=${thresholds.risk_on_min}&risk_off_max=${thresholds.risk_off_max}&strong_risk_off_max=${thresholds.strong_risk_off_max}`,
        token, { method: "POST" }
      );
      setUsingDefaults(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const getPreviewLabel = (score) => {
    if (score >= thresholds.strong_risk_on_min) return { label: "Strong Risk-On", color: "text-emerald-400" };
    if (score >= thresholds.risk_on_min) return { label: "Risk-On", color: "text-green-400" };
    if (score <= thresholds.strong_risk_off_max) return { label: "Strong Risk-Off", color: "text-red-500" };
    if (score <= thresholds.risk_off_max) return { label: "Risk-Off", color: "text-red-400" };
    return { label: "Neutral", color: "text-yellow-400" };
  };

  const SLIDER_CONFIG = [
    { key: "strong_risk_on_min", label: "Strong Risk-On minimum", min: 15, max: 60, step: 1, hint: "Scores above this → Strong Risk-On" },
    { key: "risk_on_min", label: "Risk-On minimum", min: 5, max: 40, step: 1, hint: "Scores above this (but below Strong) → Risk-On" },
    { key: "risk_off_max", label: "Risk-Off maximum", min: -40, max: -5, step: 1, hint: "Scores below this (but above Strong) → Risk-Off" },
    { key: "strong_risk_off_max", label: "Strong Risk-Off maximum", min: -60, max: -15, step: 1, hint: "Scores below this → Strong Risk-Off" },
  ];

  const inner = (
    <div className="space-y-6">
      {loading && <div className="text-sm text-zinc-400">Loading thresholds...</div>}
      {saved && <div className="border border-emerald-800 bg-emerald-950 px-4 py-3 text-emerald-300 text-sm rounded-lg">✓ Custom thresholds saved.</div>}
      <div className="flex items-center gap-2">
        <span className={`text-xs px-3 py-1 rounded-full border ${usingDefaults ? "border-zinc-700 text-zinc-400" : "border-emerald-700 text-emerald-400 bg-emerald-950/40"}`}>
          {usingDefaults ? "Using defaults" : "Custom thresholds active"}
        </span>
      </div>
      <div className="space-y-5">
        {SLIDER_CONFIG.map(({ key, label, min, max, step, hint }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-xs text-zinc-400">{label}</div>
              <div className="text-sm font-medium text-white">{thresholds[key]}</div>
            </div>
            <input type="range" min={min} max={max} step={step} value={thresholds[key]} onChange={(e) => setThresholds((prev) => ({ ...prev, [key]: Number(e.target.value) }))} className="w-full accent-white" />
            <div className="flex justify-between text-xs text-zinc-600"><span>{min}</span><span className="text-zinc-500">{hint}</span><span>{max}</span></div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="text-xs text-zinc-400 uppercase tracking-widest">Live Classification Preview</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[60, 30, 5, -5, -30, -60].map((score) => {
            const { label, color } = getPreviewLabel(score);
            return (
              <div key={score} className="bg-white/2 border border-white/5 rounded-lg p-3 text-center space-y-1">
                <div className="text-xs text-zinc-500">Score: {score}</div>
                <div className={`text-xs font-semibold ${color}`}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>
      <button onClick={save} disabled={saving || !email} className="bg-white text-black px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50">
        {saving ? "Saving..." : "Save Thresholds"}
      </button>
      {!email && <div className="text-xs text-zinc-500">Sign in to save custom thresholds.</div>}
    </div>
  );

  if (!isInstitutional)
    return (
      <ProGate label="Custom Regime Thresholds" consequence="Tune exactly where regime boundaries are drawn for your trading style." onUnlock={onUnlock} requiredTier="institutional">
        <div className="h-24 bg-zinc-900/40 rounded-xl" />
      </ProGate>
    );

  return (
    <CardShell>
      <Label>Custom Regime Thresholds</Label>
      <p className="text-xs text-zinc-400 mb-4">Adjust the score boundaries that define each regime state</p>
      {inner}
    </CardShell>
  );
}

async function captureRegimeSnapshot(coin, execLabel, exposure, shiftRisk, decision) {
  const text = [
    `ChainPulse Regime Snapshot — ${new Date().toLocaleString()}`,
    `Asset: ${coin}`,
    `Regime: ${execLabel}`,
    `Exposure: ${exposure}%`,
    `Shift Risk: ${shiftRisk}%`,
    decision ? `Directive: ${decision.directive} (Score: ${decision.score})` : "",
    ``,
    `chainpulse.pro`,
  ].filter(Boolean).join("\n");

  try {
    await navigator.clipboard.writeText(text);
    emitToast({
      type: "success",
      title: "Snapshot copied",
      message: "Regime summary copied to clipboard.",
      duration: 3000,
    });
  } catch {
    emitToast({
      type: "info",
      title: "Snapshot",
      message: "Copy: " + text.split("\n")[1],
      duration: 5000,
    });
  }
}


// ─────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────
export default function Dashboard() {
  const [stack, setStack] = useState(null);
  const [latest, setLatest] = useState(null);
  const [curveData, setCurveData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [overview, setOverview] = useState([]);
  const [breadth, setBreadth] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [volEnv, setVolEnv] = useState(null);
  const [transitions, setTransitions] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [riskEvents, setRiskEvents] = useState([]);
  const [decision, setDecision] = useState(null);
  const [disciplineData, setDisciplineData] = useState(null);
  const [coin, setCoin] = useState("BTC");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [proSuccess, setProSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState("");
  const [activeTier, setActiveTier] = useState("free");
  const isEssentialActive = hasTier(activeTier, "essential");
const isProActive       = hasTier(activeTier, "pro");
const isInstitutionalActive = hasTier(activeTier, "institutional");
const isEssential    = isEssentialActive;
const isProTier      = isProActive;
const isInstitutional = isInstitutionalActive;
  const prevShiftRiskRef = useRef(0);
const isProActiveRef = useRef(false);
const abortControllerRef = useRef(null);

// ── Keyboard shortcuts ──
useEffect(() => {
  const handler = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if (e.metaKey || e.ctrlKey) return;
    const coinMap = { "1": "BTC", "2": "ETH", "3": "SOL", "4": "BNB", "5": "AVAX", "6": "LINK", "7": "ADA" };
    if (coinMap[e.key]) { e.preventDefault(); setCoin(coinMap[e.key]); }
    if (e.key === "u" || e.key === "U") { e.preventDefault(); setShowModal(true); }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
// Feature 1: WebSocket
const handleWsUpdate = useCallback((newStack) => {
  if (newStack) setStack(newStack);
}, []);
const { status: wsStatus, lastHeartbeat: wsLastHeartbeat, connectionCount: wsConnectionCount } = useRegimeWebSocket({
  coin,
  token,
  isPro: isProActive,
  onUpdate: handleWsUpdate,
});

  useEffect(() => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  const urlEmail = params.get("email");
  const successFlag = params.get("success");
  const urlTier = params.get("tier");
  if (urlToken) { saveToken(urlToken); setToken(urlToken); }
  else { const stored = getToken(); if (stored) setToken(stored); }
  if (urlEmail) setEmail(urlEmail);
  else { const storedEmail = localStorage.getItem("cp_email"); if (storedEmail) setEmail(storedEmail); }
  if (successFlag === "true") {
    setProSuccess(true);
    if (urlTier) setActiveTier(urlTier);
  }
  // Clean URL
  if (urlToken || successFlag) {
    window.history.replaceState({}, "", "/app");
  }
}, []);

  const fetchData = useCallback(async (selectedCoin, currentToken) => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  abortControllerRef.current = new AbortController();

  try {
    const headers = {};
    if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
    const res = await fetch(`${BACKEND}/dashboard?coin=${selectedCoin}`, {
      headers,
      signal: abortControllerRef.current.signal,
    });
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();
    setStack(data.stack || null);
    if (data.stack?.tier) setActiveTier(data.stack.tier);
    else if (data.tier) setActiveTier(data.tier);
    setLatest(data.latest || null);
    setCurveData(data.curve || []);
    setHistoryData(data.history || []);
    setOverview(data.overview || []);
    setBreadth(data.breadth || null);
    setConfidence(data.confidence || null);
    setVolEnv(data.volEnv || null);
    setTransitions(data.transitions || null);
    setCorrelation(data.correlation || null);
    setRiskEvents(data.events || []);
    setLastUpdated(new Date());

    if (data.stack?.shift_risk > 75) {
      const prevShiftRisk = prevShiftRiskRef.current ?? 0;
      if (data.stack.shift_risk > prevShiftRisk + 10) {
        emitToast({
          type: data.stack.shift_risk > 85 ? "critical" : "warning",
          title: `Shift Risk Elevated — ${data.stack.coin}`,
          message: `${data.stack.shift_risk}% · ${data.stack.execution?.label ?? "Unknown regime"}`,
          duration: 7000,
        });
        if (data.stack.shift_risk > 85 && typeof window !== "undefined") {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const tone = (freq, start, dur, gain = 0.25) => {
              const osc = ctx.createOscillator();
              const g = ctx.createGain();
              osc.connect(g);
              g.connect(ctx.destination);
              osc.frequency.value = freq;
              osc.type = "sine";
              g.gain.setValueAtTime(0, start);
              g.gain.linearRampToValueAtTime(gain, start + 0.01);
              g.gain.exponentialRampToValueAtTime(0.001, start + dur);
              osc.start(start);
              osc.stop(start + dur);
            };
            tone(880, ctx.currentTime, 0.15, 0.25);
            tone(660, ctx.currentTime + 0.18, 0.15, 0.20);
            tone(440, ctx.currentTime + 0.36, 0.25, 0.18);
          } catch {}
        }
      }
    }
    prevShiftRiskRef.current = data.stack?.shift_risk ?? 0;

  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("Dashboard fetch error:", err);
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
  isProActiveRef.current = isProActive;
}, [isProActive]);

useEffect(() => {
  setLoading(true);
  fetchData(coin, token);
  const iv = setInterval(() => {
    fetchData(coin, token);
  }, isProActiveRef.current ? 300_000 : REFRESH_MS);
  return () => clearInterval(iv);
}, [coin, token, fetchData]);


useEffect(() => {
  if (!email || !token || !stack || stack.pro_required) return;
  apiFetch(`/discipline-score?email=${encodeURIComponent(email)}`, token)
    .then((d) => { if (!d.error) setDisciplineData(d); })
    .catch(console.error);
}, [email, token, stack]);

  const onUnlock = useCallback(() => setShowModal(true), []);
// Daily return visit tracking
useEffect(() => {
  if (typeof window === "undefined") return;
  const lastVisit = localStorage.getItem("cp_last_visit");
  const today = new Date().toDateString();
  if (lastVisit && lastVisit !== today) {
    const daysSince = Math.floor(
      (new Date(today) - new Date(lastVisit)) / (1000 * 60 * 60 * 24)
    );
    const timer = setTimeout(() => {
      if (daysSince === 1) {
        emitToast({
          type: "success",
          title: "Welcome back!",
          message: "Regime conditions have updated since your last visit.",
          duration: 4000,
        });
      } else if (daysSince > 2) {
        emitToast({
          type: "info",
          title: `${daysSince} days since your last check`,
          message: "Significant regime changes may have occurred.",
          duration: 5000,
        });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }
  localStorage.setItem("cp_last_visit", today);
}, []);



  if (loading) return (
  <div className="min-h-screen bg-black">
    <div className="h-14 bg-zinc-950/80 border-b border-white/5" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-5">
      {/* Verdict skeleton */}
      <div className="bg-zinc-950/60 border border-white/10 rounded-2xl px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-zinc-800 skeleton-shimmer" />
          <div className="h-5 w-64 rounded skeleton-shimmer" />
        </div>
      </div>
      {/* Today panel skeleton */}
      <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-2">
              <div className="h-2.5 w-16 rounded skeleton-shimmer" />
              <div className="h-6 w-20 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
      {/* Hero grid skeleton */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-8 space-y-4">
          <div className="h-2.5 w-32 rounded skeleton-shimmer" />
          <div className="h-20 w-28 rounded skeleton-shimmer" />
          <div className="h-1 w-full rounded skeleton-shimmer" />
        </div>
        <div className="md:col-span-2">
          <RegimeStackSkeleton />
        </div>
      </div>
      {/* Stats skeleton */}
      <StatsGridSkeleton />
      {/* More panels */}
      <CardSkeleton rows={4} />
      <CardSkeleton rows={3} />
    </div>
  </div>
);


  if (!stack || stack.message) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-gray-400">
      <div className="text-center space-y-3">
        <div>No regime data available yet.</div>
        <div className="text-sm text-zinc-500">Model is initialising. Run /update-all to seed data.</div>
      </div>
    </div>
  );

  const isPro = !stack.pro_required;
  const exposure = stack.exposure ?? 0;
  const shiftRisk = stack.shift_risk ?? 0;
  const alignment = stack.alignment ?? 0;
  const direction = stack.direction ?? "mixed";
  const regimeAge = stack.regime_age_hours ?? 0;
  const maturity = stack.trend_maturity ?? null;
  const survival = stack.survival ?? null;
  const hazard = stack.hazard ?? null;
  const percentile = stack.percentile ?? null;
  const execLabel = stack.execution?.label ?? null;
  const avgDuration = stack.avg_regime_duration_hours ?? 48;
  const maturityLabel = maturity > 75 ? "Overextended" : maturity > 50 ? "Late Phase" : maturity > 25 ? "Mid Phase" : "Early Phase";

  return (
  <main id="main-content" className="min-h-screen text-white" style={{ backgroundColor: "#0a0a0b" }}>

    {showModal && <ProModal onClose={() => setShowModal(false)} email={email} />}
    {/* Screen reader live announcements */}
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {stack
        ? `Current regime: ${stack.execution?.label ?? "Unknown"}. Shift risk: ${stack.shift_risk ?? 0} percent.`
        : "Loading regime data."
      }
    </div>

    {/* Global overlays */}
    <ToastContainer />
    <CommandPalette onCoinSelect={setCoin} onUnlock={onUnlock} />
    <KeyboardShortcutsModal />
    <OnboardingTour onComplete={() => {}} />

    {/* Upgrade nudge for free users */}
    <UpgradeNudgeStrip isPro={isPro} isProTier={isProTier} onUnlock={onUnlock} />


      {/* ── SITE HEADER (replaces inline header) ── */}
      <SiteHeader
  coin={coin}
  onCoinSelect={setCoin}
  isPro={isPro}
  onUnlock={onUnlock}
  wsStatus={isProTier ? wsStatus : null}
  wsLastHeartbeat={isProTier ? wsLastHeartbeat : null}
  wsConnectionCount={isProTier ? wsConnectionCount : null}
/>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-5">

        {/* ── Pro success banner ── */}
        {proSuccess && (
                    <div className="border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 px-5 py-3.5 rounded-lg text-sm flex items-center gap-2">
    		 <span className="text-emerald-400">✓</span>
    {activeTier ? tierName(activeTier) + " access activated. Welcome to ChainPulse." : "Pro access activated. Welcome to ChainPulse."}
  </div>
)}
        <SessionExpiryWarning tokenCreatedAt={stack?.token_created_at} />

        {/* ── Model Version Badge ── */}
        <ModelVersionBadge version={stack.model_version} durationMs={stack.computation_ms} lastUpdated={lastUpdated} />

       


        {/* ── TODAY PANEL ── */}
        <TodayPanel stack={stack} decision={decision} isPro={isPro} onUnlock={onUnlock} />

        {/* ── Free tier banner ── */}
        {!isPro && <FreeTierBanner onUnlock={onUnlock} />}

        {/* ── Shift risk alert ── */}
        <ShiftRiskAlert shiftRisk={shiftRisk} coin={coin} isPro={isPro} />
        <StaleDataBanner isStale={stack?.is_stale || stack?.data_source === "cache"} dataTimestamp={stack?.data_timestamp} />

{/* ── REGIME HERO BAR ── */}
<RegimeHeroBar
  stack={stack}
  decision={decision}
  isPro={isPro}
  isEssential={isEssential}
  onUnlock={onUnlock}
  wsStatus={isProTier ? wsStatus : null}
/>

        {/* ── WHAT CHANGED (24H) ── */}
        <WhatChangedPanel token={token} isPro={isPro} onUnlock={onUnlock} />
{/* Feature 2: AI Narrative */}
<AINarrativePanel coin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} />

{/* Comparison Mode */}
<ErrorBoundary>
  <ComparisonModePanel
    primaryCoin={coin}
    token={token}
    isPro={isProTier}
    onUnlock={onUnlock}
  />
</ErrorBoundary>

{/* Feature 3: On-Chain Intelligence */}
<OnChainIntelligencePanel coin={coin} token={token} isEssential={isEssential} isPro={isProTier} onUnlock={onUnlock} />

{/* Feature 4: Backtesting Engine */}
<ErrorBoundary>
  <BacktestingEnginePanel coin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} />
</ErrorBoundary>

{/* Features 5 & 6: Portfolio Risk Engine */}
<ErrorBoundary>
  <PortfolioRiskEnginePanel coin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} />
</ErrorBoundary>


        {/* ── HERO GRID ── */}
        <div className="grid md:grid-cols-3 gap-4">
          <CardShell>
            <Label>Exposure Recommendation</Label>
            {isEssential ? (
  <>
    <div className={`text-7xl font-semibold ${exposureColor(exposure)}`}>{exposure}%</div>
    <div className="text-xs text-zinc-400">{alignment >= 80 ? "High conviction" : alignment >= 50 ? "Moderate conviction" : "Low conviction"}</div>
    <Bar value={exposure} cls={exposure > 60 ? "bg-emerald-500" : exposure > 35 ? "bg-yellow-500" : "bg-red-500"} />
  </>
) : (
              <>
                <div className="text-7xl font-semibold text-zinc-700 blur-sm select-none cursor-pointer" onClick={onUnlock}>00%</div>
                <button onClick={onUnlock} className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1 justify-center"><Lock />Unlock exposure — Essential</button>
                <Bar value={50} cls="bg-zinc-700" />
              </>
            )}
          </CardShell>

          <div className="md:col-span-2">
            <CardShell>
              <div className="flex justify-between items-start">
                <div>
                  <Label>Current Regime</Label>
                  <div className={`text-2xl font-semibold ${regimeText(execLabel)}`}>{execLabel ?? "—"}</div>
                  <div className="text-xs text-zinc-400 mt-1">Execution (1H) · Active {regimeAge.toFixed(1)}h</div>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${dirBadge(direction)}`}>
                  {direction === "bullish" ? "↑ Bullish" : direction === "bearish" ? "↓ Bearish" : "→ Mixed"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Macro (1D)", data: stack.macro },
                  { label: "Trend (4H)", data: stack.trend },
                  { label: "Execution (1H)", data: stack.execution },
                ].map(({ label, data }) => (
                  <div key={label} className={`border p-3 rounded-lg text-center ${data ? regimeBorder(data.label) : "border-white/5"}`}>
                    <div className="text-xs text-zinc-400 mb-1">{label}</div>
                    <div className={`text-xs font-semibold ${data ? regimeText(data.label) : "text-zinc-500"}`}>{data?.label ?? "—"}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Timeframe Alignment</span>
                  <span className={alignColor(alignment)}>{alignment}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1">
                  <div className={`h-1 rounded-full transition-all ${alignment >= 80 ? "bg-emerald-500" : alignment >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${alignment}%` }} />
                </div>
                <div className="text-xs text-zinc-500">
                  {alignment >= 80 ? "All timeframes agree — high conviction" : alignment >= 50 ? "Partial alignment — moderate conviction" : "Conflicting timeframes — reduce position size"}
                </div>
              </div>
            </CardShell>
          </div>
        </div>

        {/* ── STATS GRID ── */}
<div data-tour="stats-grid">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Survival Probability" value={isEssential ? survival : null} color={isEssential ? riskColor(100 - (survival || 0)) : ""} barCls={isEssential ? (survival > 60 ? "bg-green-500" : survival > 40 ? "bg-yellow-500" : "bg-red-500") : ""} hint="Probability current regime continues" locked={!isEssential} consequence="Survival probability quantifies regime decay risk." onUnlock={onUnlock} />
<StatCard label="Regime Shift Risk" value={isEssential ? shiftRisk : null} color={isEssential ? riskColor(shiftRisk) : ""} barCls={isEssential ? (shiftRisk > 70 ? "bg-red-500" : shiftRisk > 45 ? "bg-yellow-500" : "bg-green-500") : ""} hint="Composite deterioration signal" locked={!isEssential} consequence="Shift risk identifies breakdown probability before price moves." onUnlock={onUnlock} />
<StatCard label="Hazard Rate" value={isEssential ? hazard : null} color={isEssential ? riskColor(hazard || 0) : ""} barCls={isEssential ? (hazard > 70 ? "bg-red-500" : hazard > 45 ? "bg-yellow-500" : "bg-green-500") : ""} hint="Failure risk vs historical norm" locked={!isEssential} consequence="Hazard rate measures how fragile this regime is vs history." onUnlock={onUnlock} />
<StatCard label="Macro Coherence" value={isEssential ? stack.macro_coherence?.toFixed(1) : null} color={isEssential ? ((stack.macro_coherence || 0) > 60 ? "text-emerald-400" : "text-yellow-400") : ""} barCls={isEssential ? ((stack.macro_coherence || 0) > 60 ? "bg-emerald-500" : "bg-yellow-500") : ""} hint="1D timeframe signal strength" locked={!isEssential} consequence="Coherence measures whether the signal is strong or noisy." onUnlock={onUnlock} />
<StatCard label="Strength Percentile" value={isEssential ? percentile : null} color="text-blue-400" barCls="bg-blue-500" hint="Relative to historical scores" locked={!isEssential} consequence="Percentile rank shows how extreme the current regime is historically." onUnlock={onUnlock} />
          <StatCard label="Execution Score" value={stack.execution?.score?.toFixed(1) ?? "—"} suffix="" color={regimeText(execLabel)} hint="Raw 1H momentum-vol composite" locked={false} />
        </div>
</div>

     {isPro ? (
  <>
    <PortfolioHealthScore stack={stack} disciplineData={disciplineData} isPro={isPro} onUnlock={onUnlock} />

    <ErrorBoundary><AINarrativePanel coin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><OnChainIntelligencePanel coin={coin} token={token} isEssential={isEssential} isPro={isProTier} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><ComparisonModePanel primaryCoin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><DecisionEnginePanel stack={stack} token={token} isPro={isEssential} onUnlock={onUnlock} onDecisionLoaded={setDecision} /></ErrorBoundary>

    {/* ── Section: Advanced Analytics ── */}
    <div className="flex items-center gap-4 pt-4">
      <div className="flex-1 h-px bg-zinc-900" />
      <div className="text-[10px] text-zinc-700 uppercase tracking-widest font-medium">Advanced Analytics</div>
      <div className="flex-1 h-px bg-zinc-900" />
    </div>

    <ErrorBoundary><SetupQualityPanel coin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} requiredTier="pro" /></ErrorBoundary>
    <ErrorBoundary><OpportunityRankingPanel token={token} isPro={isProTier} onUnlock={onUnlock} requiredTier="pro" /></ErrorBoundary>
    <ErrorBoundary><ScenariosPanel coin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} requiredTier="pro" /></ErrorBoundary>
    <ErrorBoundary><BacktestingEnginePanel coin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><PortfolioRiskEnginePanel coin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><TradePlanPanel coin={coin} email={email} token={token} isPro={isProTier} onUnlock={onUnlock} requiredTier="pro" /></ErrorBoundary>
    <ErrorBoundary><HistoricalAnalogsPanel coin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} requiredTier="pro" /></ErrorBoundary>

    {/* ── Section: Risk Modeling ── */}
    <div className="flex items-center gap-4 pt-4">
      <div className="flex-1 h-px bg-zinc-900" />
      <div className="text-[10px] text-zinc-700 uppercase tracking-widest font-medium">Risk Modeling</div>
      <div className="flex-1 h-px bg-zinc-900" />
    </div>

    <ErrorBoundary><IfNothingPanel stack={stack} token={token} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><PnLImpactEstimator stack={stack} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><DrawdownSimulator stack={stack} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><InternalDamagePanel coin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} requiredTier="pro" /></ErrorBoundary>
    <ErrorBoundary><EventRiskOverlayPanel coin={coin} token={token} isPro={isProTier} onUnlock={onUnlock} requiredTier="pro" /></ErrorBoundary>

    <div className="grid md:grid-cols-2 gap-4">
      <ErrorBoundary><StressMeter stack={stack} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
      <ErrorBoundary><RegimeCountdown stack={stack} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <ErrorBoundary><RegimeQualityCard stack={stack} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
      <ErrorBoundary><ConfidenceTrend history={historyData} confidence={confidence} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
    </div>
    <ErrorBoundary><RegimePlaybook stack={stack} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>

    {/* ── Section: Personalization ── */}
    <div className="flex items-center gap-4 pt-4">
      <div className="flex-1 h-px bg-zinc-900" />
      <div className="text-[10px] text-zinc-700 uppercase tracking-widest font-medium">Personalization</div>
      <div className="flex-1 h-px bg-zinc-900" />
    </div>

    <ErrorBoundary><ArchetypeOverlayPanel coin={coin} email={email} token={token} isPro={isInstitutional} onUnlock={onUnlock} requiredTier="institutional" /></ErrorBoundary>
    <ErrorBoundary><ExposureTracker stack={stack} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><RiskProfilePanel email={email} token={token} isPro={isEssential} onUnlock={onUnlock} onProfileSaved={(p) => console.log("Saved:", p)} /></ErrorBoundary>
    <ErrorBoundary><AlertThresholdsPanel email={email} token={token} isPro={isInstitutional} onUnlock={onUnlock} requiredTier="institutional" /></ErrorBoundary>
    <ErrorBoundary><CustomRegimeThresholdsPanel email={email} token={token} isInstitutional={isInstitutional} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><UserAlertsInbox email={email} token={token} isPro={isProTier} onUnlock={onUnlock} requiredTier="pro" /></ErrorBoundary>

    {/* ── Section: Accountability ── */}
    <div className="flex items-center gap-4 pt-4">
      <div className="flex-1 h-px bg-zinc-900" />
      <div className="text-[10px] text-zinc-700 uppercase tracking-widest font-medium">Accountability</div>
      <div className="flex-1 h-px bg-zinc-900" />
    </div>

    <div className="relative">
      <ErrorBoundary><ExposureLogger stack={stack} email={email} token={token} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
      {isEssential && email && token && (
        <div className="absolute top-8 right-8 z-10">
          <ExportButton url={`/export/exposure-log?email=${encodeURIComponent(email)}`} filename="exposure-log.csv" token={token} />
        </div>
      )}
    </div>

    <ErrorBoundary><PerformanceLogger coin={coin} email={email} token={token} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><StreakTracker disciplineData={disciplineData} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><DisciplinePanel disciplineData={disciplineData} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><BehavioralAlphaPanel email={email} token={token} isPro={isProTier} onUnlock={onUnlock} requiredTier="pro" /></ErrorBoundary>
    <ErrorBoundary><MistakeReplayPanel email={email} coin={coin} token={token} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>

    <div className="relative">
      <ErrorBoundary><PerformancePanel email={email} coin={coin} token={token} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
      {isEssential && email && token && (
        <div className="absolute top-8 right-8 z-10">
          <ExportButton url={`/export/performance?email=${encodeURIComponent(email)}&coin=${coin}`} filename={`performance-${coin}.csv`} token={token} />
        </div>
      )}
    </div>

    <ErrorBoundary><EdgeProfilePanel email={email} token={token} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
    <ErrorBoundary><WeeklyReportPanel email={email} coin={coin} token={token} isPro={isEssential} onUnlock={onUnlock} /></ErrorBoundary>
  </>
) : (
  <>
    <DecisionEnginePanel stack={stack} token={token} isPro={false} onUnlock={onUnlock} onDecisionLoaded={setDecision} requiredTier="essential" />
    <RegimePlaybook stack={stack} isPro={false} onUnlock={onUnlock} requiredTier="essential" />

    <TierUpgradeBlock
      tier="essential"
      price="$39"
      color="text-blue-400"
      border="border-blue-500/20"
      bg="bg-blue-950/10"
      label="Essential — Exposure Control"
      tagline="You can see the regime. You cannot act on it without knowing how much to deploy."
      features={[
        "Exposure recommendation % — regime-adjusted",
        "Shift risk % — composite deterioration signal",
        "Hazard rate — failure risk vs historical baseline",
        "Survival curve — persistence probability over time",
        "Decision engine directive — systematic daily action",
        "Regime playbook — protocol and win rates",
        "On-chain metrics — funding rates + open interest",
        "Regime stress meter + confidence score",
        "Drawdown simulator + PnL impact estimator",
        "Discipline score + streak tracking",
        "Performance comparison vs model",
        "CSV export + email alerts",
      ]}
      onUnlock={onUnlock}
    />

    <TierUpgradeBlock
      tier="pro"
      price="$79"
      color="text-emerald-400"
      border="border-emerald-500/20"
      bg="bg-emerald-950/10"
      label="Pro — Strategic Edge"
      tagline="Essential tells you what to do. Pro tells you why, what's coming, and whether your entry is any good."
      features={[
        "AI Regime Analyst — plain-English narrative",
        "Setup quality engine — is this entry good or a chase?",
        "Backtesting engine — 5 strategies, 365 days of history",
        "Monte Carlo VaR — 10,000-simulation risk modeling",
        "Kelly Criterion — mathematically optimal position sizing",
        "Probabilistic scenarios — Bull/Base/Bear with probabilities",
        "Trade plan generator — tranches, stops, if-then actions",
        "Historical analog matching — forward return statistics",
        "Internal damage monitor — structural weakness detection",
        "Behavioral alpha report — which patterns cost you money",
        "Comparison mode — side-by-side asset analysis",
        "WebSocket live streaming — real-time regime updates",
      ]}
      onUnlock={onUnlock}
    />

    <TierUpgradeBlock
      tier="institutional"
      price="$149"
      color="text-purple-400"
      border="border-purple-500/20"
      bg="bg-purple-950/10"
      label="Institutional — Infrastructure Layer"
      tagline="For traders who need ChainPulse embedded in their workflow, not just open in a browser tab."
      features={[
        "REST API — 1,000 requests/day, 3 API keys",
        "Webhooks — HMAC-signed delivery to 5 endpoints",
        "Custom regime thresholds — tune score boundaries",
        "Custom per-coin alert thresholds",
        "Trader archetype overlay — personalized multipliers",
        "Priority alert delivery — 1hr cooldown",
      ]}
      onUnlock={onUnlock}
    />
  </>
)}



        {/* ── REGIME STACK DETAIL ── */}
        <div data-tour="regime-stack">
  <RegimeStackCard stack={stack} isPro={isEssential} onUnlock={onUnlock} requiredTier="essential" />
</div>


        {/* ── CONFIDENCE PANEL ── */}
        <ConfidencePanel confidence={confidence} isPro={isPro} onUnlock={onUnlock} />

        {/* ── REGIME MATURITY ── */}
        <RegimeMaturity regimeAge={regimeAge} avgDuration={avgDuration} maturityLabel={maturityLabel} isPro={isPro} onUnlock={onUnlock} />

        {/* ── VOL ENVIRONMENT ── */}
        <VolEnvironment env={volEnv} isPro={isPro} onUnlock={onUnlock} />

        {/* ── SURVIVAL CURVE ── */}
        <SurvivalCurve curve={curveData} regimeAge={regimeAge} isPro={isPro} onUnlock={onUnlock} />

        {/* ── SIGNAL INTERPRETATION ── */}
        <InterpretationPanel stack={stack} latest={latest} isPro={isPro} />

        {/* ── EMAIL CAPTURE ── */}
        {!email && <EmailCapture onEmailSet={setEmail} />}

        {/* ── ADVANCED ANALYTICS — collapsed ── */}
        <AdvancedAnalytics isPro={isPro}>
  <TransitionMatrix transitions={transitions} isPro={isEssential} onUnlock={onUnlock} requiredTier="essential" />
  <RegimeHeatmap overview={overview} isPro={isEssential} onUnlock={onUnlock} requiredTier="essential" />
  <CorrelationPanel correlation={correlation} isPro={isEssential} onUnlock={onUnlock} requiredTier="essential" />
  <PortfolioAllocator stack={stack} token={token} isPro={isEssential} onUnlock={onUnlock} requiredTier="essential" />
  <BreadthPanel breadth={breadth} />
  <RegimeMap overview={overview} activeCoin={coin} onSelect={setCoin} />
  <RegimeTimeline history={historyData} coin={coin} />
  <RiskEvents events={riskEvents} />
{/* Regime Calendar */}
<RegimeCalendar coin={coin} token={token} isPro={isEssential} onUnlock={onUnlock} />
</AdvancedAnalytics>

        {/* ── PRO UPSELL FOOTER ── */}
        {!isPro && (
          <div data-tour="upgrade-cta" className="border border-zinc-700 p-10 text-center space-y-6 cursor-pointer hover:border-zinc-500 transition-colors rounded-2xl" onClick={onUnlock}>
            <div>
              <Label>ChainPulse Pro</Label>
              <h3 className="text-2xl font-semibold mt-2">Avoid one late-cycle breakdown.<br />That alone pays for this.</h3>
              <p className="text-gray-400 max-w-lg mx-auto text-sm leading-relaxed mt-3">
                Exposure modeling, survival analysis, hazard rate, decision engine, discipline tracking, drawdown simulation, PnL impact estimation, and real-time alerts. Everything you need to trade with a systematic risk framework.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
              {[
                { icon: "→", label: "Daily Directive", desc: "Decision engine tells you what to do" },
                { icon: "→", label: "Survival Modeling", desc: "Quantify regime decay probability" },
                { icon: "→", label: "Discipline Score", desc: "Track protocol adherence over time" },
                { icon: "→", label: "Drawdown Simulation", desc: "Model loss at any price decline" },
                { icon: "→", label: "PnL Impact Estimator", desc: "Expected value of your exposure" },
                { icon: "→", label: "Edge Profile", desc: "Your best and worst regime types" },
                { icon: "→", label: "Regime Playbook", desc: "Protocol for current conditions" },
                { icon: "→", label: "Real-time Alerts", desc: "Shift alerts direct to your inbox" },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-3 space-y-1 text-left">
                  <div className="text-xs font-medium text-white flex items-center gap-1.5"><span className="text-emerald-400">{icon}</span>{label}</div>
                  <div className="text-xs text-zinc-500">{desc}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex justify-center gap-4 text-sm">
  <div className="border border-zinc-700 px-5 py-3 space-y-0.5 rounded-xl">
    <div className="text-blue-400 text-xs font-medium">Essential</div>
    <div className="text-white font-semibold">$39/mo</div>
  </div>
  <div className="border border-emerald-700 px-5 py-3 space-y-0.5 relative rounded-xl">
    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">Most Popular</div>
    <div className="text-emerald-400 text-xs font-medium">Pro</div>
    <div className="text-white font-semibold">$79/mo</div>
  </div>
  <div className="border border-zinc-700 px-5 py-3 space-y-0.5 rounded-xl">
    <div className="text-purple-400 text-xs font-medium">Institutional</div>
    <div className="text-white font-semibold">$149/mo</div>
  </div>
</div>
            </div>
            <div className="space-y-2">
              <button className="bg-white text-black hover:-translate-y-[1px] hover:shadow-lg transition-all px-10 py-4 rounded-xl font-semibold hover:bg-gray-100 text-sm" onClick={(e) => { e.stopPropagation(); setShowModal(true); }}>
                Start Using Full Regime Intelligence
              </button>
              <div className="text-zinc-500 text-xs">7-day risk-free evaluation · Cancel anytime · Instant access</div>
              <div className="text-gray-700 text-xs">For swing traders managing $5,000+</div>
            </div>
          </div>
        )}

        {/* ── PRO FOOTER — logged in ── */}
        {isPro && (
          <div className="border border-white/5 px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 rounded-2xl">
            <div className="space-y-0.5">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">ChainPulse Pro</div>
              <div className="text-sm text-gray-400">Full regime intelligence active · All signals live</div>
            </div>
            <div className="flex gap-4 text-xs text-zinc-500">
              <span>Auto-refresh: 60s</span><span>·</span><span>7 assets tracked</span><span>·</span><span>3 timeframes</span>
            </div>
          </div>
        )}
<div className="text-center text-[10px] text-zinc-700 pt-6 pb-2 border-t border-white/5">
  ChainPulse is a decision-support tool, not financial advice. Past regime behavior does not predict future results. Trade at your own risk.
</div>
      </div>
    </main>
  );
}