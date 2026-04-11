"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
} from "recharts";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

// ─────────────────────────────────────────────────────────
// SHARED HELPERS (copied from dashboard to avoid import)
// ─────────────────────────────────────────────────────────
function authHeaders(token) {
  const h = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function apiFetch(path, token, opts = {}) {
  const url = path.startsWith("http") ? path : BACKEND + path;
  const res = await fetch(url, {
    ...opts,
    headers: { ...authHeaders(token), ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

function CardShell({ children }) {
  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] p-8 space-y-4">
      {children}
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

function Bar2({ value = 0, cls = "bg-white" }) {
  return (
    <div className="w-full bg-white/4 rounded-full h-[3px] mt-2">
      <div
        className={`h-[3px] rounded-full transition-all duration-700 ${cls}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function ProGate({ label, consequence, children, onUnlock, requiredTier }) {
  const tierLabel =
    requiredTier === "institutional" ? "Institutional" :
    requiredTier === "pro" ? "Pro" : "Essential";
  const tierPrice =
    requiredTier === "institutional" ? "$149" :
    requiredTier === "pro" ? "$79" : "$39";

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] p-8 space-y-4 relative min-h-[160px]">
      <Label>{label}</Label>
      <div className="blur-sm select-none pointer-events-none opacity-30 max-h-32 overflow-hidden">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10 rounded-2xl overflow-hidden">
        <div className="bg-zinc-950/98 border border-white/10 px-8 py-6 text-center space-y-3 w-full mx-4 rounded-xl shadow-2xl shadow-black/50 backdrop-blur-sm">
          <div className="text-sm font-semibold text-white">{label}</div>
          {consequence && (
            <div className="text-xs text-zinc-500 leading-relaxed">{consequence}</div>
          )}
          <button
            onClick={onUnlock}
            className="w-full bg-white text-black px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-zinc-100 transition-all"
          >
            Unlock — {tierLabel} {tierPrice}/month
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// FEATURE 1 — WebSocket Live Regime Streaming
// ─────────────────────────────────────────────────────────
export function useRegimeWebSocket({ coin, token, isPro, onUpdate }) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const backoff = useRef(1000);
  const [status, setStatus] = useState("disconnected"); // connected | disconnected | reconnecting
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

    const wsUrl = `${BACKEND.replace(/^https?/, (m) => (m === "https" ? "wss" : "ws"))}/ws/regime/${coin}?token=${token}`;

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
            if (onUpdate) onUpdate(msg.data);
          }
        } catch {}
      };

      ws.onerror = () => {
        setStatus("reconnecting");
      };

      ws.onclose = () => {
        setStatus("reconnecting");
        reconnectTimer.current = setTimeout(() => {
          backoff.current = Math.min(backoff.current * 2, 30000);
          connect();
        }, backoff.current);
      };
    } catch {
      setStatus("disconnected");
    }
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

export function LiveStatusIndicator({ status, lastHeartbeat, connectionCount }) {
  if (status === "disconnected") return null;

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${
          status === "connected" ? "bg-emerald-400 animate-pulse" :
          status === "reconnecting" ? "bg-yellow-400 animate-pulse" :
          "bg-zinc-600"
        }`} />
        <span className={
          status === "connected" ? "text-emerald-400" :
          status === "reconnecting" ? "text-yellow-400" :
          "text-zinc-500"
        }>
          {status === "connected" ? "Live" :
           status === "reconnecting" ? "Reconnecting..." :
           "Offline"}
        </span>
      </div>
      {lastHeartbeat && (
        <span className="text-zinc-600">
          Updated {Math.round((Date.now() - lastHeartbeat.getTime()) / 1000)}s ago
        </span>
      )}
      {connectionCount !== null && (
        <span className="text-zinc-600">{connectionCount.toLocaleString()} users live</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// FEATURE 2 — AI Narrative
// ─────────────────────────────────────────────────────────
export function AINarrativePanel({ coin, token, isPro, onUnlock }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(() => {
    if (!isPro || !coin) return;
    setLoading(true);
    apiFetch(`/ai-narrative?coin=${coin}`, token)
      .then((d) => { if (!d.error) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [coin, token, isPro]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const minutesAgo = data?.generated_at
    ? Math.round((Date.now() - new Date(data.generated_at).getTime()) / 60000)
    : null;

  const inner = !data ? (
    loading ? (
      <div className="text-sm text-zinc-400">Generating AI analysis...</div>
    ) : null
  ) : !data.available ? (
    <div className="border border-zinc-800 bg-zinc-900/40 px-5 py-4 rounded-xl text-sm text-zinc-400">
      AI narrative is not configured on this deployment. Contact support to enable OpenAI integration.
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
          onClick={fetch_}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-white border border-zinc-700 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Regenerating..." : "↺ Regenerate"}
        </button>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-3">
        {data.narrative?.split("\n\n").map((para, i) => (
          <p key={i} className="text-sm text-zinc-300 leading-relaxed">{para}</p>
        ))}
      </div>

      {data.regime_context && (
        <div className="flex flex-wrap gap-2 pt-2">
          {Object.entries({
            Macro: data.regime_context.macro,
            Trend: data.regime_context.trend,
            Execution: data.regime_context.execution,
          }).map(([k, v]) => (
            <span key={k} className="text-[10px] border border-zinc-700 bg-zinc-900/60 px-2 py-1 rounded-full text-zinc-400">
              {k}: {v}
            </span>
          ))}
          <span className="text-[10px] border border-zinc-700 bg-zinc-900/60 px-2 py-1 rounded-full text-zinc-400">
            Hazard: {data.regime_context.hazard}%
          </span>
          <span className="text-[10px] border border-zinc-700 bg-zinc-900/60 px-2 py-1 rounded-full text-zinc-400">
            Shift Risk: {data.regime_context.shift_risk}%
          </span>
        </div>
      )}
    </div>
  );

  if (!isPro)
    return (
      <ProGate
        label="AI Regime Analyst"
        consequence="Get a 3-paragraph AI-generated narrative explaining current regime conditions and what to do."
        onUnlock={onUnlock}
        requiredTier="pro"
      >
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
}

// ─────────────────────────────────────────────────────────
// FEATURE 3 — On-Chain Intelligence
// ─────────────────────────────────────────────────────────
function fundingColor(signal) {
  if (signal === "overleveraged_longs") return "text-red-400";
  if (signal === "overleveraged_shorts") return "text-emerald-400";
  return "text-yellow-400";
}

function fundingBgColor(signal) {
  if (signal === "overleveraged_longs") return "border-red-900 bg-red-950/30";
  if (signal === "overleveraged_shorts") return "border-emerald-900 bg-emerald-950/30";
  return "border-yellow-900 bg-yellow-950/30";
}

export function OnChainIntelligencePanel({ coin, token, isEssential, isPro, onUnlock }) {
  const [funding, setFunding] = useState(null);
  const [oi, setOi] = useState(null);
  const [onchain, setOnchain] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEssential || !coin) return;
    setLoading(true);

    const requests = [
      apiFetch(`/funding-rates/${coin}`, token).catch(() => null),
      apiFetch(`/open-interest/${coin}`, token).catch(() => null),
    ];

    if (isPro) {
      requests.push(apiFetch(`/onchain/${coin}`, token).catch(() => null));
    }

    Promise.all(requests).then(([f, o, oc]) => {
      if (f && !f.error) setFunding(f);
      if (o && !o.error) setOi(o);
      if (oc && !oc.error) setOnchain(oc);
    }).finally(() => setLoading(false));
  }, [coin, token, isEssential, isPro]);

  const inner = (
    <div className="space-y-5">
      {loading && <div className="text-sm text-zinc-400">Loading on-chain data...</div>}

      {/* Funding Rates */}
      {funding && (
        <div className={`border rounded-xl p-5 space-y-3 ${fundingBgColor(funding.signal)}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Funding Rate</div>
              <div className={`text-3xl font-bold ${fundingColor(funding.signal)}`}>
                {funding.annualized_pct?.toFixed(1)}%
                <span className="text-sm font-normal text-zinc-400 ml-1">annualized</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className={`text-xs px-2 py-0.5 rounded-full border inline-block capitalize ${
                funding.signal === "overleveraged_longs"
                  ? "border-red-700 text-red-300"
                  : funding.signal === "overleveraged_shorts"
                  ? "border-emerald-700 text-emerald-300"
                  : "border-yellow-700 text-yellow-300"
              }`}>
                {funding.signal?.replace(/_/g, " ")}
              </div>
              <div className="text-xs text-zinc-500">
                {funding.sentiment?.replace(/_/g, " ")}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-zinc-500">8h rate: </span>
              <span className="text-white">{funding.current_rate_pct?.toFixed(4)}%</span>
            </div>
            <div>
              <span className="text-zinc-500">8-period avg: </span>
              <span className="text-white">{funding.avg_rate_8period_pct?.toFixed(4)}%</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">{funding.interpretation}</p>
        </div>
      )}

      {/* Open Interest */}
      {oi && (
        <div className="border border-white/10 bg-white/2 rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Open Interest</div>
              <div className="text-2xl font-bold text-white">
                ${oi.current_oi_usd_millions?.toFixed(1)}M
              </div>
            </div>
            <div className={`text-lg font-bold flex items-center gap-1 ${
              oi.oi_change_24h_pct > 0 ? "text-emerald-400" : "text-red-400"
            }`}>
              {oi.oi_change_24h_pct > 0 ? "↑" : "↓"}
              {Math.abs(oi.oi_change_24h_pct)?.toFixed(1)}%
              <span className="text-xs text-zinc-500 font-normal">24h</span>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            <span className="text-zinc-400 capitalize">{oi.oi_signal?.replace(/_/g, " ")}</span>
            {" · "}{oi.current_oi_contracts?.toLocaleString()} contracts
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">{oi.interpretation}</p>
        </div>
      )}

      {/* Combined On-Chain (Pro) */}
      {isPro && onchain && (
        <div className="border border-purple-900/40 bg-purple-950/10 rounded-xl p-5 space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Combined On-Chain View</div>
          <div className="text-xs text-zinc-500">
            Full on-chain data aggregated from all signals.
          </div>
        </div>
      )}

      {!isEssential && (
        <div className="text-sm text-zinc-500 text-center py-4">
          Essential tier required for on-chain data.
        </div>
      )}
    </div>
  );

  if (!isEssential)
    return (
      <ProGate
        label="On-Chain Intelligence"
        consequence="Funding rates and open interest reveal leverage positioning before price reacts."
        onUnlock={onUnlock}
        requiredTier="essential"
      >
        {inner}
      </ProGate>
    );

  return (
    <CardShell>
      <Label>On-Chain Intelligence</Label>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────────────────────
// FEATURE 4 — Backtesting Engine
// ─────────────────────────────────────────────────────────
const BACKTEST_STRATEGIES = [
  { key: "follow_model", label: "Follow Model" },
  { key: "buy_and_hold", label: "Buy & Hold" },
  { key: "risk_off_only", label: "Risk-Off Only" },
  { key: "momentum", label: "Momentum" },
  { key: "inverse", label: "Inverse" },
];

const BACKTEST_DAYS = [7, 30, 90, 180, 365];

const REGIME_COLORS = {
  "Strong Risk-On": "#10b981",
  "Risk-On": "#4ade80",
  "Neutral": "#facc15",
  "Risk-Off": "#f87171",
  "Strong Risk-Off": "#ef4444",
};

export function BacktestingEnginePanel({ coin: initialCoin, token, isPro, onUnlock }) {
  const [coin, setCoin] = useState(initialCoin || "BTC");
  const [days, setDays] = useState(90);
  const [strategy, setStrategy] = useState("follow_model");
  const [data, setData] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("single"); // single | compare

  const SUPPORTED_COINS = ["BTC", "ETH", "SOL", "BNB", "AVAX", "LINK", "ADA"];

  const runBacktest = async () => {
    setLoading(true);
    try {
      if (view === "compare") {
        const d = await apiFetch(
          `/backtest-compare/${coin}?days=${days}`, token
        );
        if (!d.error) setCompareData(d);
      } else {
        const d = await apiFetch(
          `/backtest/${coin}?days=${days}&strategy=${strategy}`, token
        );
        if (!d.error) setData(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const r = data?.results;

  const inner = (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Coin</div>
          <select
            value={coin}
            onChange={(e) => setCoin(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2.5 rounded-xl text-sm"
          >
            {SUPPORTED_COINS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Period</div>
          <div className="flex gap-1">
            {BACKTEST_DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  days === d
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">View</div>
          <div className="flex gap-1">
            {["single", "compare"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 py-2 rounded-lg text-xs capitalize font-medium transition-colors ${
                  view === v
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end">
          <button
            onClick={runBacktest}
            disabled={loading}
            className="w-full bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Backtest"}
          </button>
        </div>
      </div>

      {/* Strategy selector (single view) */}
      {view === "single" && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">Strategy</div>
          <div className="flex flex-wrap gap-2">
            {BACKTEST_STRATEGIES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStrategy(s.key)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  strategy === s.key
                    ? "bg-white text-black border-white"
                    : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Single strategy results */}
      {view === "single" && r && (
        <div className="space-y-5">
          {/* Headline numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">Total Return</div>
              <div className={`text-3xl font-bold ${r.total_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {r.total_return_pct > 0 ? "+" : ""}{r.total_return_pct?.toFixed(1)}%
              </div>
              <div className="text-xs text-zinc-500">
                ${r.initial_capital?.toLocaleString()} → ${r.final_capital?.toLocaleString()}
              </div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">vs Benchmark</div>
              <div className="text-2xl font-bold text-blue-400">
                {r.benchmark_return_pct > 0 ? "+" : ""}{r.benchmark_return_pct?.toFixed(1)}%
              </div>
              <div className={`text-xs font-medium ${r.alpha_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                Alpha: {r.alpha_pct > 0 ? "+" : ""}{r.alpha_pct?.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">Max Drawdown</div>
              <div className="text-2xl font-bold text-red-400">-{r.max_drawdown_pct?.toFixed(1)}%</div>
              <div className="text-xs text-zinc-500">Sharpe: {r.sharpe_ratio?.toFixed(2)}</div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">Win Rate</div>
              <div className={`text-2xl font-bold ${r.win_rate_pct >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                {r.win_rate_pct?.toFixed(1)}%
              </div>
              <div className="text-xs text-zinc-500">{r.total_trades} trades</div>
            </div>
          </div>

          {/* Equity curve */}
          {data.equity_curve?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Equity Curve vs Benchmark</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.equity_curve}>
                  <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#3f3f46"
                    tick={{ fill: "#52525b", fontSize: 9 }}
                    tickFormatter={(v) => v ? new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}
                  />
                  <YAxis stroke="#3f3f46" tick={{ fill: "#52525b", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4 }}
                    formatter={(v, n) => [`$${v?.toLocaleString()}`, n]}
                    labelFormatter={(l) => l ? new Date(l).toLocaleDateString() : ""}
                  />
                  <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} name="Strategy" />
                  <Line type="monotone" dataKey="benchmark" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Benchmark" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Regime breakdown */}
          {data.regime_breakdown && Object.keys(data.regime_breakdown).length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Performance by Regime</div>
              <div className="space-y-1.5">
                {Object.entries(data.regime_breakdown).map(([regime, stats]) => (
                  <div key={regime} className="flex items-center justify-between border border-white/5 px-4 py-2.5 rounded-lg text-xs">
                    <span className="font-medium" style={{ color: REGIME_COLORS[regime] || "#71717a" }}>
                      {regime}
                    </span>
                    <span className="text-zinc-400">{stats.hours}h</span>
                    <span className={stats.strategy_avg_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {stats.strategy_avg_return_pct > 0 ? "+" : ""}
                      {(stats.strategy_avg_return_pct * 100).toFixed(3)}% avg/period
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent trades */}
          {data.recent_trades?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Recent Trades</div>
              <div className="space-y-1">
                {data.recent_trades.slice(0, 8).map((t, i) => (
                  <div key={i} className="flex items-center justify-between border border-white/5 px-4 py-2 rounded-lg text-xs">
                    <span className="text-zinc-400">{new Date(t.timestamp).toLocaleDateString()}</span>
                    <span style={{ color: REGIME_COLORS[t.regime] || "#71717a" }}>{t.regime}</span>
                    <span className="text-white">
                      {t.from_exposure}% → {t.to_exposure}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.disclaimer && (
            <p className="text-[10px] text-zinc-600 leading-relaxed">{data.disclaimer}</p>
          )}
        </div>
      )}

      {/* Compare view */}
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
                        <div className="text-sm font-semibold text-white capitalize">
                          {s.strategy.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-zinc-500">{s.strategy_description}</div>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${sr.total_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {sr.total_return_pct > 0 ? "+" : ""}{sr.total_return_pct?.toFixed(1)}%
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500">Alpha: </span>
                      <span className={sr.alpha_pct >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {sr.alpha_pct > 0 ? "+" : ""}{sr.alpha_pct?.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Drawdown: </span>
                      <span className="text-red-400">-{sr.max_drawdown_pct?.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Sharpe: </span>
                      <span className="text-white">{sr.sharpe_ratio?.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Win rate: </span>
                      <span className="text-white">{sr.win_rate_pct?.toFixed(1)}%</span>
                    </div>
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
      <ProGate
        label="Backtesting Engine"
        consequence="Test how different strategies performed across historical regime conditions."
        onUnlock={onUnlock}
        requiredTier="pro"
      >
        <div className="h-32 bg-zinc-900/40 rounded-xl" />
      </ProGate>
    );

  return (
    <CardShell>
      <Label>Backtesting Engine</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Simulate strategy performance across historical regime conditions
      </p>
      {inner}
    </CardShell>
  );
}

// ─────────────────────────────────────────────────────────
// FEATURES 5 & 6 — Portfolio Risk Engine (Monte Carlo + Kelly)
// ─────────────────────────────────────────────────────────
export function PortfolioRiskEnginePanel({ coin, token, isPro, onUnlock }) {
  const [activeTab, setActiveTab] = useState("montecarlo");

  if (!isPro)
    return (
      <ProGate
        label="Portfolio Risk Engine"
        consequence="Quantify exactly how much capital is at risk under different market scenarios."
        onUnlock={onUnlock}
        requiredTier="pro"
      >
        <div className="h-32 bg-zinc-900/40 rounded-xl" />
      </ProGate>
    );

  return (
    <CardShell>
      <Label>Portfolio Risk Engine</Label>
      <div className="flex gap-2">
        {[
          { key: "montecarlo", label: "Monte Carlo VaR" },
          { key: "kelly", label: "Kelly Criterion" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${
              activeTab === t.key
                ? "bg-white text-black border-white"
                : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "montecarlo" && (
        <MonteCarloTab coin={coin} token={token} />
      )}
      {activeTab === "kelly" && (
        <KellyTab coin={coin} token={token} />
      )}
    </CardShell>
  );
}

function MonteCarloTab({ coin, token }) {
  const [exposure, setExposure] = useState(50);
  const [accountSize, setAccountSize] = useState(10000);
  const [horizon, setHorizon] = useState(7);
  const [simulations, setSimulations] = useState(5000);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const HORIZONS = [1, 3, 7, 14, 30];
  const SIM_OPTIONS = [1000, 5000, 10000];

  const run = async () => {
    setLoading(true);
    try {
      const d = await apiFetch(
        `/monte-carlo-var?coin=${coin}&exposure_pct=${exposure}&account_size=${accountSize}&horizon_days=${horizon}&simulations=${simulations}`,
        token,
        { method: "POST" }
      );
      if (!d.error) setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const distData = data ? [
    { label: "Worst 5%", value: data.outcome_distribution?.worst_5pct, color: "#ef4444" },
    { label: "P25", value: data.outcome_distribution?.p25, color: "#f87171" },
    { label: "Median", value: data.outcome_distribution?.median_pct, color: "#facc15" },
    { label: "P75", value: data.outcome_distribution?.p75, color: "#4ade80" },
    { label: "Best 5%", value: data.outcome_distribution?.best_5pct, color: "#10b981" },
  ] : [];

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Exposure %</div>
          <input
            type="number"
            value={exposure}
            onChange={(e) => setExposure(Number(e.target.value))}
            min={1} max={200}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Account Size ($)</div>
          <input
            type="number"
            value={accountSize}
            onChange={(e) => setAccountSize(Number(e.target.value))}
            min={100}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Horizon (days)</div>
          <div className="flex gap-1">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                  horizon === h ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-700"
                }`}
              >
                {h}d
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Simulations</div>
          <div className="flex gap-1">
            {SIM_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSimulations(s)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                  simulations === s ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-700"
                }`}
              >
                {s >= 1000 ? `${s / 1000}k` : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="bg-white text-black px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        {loading ? `Running ${simulations.toLocaleString()} simulations...` : "Run Monte Carlo"}
      </button>

      {data && (
        <div className="space-y-5">
          {/* VaR headline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-red-900 bg-red-950/30 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">VaR 95% ({horizon}d)</div>
              <div className="text-3xl font-bold text-red-400">
                {data.value_at_risk?.var_95_pct?.toFixed(1)}%
              </div>
              <div className="text-sm text-red-300">
                -${data.value_at_risk?.var_95_usd?.toLocaleString()}
              </div>
            </div>
            <div className="border border-red-800 bg-red-950/50 rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">VaR 99% ({horizon}d)</div>
              <div className="text-3xl font-bold text-red-500">
                {data.value_at_risk?.var_99_pct?.toFixed(1)}%
              </div>
              <div className="text-sm text-red-300">
                -${data.value_at_risk?.var_99_usd?.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Outcome distribution bar chart */}
          {distData.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Outcome Distribution</div>
              <div className="space-y-2">
                {distData.map(({ label, value, color }) => {
                  const pct = Math.abs(value || 0);
                  const isNeg = (value || 0) < 0;
                  return (
                    <div key={label} className="flex items-center gap-3 text-xs">
                      <span className="text-zinc-500 w-16 shrink-0">{label}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-zinc-800 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, pct * 5)}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        <span style={{ color }} className="w-14 text-right font-medium">
                          {isNeg ? "" : "+"}{value?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loss probabilities */}
          {data.loss_probabilities && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 uppercase tracking-widest">Loss Probabilities</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Any loss", value: data.loss_probabilities.any_loss_pct },
                  { label: "> 5% loss", value: data.loss_probabilities.loss_gt_5pct },
                  { label: "> 10% loss", value: data.loss_probabilities.loss_gt_10pct },
                  { label: "> 20% loss", value: data.loss_probabilities.loss_gt_20pct },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/2 border border-white/5 rounded-lg p-3 space-y-1">
                    <div className="text-xs text-zinc-500">{label}</div>
                    <div className={`text-xl font-semibold ${
                      value > 30 ? "text-red-400" : value > 15 ? "text-yellow-400" : "text-green-400"
                    }`}>
                      {value?.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-500 leading-relaxed">{data.interpretation}</p>

          {data.regime_context && (
            <div className="flex gap-3 flex-wrap text-xs text-zinc-600">
              <span>Regime: {data.regime_context.regime}</span>
              <span>Hazard: {data.regime_context.hazard}%</span>
            </div>
          )}
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
          <div className="text-xs text-zinc-400">Win Rate %</div>
          <input
            type="range"
            min={10} max={90} step={1}
            value={winRate}
            onChange={(e) => setWinRate(Number(e.target.value))}
            className="w-full accent-white"
          />
          <div className="text-center text-sm font-medium text-white">{winRate}%</div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Avg Win %</div>
          <input
            type="number"
            value={avgWin}
            onChange={(e) => setAvgWin(Number(e.target.value))}
            min={0.1} step={0.1}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Avg Loss %</div>
          <input
            type="number"
            value={avgLoss}
            onChange={(e) => setAvgLoss(Number(e.target.value))}
            min={0.1} step={0.1}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Account Size ($)</div>
          <input
            type="number"
            value={accountSize}
            onChange={(e) => setAccountSize(Number(e.target.value))}
            min={100}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
          />
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
              <div
                key={label}
                className={`rounded-xl p-5 space-y-2 border ${
                  isRec
                    ? "border-white bg-white/8"
                    : "border-white/10 bg-white/2"
                }`}
              >
                <div className="text-xs text-zinc-400">{label}</div>
                <div className={`text-2xl font-bold ${isRec ? "text-white" : "text-zinc-300"}`}>
                  {pct?.toFixed(1)}%
                </div>
                <div className={`text-sm ${isRec ? "text-zinc-300" : "text-zinc-500"}`}>
                  ${usd?.toLocaleString()}
                </div>
                {isRec && (
                  <div className="text-[10px] text-emerald-400 uppercase tracking-widest">Recommended</div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">{data.interpretation}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// FEATURE 8 — CSV Export buttons
// ─────────────────────────────────────────────────────────
export function ExportButton({ url, filename, token, label = "Export CSV" }) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(url.startsWith("http") ? url : `${BACKEND}${url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={download}
      disabled={downloading}
      title={downloading ? "Downloading..." : label}
      className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition-colors ${
        downloading
          ? "border-zinc-700 text-zinc-500 cursor-not-allowed"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
      }`}
    >
      {downloading ? (
        <>
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Downloading...
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// FEATURE 10 — Custom Regime Thresholds (Institutional)
// ─────────────────────────────────────────────────────────
export function CustomRegimeThresholdsPanel({ email, token, isInstitutional, onUnlock }) {
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
        token,
        { method: "POST" }
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
    {
      key: "strong_risk_on_min",
      label: "Strong Risk-On minimum",
      min: 15, max: 60, step: 1,
      hint: "Scores above this → Strong Risk-On",
    },
    {
      key: "risk_on_min",
      label: "Risk-On minimum",
      min: 5, max: 40, step: 1,
      hint: "Scores above this (but below Strong) → Risk-On",
    },
    {
      key: "risk_off_max",
      label: "Risk-Off maximum",
      min: -40, max: -5, step: 1,
      hint: "Scores below this (but above Strong) → Risk-Off",
    },
    {
      key: "strong_risk_off_max",
      label: "Strong Risk-Off maximum",
      min: -60, max: -15, step: 1,
      hint: "Scores below this → Strong Risk-Off",
    },
  ];

  const PREVIEW_SCORES = [60, 30, 5, -5, -30, -60];

  const inner = (
    <div className="space-y-6">
      {loading && <div className="text-sm text-zinc-400">Loading thresholds...</div>}

      {saved && (
        <div className="border border-emerald-800 bg-emerald-950 px-4 py-3 text-emerald-300 text-sm rounded-lg">
          ✓ Custom thresholds saved.
        </div>
      )}

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className={`text-xs px-3 py-1 rounded-full border ${
          usingDefaults
            ? "border-zinc-700 text-zinc-400"
            : "border-emerald-700 text-emerald-400 bg-emerald-950/40"
        }`}>
          {usingDefaults ? "Using defaults" : "Custom thresholds active"}
        </span>
      </div>

      {/* Sliders */}
      <div className="space-y-5">
        {SLIDER_CONFIG.map(({ key, label, min, max, step, hint }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-xs text-zinc-400">{label}</div>
              <div className="text-sm font-medium text-white">{thresholds[key]}</div>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={thresholds[key]}
              onChange={(e) => setThresholds((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>{min}</span>
              <span className="text-zinc-500">{hint}</span>
              <span>{max}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <div className="text-xs text-zinc-400 uppercase tracking-widest">Live Classification Preview</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {PREVIEW_SCORES.map((score) => {
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

      <button
        onClick={save}
        disabled={saving || !email}
        className="bg-white text-black px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Thresholds"}
      </button>

      {!email && (
        <div className="text-xs text-zinc-500">Sign in to save custom thresholds.</div>
      )}
    </div>
  );

  if (!isInstitutional)
    return (
      <ProGate
        label="Custom Regime Thresholds"
        consequence="Institutional-grade: tune exactly where regime boundaries are drawn for your trading style."
        onUnlock={onUnlock}
        requiredTier="institutional"
      >
        {inner}
      </ProGate>
    );

  return (
    <CardShell>
      <Label>Custom Regime Thresholds</Label>
      <p className="text-xs text-zinc-400 mb-4">
        Adjust the score boundaries that define each regime state
      </p>
      {inner}
    </CardShell>
  );
}
