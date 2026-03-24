import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Zap, Activity, TrendingUp, Target, Shield, Cpu, Database } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface District {
  id: number;
  name: string;
}

interface CrimeStat {
  year: number;
  rapeCases: number;
  homicide: number;
  attemptedHomicide: number;
  abduction: number;
  kidnapping: number;
  arson: number;
  theftOver50k: number;
  grievousHurt: number;
  hurtByKnife: number;
  robbery: number;
  extortion: number;
  unnaturalOffense: number;
  sexualAbuse: number;
}

interface StatRow {
  district: District | null;
  stat: CrimeStat;
}

interface Prediction {
  crimeType: string;
  predictedYear: number;
  predictedValue: number;
  confidence: number;
}

interface ChartPoint {
  year: number;
  actual: number | null;
  predicted: number | null;
}

type CrimeKey = keyof Omit<CrimeStat, "year">;
type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface RiskMeta {
  color: string;
  bg: string;
  border: string;
  icon: string;
}

interface TooltipPayloadItem {
  color: string;
  name: string;
  value: number | string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}

interface AnimatedNumberProps {
  target: number;
  duration?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CRIME_LABELS: Record<CrimeKey, string> = {
  rapeCases:         "Rape Cases",
  homicide:          "Homicide",
  attemptedHomicide: "Attempted Homicide",
  abduction:         "Abduction",
  kidnapping:        "Kidnapping",
  arson:             "Arson",
  theftOver50k:      "Theft over Rs. 50,000",
  grievousHurt:      "Grievous Hurt",
  hurtByKnife:       "Hurt by Knife",
  robbery:           "Robbery",
  extortion:         "Extortion",
  unnaturalOffense:  "Unnatural Offense",
  sexualAbuse:       "Sexual Abuse",
};

const CRIME_KEYS = Object.keys(CRIME_LABELS) as CrimeKey[];

interface Thresholds { critical: number; high: number; medium: number; }

const RISK_THRESHOLDS: Record<CrimeKey, Thresholds> = {
  robbery:           { critical: 1200, high: 600,  medium: 200 },
  theftOver50k:      { critical: 2500, high: 1200, medium: 500 },
  hurtByKnife:       { critical: 300,  high: 180,  medium: 80  },
  grievousHurt:      { critical: 200,  high: 100,  medium: 40  },
  abduction:         { critical: 120,  high: 60,   medium: 20  },
  kidnapping:        { critical: 150,  high: 80,   medium: 30  },
  rapeCases:         { critical: 130,  high: 70,   medium: 30  },
  homicide:          { critical: 80,   high: 40,   medium: 15  },
  attemptedHomicide: { critical: 25,   high: 12,   medium: 5   },
  arson:             { critical: 40,   high: 20,   medium: 8   },
  extortion:         { critical: 40,   high: 20,   medium: 8   },
  unnaturalOffense:  { critical: 90,   high: 40,   medium: 15  },
  sexualAbuse:       { critical: 130,  high: 60,   medium: 20  },
};

const RISK_META: Record<RiskLevel, RiskMeta> = {
  CRITICAL: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.3)",  icon: "🔴" },
  HIGH:     { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.3)", icon: "🟠" },
  MEDIUM:   { color: "#eab308", bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.3)",  icon: "🟡" },
  LOW:      { color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.3)",  icon: "🟢" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRiskLevel(crimeKey: CrimeKey, value: number): RiskLevel {
  const t = RISK_THRESHOLDS[crimeKey];
  if (value >= t.critical) return "CRITICAL";
  if (value >= t.high)     return "HIGH";
  if (value >= t.medium)   return "MEDIUM";
  return "LOW";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SentinelTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0d1117",
      border: "1px solid rgba(255,107,74,0.3)",
      padding: "0.7rem 1rem",
      fontFamily: "'Space Mono',monospace",
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    }}>
      <div style={{ fontSize: "0.52rem", color: "#ff6b4a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: "0.62rem", color: "#cdd9e5", letterSpacing: "0.04em", marginBottom: "0.2rem" }}>
          <span style={{ color: p.color, marginRight: "0.4rem" }}>■</span>
          {p.name}:{" "}
          <strong style={{ color: "#fff" }}>
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </strong>
        </div>
      ))}
    </div>
  );
};

function AnimatedNumber({ target, duration = 1200 }: AnimatedNumberProps) {
  const [val, setVal] = useState<number>(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      setVal(Math.round(prog * target));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <span>{val.toLocaleString()}</span>;
}

// Custom dot for predicted line — only renders on non-null predicted values
const PredictedDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.predicted === null || payload.predicted === undefined) return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={payload.year === 2026 ? 7 : 4}
      fill="#38bdf8"
      stroke="#060810"
      strokeWidth={2}
    />
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Predictions() {
  const [districts, setDistricts]       = useState<District[]>([]);
  const [allStats, setAllStats]         = useState<StatRow[]>([]);
  const [selectedDistrict, setDistrict] = useState<string>("");
  const [selectedCrime, setCrime]       = useState<CrimeKey>("robbery");
  const [predictions, setPredictions]   = useState<Prediction[]>([]);
  const [isAnalyzing, setIsAnalyzing]   = useState<boolean>(false);
  const [analyzed, setAnalyzed]         = useState<boolean>(false);

  // ── Fetch data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: distData } = await supabase
        .from("districts")
        .select("id, name")
        .order("name", { ascending: true });
      if (distData) setDistricts(distData as District[]);

      const { data: statsData } = await supabase
        .from("crimeStatistics")
        .select(`
          id, districtId, year,
          rapeCases, homicide, attemptedHomicide, abduction, kidnapping,
          arson, theftOver50k, grievousHurt, hurtByKnife,
          robbery, extortion, unnaturalOffense, sexualAbuse,
          districts(id, name)
        `)
        .order("year", { ascending: true });

      if (statsData) {
        const formatted: StatRow[] = (statsData as any[]).map((row) => ({
          district: Array.isArray(row.districts) ? row.districts[0] : row.districts,
          stat: {
            year:              row.year,
            rapeCases:         row.rapeCases         ?? 0,
            homicide:          row.homicide          ?? 0,
            attemptedHomicide: row.attemptedHomicide ?? 0,
            abduction:         row.abduction         ?? 0,
            kidnapping:        row.kidnapping        ?? 0,
            arson:             row.arson             ?? 0,
            theftOver50k:      row.theftOver50k      ?? 0,
            grievousHurt:      row.grievousHurt      ?? 0,
            hurtByKnife:       row.hurtByKnife       ?? 0,
            robbery:           row.robbery           ?? 0,
            extortion:         row.extortion         ?? 0,
            unnaturalOffense:  row.unnaturalOffense  ?? 0,
            sexualAbuse:       row.sexualAbuse        ?? 0,
          },
        }));
        setAllStats(formatted);
      }
    };
    load();
  }, []);

  // ── tRPC ──────────────────────────────────────────────────────────────────────
  const { data: fetchedPredictions } = (trpc as any).crime.getPredictions.useQuery(
    { districtId: parseInt(selectedDistrict) },
    { enabled: !!selectedDistrict }
  );

  useEffect(() => {
    if (fetchedPredictions) setPredictions(fetchedPredictions as Prediction[]);
  }, [fetchedPredictions]);

  const generatePredictions = (trpc as any).crime.generatePredictions.useMutation();

  const handleAnalyze = () => {
    if (!selectedDistrict) return;
    setIsAnalyzing(true);
    setAnalyzed(false);
    generatePredictions.mutate({}, {
      onSettled: () => {
        setTimeout(() => {
          setIsAnalyzing(false);
          setAnalyzed(true);
        }, 1200);
      },
    });
  };

  // ── Chart data ────────────────────────────────────────────────────────────────
  // Key fix: the last historical point gets predicted = its actual value so that
  // Recharts has TWO non-null predicted points and can draw a line segment to 2026.
  const chartData: ChartPoint[] = (() => {
    if (!selectedDistrict) return [];
    const distId = parseInt(selectedDistrict);

    const historicalSorted = allStats
      .filter((r) => r.district?.id === distId)
      .map((r) => ({ year: r.stat.year, actual: r.stat[selectedCrime] ?? 0 }))
      .sort((a, b) => a.year - b.year);

    const predRow = predictions.find(
      (p) => p.crimeType?.toLowerCase().replace(/\s/g, "") === selectedCrime.toLowerCase()
    );

    const points: ChartPoint[] = historicalSorted.map((h, i) => ({
      year:      h.year,
      actual:    h.actual,
      // Anchor the predicted line at the last historical point
      predicted: (i === historicalSorted.length - 1 && predRow != null) ? h.actual : null,
    }));

    if (predRow != null) {
      points.push({
        year:      predRow.predictedYear,
        actual:    null,
        predicted: predRow.predictedValue,
      });
    }

    return points;
  })();

  // ── Summary values ────────────────────────────────────────────────────────────
  const selectedCrimePred = predictions.find(
    (p) => p.crimeType?.toLowerCase().replace(/\s/g, "") === selectedCrime.toLowerCase()
  );
  const predValue = selectedCrimePred?.predictedValue ?? 0;
  const riskLevel = getRiskLevel(selectedCrime, predValue);
  const riskMeta  = RISK_META[riskLevel];
  const distName  = districts.find((d) => d.id === parseInt(selectedDistrict))?.name ?? "";
  const totalPred = predictions.reduce((s, p) => s + (p.predictedValue ?? 0), 0);

  const axisStyle = { fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", fill: "#455060" };
  const gridStyle = { stroke: "rgba(255,107,74,0.05)", strokeDasharray: "4 4" };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#060810", padding: "1.5rem 2rem", fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap');

        .pc { background:#0a0d14; border:1px solid rgba(255,107,74,0.1); position:relative; overflow:hidden; }
        .pc::before { content:''; position:absolute; top:0; left:0; right:0; height:1.5px;
          background:linear-gradient(90deg,#ff6b4a,rgba(255,107,74,0.2),transparent); }
        .pc-corner { position:absolute; top:0; right:0; width:14px; height:14px;
          border-top:1.5px solid rgba(255,107,74,0.6); border-right:1.5px solid rgba(255,107,74,0.6); }
        .pc-corner-bl { position:absolute; bottom:0; left:0; width:14px; height:14px;
          border-bottom:1.5px solid rgba(255,107,74,0.2); border-left:1.5px solid rgba(255,107,74,0.2); }

        .mono-label { font-family:'Space Mono',monospace; font-size:0.5rem;
          letter-spacing:0.18em; color:#ff6b4a; text-transform:uppercase; }
        .bebas { font-family:'Bebas Neue',sans-serif; }

        .pred-select { width:100%; background:#060810; border:1px solid rgba(255,107,74,0.2);
          color:#cdd9e5; font-family:'Space Mono',monospace; font-size:0.62rem;
          padding:0.6rem 0.8rem; appearance:none; cursor:pointer; outline:none; border-radius:0;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23ff6b4a'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:right 0.8rem center; }
        .pred-select:focus { border-color:rgba(255,107,74,0.5); }
        .pred-select option { background:#0a0d14; }

        .risk-badge { display:inline-flex; align-items:center; gap:0.4rem; padding:0.25rem 0.7rem;
          font-family:'Space Mono',monospace; font-size:0.5rem; font-weight:700;
          letter-spacing:0.16em; text-transform:uppercase; border:1px solid; }

        .analyze-btn { width:100%; background:linear-gradient(135deg,#ff6b4a,#e8441f);
          color:#060810; font-family:'Space Mono',monospace; font-size:0.7rem; font-weight:700;
          letter-spacing:0.16em; padding:0.9rem; border:none; cursor:pointer; text-transform:uppercase;
          display:flex; align-items:center; justify-content:center; gap:0.5rem;
          transition:all 0.2s; position:relative; overflow:hidden; }
        .analyze-btn::after { content:''; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);
          transform:translateX(-100%); transition:transform 0.4s; }
        .analyze-btn:hover::after { transform:translateX(100%); }
        .analyze-btn:hover:not(:disabled) { box-shadow:0 0 24px rgba(255,107,74,0.4); }
        .analyze-btn:disabled { opacity:0.5; cursor:not-allowed; }

        .model-badge { display:inline-flex; align-items:center; gap:0.3rem; padding:0.18rem 0.5rem;
          background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.25);
          font-family:'Space Mono',monospace; font-size:0.48rem; letter-spacing:0.1em;
          color:#38bdf8; text-transform:uppercase; }

        .stat-val { font-family:'Bebas Neue',sans-serif; font-size:1.8rem; color:#fff; line-height:1; }
        .stat-sub { font-family:'Space Mono',monospace; font-size:0.48rem; color:#455060;
          letter-spacing:0.1em; margin-top:0.3rem; }

        .pred-table { width:100%; border-collapse:collapse; }
        .pred-th { font-family:'Space Mono',monospace; font-size:0.48rem; letter-spacing:0.14em;
          text-transform:uppercase; color:#455060; padding:0.6rem 1rem; text-align:left;
          border-bottom:1px solid rgba(255,107,74,0.08); background:#080b12; }
        .pred-tr { border-bottom:1px solid rgba(255,107,74,0.04); transition:background 0.15s; cursor:pointer; }
        .pred-tr:hover { background:rgba(255,107,74,0.025); }
        .pred-td { padding:0.6rem 1rem; font-family:'Space Mono',monospace; font-size:0.58rem; color:#8b949e; }
        .pred-td.big { font-family:'Bebas Neue',sans-serif; font-size:1rem; color:#e2e8f0; }

        @keyframes pulse-slow { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .fade-in { animation:fade-in 0.4s ease both; }

        .crime-pill { padding:0.3rem 0.6rem; border:1px solid rgba(255,107,74,0.15);
          font-family:'Space Mono',monospace; font-size:0.48rem; letter-spacing:0.08em;
          color:#455060; cursor:pointer; transition:all 0.15s; text-transform:uppercase;
          white-space:nowrap; background:transparent; }
        .crime-pill.active { background:rgba(255,107,74,0.12); border-color:rgba(255,107,74,0.4); color:#ff6b4a; }
        .crime-pill:hover:not(.active) { border-color:rgba(255,107,74,0.25); color:#8b949e; }

        .waiting { display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding:5rem 2rem; text-align:center; }
        .waiting-ring { width:80px; height:80px; border:1px solid rgba(255,107,74,0.15);
          display:flex; align-items:center; justify-content:center;
          margin-bottom:1.5rem; position:relative; }
        .waiting-ring::before { content:''; position:absolute; inset:-4px;
          border:1px solid rgba(255,107,74,0.06); }
      `}</style>

      <div style={{ maxWidth: "1360px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.75rem" }}>
          <div>
            <div className="mono-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <div style={{ width: 20, height: 1, background: "#ff6b4a" }} />
              Predictive Analytics Engine — Hybrid RF+XGBoost
            </div>
            <h1 className="bebas" style={{ fontSize: "clamp(2.2rem,4vw,3.6rem)", color: "#fff", letterSpacing: "0.03em", lineHeight: 0.92, margin: 0 }}>
              Crime Predictions <span style={{ color: "#ff6b4a" }}>2026</span>
            </h1>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", color: "#455060", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "0.35rem" }}>
              Sri Lanka District-Level Forecast · All 25 Districts · 13 Crime Categories
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div className="model-badge"><Cpu size={9} /> RF Model</div>
            <div className="model-badge" style={{ background: "rgba(167,139,250,0.08)", borderColor: "rgba(167,139,250,0.25)", color: "#a78bfa" }}>
              <Cpu size={9} /> XGBoost
            </div>
            <div style={{
              padding: "0.18rem 0.5rem", background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.25)", fontFamily: "'Space Mono',monospace",
              fontSize: "0.48rem", letterSpacing: "0.1em", color: "#22c55e",
              display: "flex", alignItems: "center", gap: "0.3rem",
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: "pulse-slow 2s infinite" }} />
              HYBRID ACTIVE
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1rem", marginBottom: "1rem" }}>

          {/* Left panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* 01 District */}
            <div className="pc" style={{ padding: "1.25rem" }}>
              <div className="pc-corner" />
              <div className="pc-corner-bl" />
              <div className="mono-label" style={{ marginBottom: "0.6rem" }}>01 — District</div>
              <select
                className="pred-select"
                value={selectedDistrict}
                onChange={(e) => { setDistrict(e.target.value); setAnalyzed(false); }}
              >
                <option value="">Select District...</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {selectedDistrict && (
                <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", color: "#22c55e", letterSpacing: "0.1em" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: "pulse-slow 2s infinite" }} />
                  DISTRICT LOCKED — ID {selectedDistrict}
                </div>
              )}
            </div>

            {/* 02 Crime category pills */}
            <div className="pc" style={{ padding: "1.25rem" }}>
              <div className="pc-corner" />
              <div className="mono-label" style={{ marginBottom: "0.75rem" }}>02 — Crime Category</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {CRIME_KEYS.map((key) => (
                  <button
                    key={key}
                    className={`crime-pill${selectedCrime === key ? " active" : ""}`}
                    onClick={() => setCrime(key)}
                  >
                    {CRIME_LABELS[key].replace("over Rs. 50,000", "50k+").replace("by Knife", "(Knife)")}
                  </button>
                ))}
              </div>
            </div>

            {/* 03 Model config */}
            <div className="pc" style={{ padding: "1.25rem" }}>
              <div className="pc-corner" />
              <div className="mono-label" style={{ marginBottom: "0.75rem" }}>03 — Model Configuration</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {(
                  [
                    ["Architecture",   "Hybrid RF + XGBoost"],
                    ["Training Period", "2021 – 2023"],
                    ["Forecast Year",   "2026"],
                    ["Prediction Type", "Point Forecast"],
                    ["Coverage",        "25 Districts × 13 Types"],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid rgba(255,107,74,0.05)" }}>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", color: "#455060", letterSpacing: "0.06em" }}>{k}</span>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", color: "#cdd9e5", letterSpacing: "0.04em" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Run analysis */}
            <div className="pc" style={{ padding: "1.25rem" }}>
              <div className="pc-corner" />
              <div className="bebas" style={{ fontSize: "1.2rem", color: "#fff", letterSpacing: "0.04em", marginBottom: "0.5rem" }}>
                Run Prediction Analysis
              </div>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", color: "#455060", letterSpacing: "0.04em", lineHeight: 1.7, marginBottom: "1rem" }}>
                Execute hybrid RF+XGBoost inference on district crime clusters for 2026 threat projection.
              </p>
              <button className="analyze-btn" onClick={handleAnalyze} disabled={!selectedDistrict || isAnalyzing}>
                {isAnalyzing
                  ? <><Activity size={13} style={{ animation: "pulse-slow 1s infinite" }} /> Processing...</>
                  : <><Zap size={13} /> Initialize Analysis</>
                }
              </button>
              {analyzed && (
                <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.8rem", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", color: "#22c55e", display: "flex", alignItems: "center", gap: "0.5rem", letterSpacing: "0.06em" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Predictions loaded for {distName}
                </div>
              )}
            </div>

          </div>

          {/* Right panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {selectedDistrict ? (
              <>
                {/* Risk strip */}
                <div className="pc fade-in" style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                  <div className="pc-corner" />
                  <div>
                    <div className="mono-label" style={{ marginBottom: "0.3rem" }}>Active Forecast Target</div>
                    <div className="bebas" style={{ fontSize: "1.8rem", color: "#fff", letterSpacing: "0.03em", lineHeight: 1 }}>
                      {distName} — {CRIME_LABELS[selectedCrime]}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <div>
                      <div className="mono-label" style={{ marginBottom: "0.3rem" }}>2026 Forecast</div>
                      <div className="bebas" style={{ fontSize: "2rem", color: "#ff6b4a", letterSpacing: "0.02em" }}>
                        {predValue > 0 ? <AnimatedNumber target={predValue} /> : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="mono-label" style={{ marginBottom: "0.3rem" }}>Risk Level</div>
                      <div className="risk-badge" style={{ color: riskMeta.color, background: riskMeta.bg, borderColor: riskMeta.border }}>
                        {riskMeta.icon} {riskLevel}
                      </div>
                    </div>
                    <div>
                      <div className="mono-label" style={{ marginBottom: "0.3rem" }}>Model</div>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", color: "#38bdf8", letterSpacing: "0.06em" }}>
                        hybrid_rf_xgb
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line chart */}
                <div className="pc fade-in" style={{ padding: "1.25rem" }}>
                  <div className="pc-corner" />
                  <div className="mono-label" style={{ marginBottom: "0.25rem" }}>Historical vs Predicted Trend</div>
                  <div className="bebas" style={{ fontSize: "1rem", color: "#e2e8f0", letterSpacing: "0.04em", marginBottom: "1rem" }}>
                    {distName} — {CRIME_LABELS[selectedCrime]}
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid {...gridStyle} />
                      <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={axisStyle} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                      />
                      <Tooltip content={<SentinelTooltip />} />
                      <Legend wrapperStyle={{ fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", color: "#455060" }} />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#ff6b4a"
                        strokeWidth={2}
                        name="Historical"
                        dot={{ fill: "#ff6b4a", r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        strokeDasharray="6 4"
                        name="Predicted 2026"
                        dot={<PredictedDot />}
                        activeDot={{ r: 9, fill: "#38bdf8", stroke: "#060810", strokeWidth: 2 }}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Predictions table */}
                {predictions.length > 0 && (
                  <div className="pc fade-in">
                    <div className="pc-corner" />
                    <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,107,74,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div className="mono-label" style={{ marginBottom: "0.2rem" }}>Prediction Data Table</div>
                        <div className="bebas" style={{ fontSize: "1.1rem", color: "#e2e8f0", letterSpacing: "0.04em" }}>
                          {distName} — All Categories · 2026
                        </div>
                      </div>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", color: "#455060" }}>
                        {predictions.length} predictions · Hybrid RF+XGBoost
                      </div>
                    </div>
                    <table className="pred-table">
                      <thead>
                        <tr>
                          <th className="pred-th">#</th>
                          <th className="pred-th">Crime Category</th>
                          <th className="pred-th">DB Key</th>
                          <th className="pred-th">Year</th>
                          <th className="pred-th">Predicted Cases</th>
                          <th className="pred-th">Risk Level</th>
                          <th className="pred-th">Model</th>
                          <th className="pred-th">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CRIME_KEYS.map((key, i) => {
                          const pred = predictions.find(
                            (p) => p.crimeType?.toLowerCase().replace(/\s/g, "") === key.toLowerCase()
                          );
                          const val     = pred?.predictedValue ?? 0;
                          const risk    = getRiskLevel(key, val);
                          const rm      = RISK_META[risk];
                          const conf    = pred?.confidence ?? 0;
                          const confPct = conf < 0
                            ? `${(Math.abs(conf) * 100).toFixed(1)}% (inv)`
                            : `${(conf * 100).toFixed(1)}%`;
                          return (
                            <tr
                              key={key}
                              className="pred-tr"
                              style={{ background: key === selectedCrime ? "rgba(255,107,74,0.04)" : undefined }}
                              onClick={() => setCrime(key)}
                            >
                              <td className="pred-td" style={{ color: "#2d3a4a" }}>{String(i + 1).padStart(2, "0")}</td>
                              <td className="pred-td big">{CRIME_LABELS[key]}</td>
                              <td className="pred-td" style={{ color: "#38bdf8", fontSize: "0.5rem" }}>{key}</td>
                              <td className="pred-td big">{pred?.predictedYear ?? 2026}</td>
                              <td className="pred-td big" style={{ color: key === selectedCrime ? "#ff6b4a" : "#e2e8f0" }}>
                                {val.toLocaleString()}
                              </td>
                              <td className="pred-td">
                                <span className="risk-badge" style={{ color: rm.color, background: rm.bg, borderColor: rm.border, padding: "0.18rem 0.5rem" }}>
                                  {risk}
                                </span>
                              </td>
                              <td className="pred-td" style={{ fontSize: "0.48rem", color: "#455060" }}>hybrid_rf_xgb</td>
                              <td className="pred-td">
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <div style={{ flex: 1, height: 3, background: "#111820", maxWidth: 60 }}>
                                    <div style={{ height: "100%", background: conf < 0 ? "#eab308" : "#ff6b4a", width: `${Math.abs(conf) * 100}%` }} />
                                  </div>
                                  <span style={{ fontSize: "0.48rem" }}>{confPct}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="pc" style={{ minHeight: 500 }}>
                <div className="waiting">
                  <div className="waiting-ring">
                    <Target size={28} style={{ color: "#ff6b4a", opacity: 0.4 }} />
                  </div>
                  <div className="bebas" style={{ fontSize: "1.6rem", color: "#cdd9e5", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                    Awaiting District Selection
                  </div>
                  <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", color: "#2d3a4a", letterSpacing: "0.06em", lineHeight: 1.8, maxWidth: 320, textAlign: "center" }}>
                    Select a district to activate predictive analytics. Choose a crime category and run the hybrid RF+XGBoost model to view 2026 forecasts.
                  </p>
                  <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center", maxWidth: 360 }}>
                    {["25 Districts", "13 Crime Types", "RF + XGBoost", "2026 Forecast"].map((t) => (
                      <div key={t} style={{ padding: "0.2rem 0.6rem", border: "1px solid rgba(255,107,74,0.1)", fontFamily: "'Space Mono',monospace", fontSize: "0.48rem", color: "#2d3a4a", letterSpacing: "0.1em" }}>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "1rem" }}>
          {(
            [
              { icon: <Database   size={16} />, label: "Districts Covered",   val: "25",   sub: "All Sri Lanka"       },
              { icon: <Activity   size={16} />, label: "Crime Categories",    val: "13",   sub: "Tracked types"       },
              { icon: <Cpu        size={16} />, label: "Model Architecture",  val: "2",    sub: "RF + XGBoost hybrid" },
              { icon: <TrendingUp size={16} />, label: "Forecast Year",       val: "2026", sub: "Point predictions"   },
              {
                icon:  <Shield size={16} />,
                label: "Total Predictions",
                val:   selectedDistrict && predictions.length > 0 ? totalPred.toLocaleString() : "—",
                sub:   selectedDistrict ? `${distName} total` : "Select district",
              },
            ] as { icon: React.ReactNode; label: string; val: string; sub: string }[]
          ).map(({ icon, label, val, sub }) => (
            <div key={label} className="pc" style={{ padding: "1rem 1.25rem" }}>
              <div style={{ color: "#ff6b4a", marginBottom: "0.6rem", opacity: 0.8 }}>{icon}</div>
              <div className="mono-label" style={{ marginBottom: "0.3rem" }}>{label}</div>
              <div className="stat-val">{val}</div>
              <div className="stat-sub">{sub}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}