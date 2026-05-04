import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Target,
  Database,
  AlertTriangle,
  TrendingUp,
  Crosshair,
  BarChart3,
} from "lucide-react";

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

type CrimeKey = keyof Omit<CrimeStat, "year">;
type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

interface ApiClassificationResponse {
  district: string;
  predictedRisk: RiskLevel | string;
  confidence: number;
  probabilities: Record<string, number>;
  categoryBreakdown: Record<string, number>;
}

interface ChartPoint {
  year: string;
  actual: number | null;
  predicted: number | null;
}

interface RiskMeta {
  color: string;
  bg: string;
  border: string;
  icon: string;
}

interface AnimatedNumberProps {
  target: number;
  duration?: number;
  suffix?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL = "http://localhost:5000";

const CRIME_LABELS: Record<CrimeKey, string> = {
  rapeCases: "Rape Cases",
  homicide: "Homicide",
  attemptedHomicide: "Attempted Homicide",
  abduction: "Abduction",
  kidnapping: "Kidnapping",
  arson: "Arson",
  theftOver50k: "Theft over Rs. 50,000",
  grievousHurt: "Grievous Hurt",
  hurtByKnife: "Hurt by Knife",
  robbery: "Robbery",
  extortion: "Extortion",
  unnaturalOffense: "Unnatural Offense",
  sexualAbuse: "Sexual Abuse",
};

const CRIME_KEYS = Object.keys(CRIME_LABELS) as CrimeKey[];

const API_LABEL_TO_CRIME_KEY: Record<string, CrimeKey> = {
  "Rape Cases": "rapeCases",
  Homicide: "homicide",
  "Attempted Homicide": "attemptedHomicide",
  Abduction: "abduction",
  Kidnapping: "kidnapping",
  Arson: "arson",
  "Theft over Rs. 50,000": "theftOver50k",
  "Grievous Hurt": "grievousHurt",
  "Hurt by Knife": "hurtByKnife",
  Robbery: "robbery",
  Extortion: "extortion",
  "Unnatural Offense": "unnaturalOffense",
  "Sexual Abuse": "sexualAbuse",
};

const CRIME_KEY_TO_API_LABEL = Object.fromEntries(
  Object.entries(API_LABEL_TO_CRIME_KEY).map(([label, key]) => [key, label])
) as Record<CrimeKey, string>;

const RISK_META: Record<RiskLevel, RiskMeta> = {
  HIGH: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.3)",
    icon: "🟠",
  },
  MEDIUM: {
    color: "#eab308",
    bg: "rgba(234,179,8,0.08)",
    border: "rgba(234,179,8,0.3)",
    icon: "🟡",
  },
  LOW: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.3)",
    icon: "🟢",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeRiskLevel(level?: string): RiskLevel {
  const upper = String(level || "LOW").toUpperCase();
  if (upper === "HIGH" || upper === "MEDIUM" || upper === "LOW") return upper;
  return "LOW";
}

function formatPercent(value: number, decimals = 1) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(decimals)}%`;
}

function getCategoryPercent(
  classification: ApiClassificationResponse | null,
  crimeKey: CrimeKey
) {
  if (!classification?.categoryBreakdown) return 0;
  const apiLabel = CRIME_KEY_TO_API_LABEL[crimeKey];
  return Number(classification.categoryBreakdown[apiLabel] ?? 0);
}

function getHistoricalCategoryPercent(row: CrimeStat, crimeKey: CrimeKey) {
  const total = CRIME_KEYS.reduce((sum, key) => sum + Number(row[key] ?? 0), 0);
  if (!total) return 0;
  return (Number(row[crimeKey] ?? 0) / total) * 100;
}

function getImpactLevel(percent: number): RiskLevel {
  if (percent >= 15) return "HIGH";
  if (percent >= 5) return "MEDIUM";
  return "LOW";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnimatedNumber({ target, duration = 900, suffix = "" }: AnimatedNumberProps) {
  const [val, setVal] = useState<number>(0);

  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      setVal(prog * target);
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return (
    <span>
      {val.toFixed(target >= 10 ? 1 : 2)}{suffix}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Predictions() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [allStats, setAllStats] = useState<StatRow[]>([]);
  const [selectedDistrict, setDistrict] = useState<string>("");
  const [selectedCrime, setCrime] = useState<CrimeKey>("robbery");
  const [isDistrictOpen, setDistrictOpen] = useState<boolean>(false);
  const [classification, setClassification] = useState<ApiClassificationResponse | null>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState<boolean>(false);
  const [predictionError, setPredictionError] = useState<string>("");

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
            year: row.year,
            rapeCases: row.rapeCases ?? 0,
            homicide: row.homicide ?? 0,
            attemptedHomicide: row.attemptedHomicide ?? 0,
            abduction: row.abduction ?? 0,
            kidnapping: row.kidnapping ?? 0,
            arson: row.arson ?? 0,
            theftOver50k: row.theftOver50k ?? 0,
            grievousHurt: row.grievousHurt ?? 0,
            hurtByKnife: row.hurtByKnife ?? 0,
            robbery: row.robbery ?? 0,
            extortion: row.extortion ?? 0,
            unnaturalOffense: row.unnaturalOffense ?? 0,
            sexualAbuse: row.sexualAbuse ?? 0,
          },
        }));
        setAllStats(formatted);
      }
    };

    load();
  }, []);

  const selectedDistrictObj = useMemo(
    () => districts.find((d) => d.id === Number(selectedDistrict)),
    [districts, selectedDistrict]
  );

  const distName = selectedDistrictObj?.name ?? "";

  useEffect(() => {
    const fetchClassification = async () => {
      if (!distName) {
        setClassification(null);
        setPredictionError("");
        return;
      }

      try {
        setIsLoadingPrediction(true);
        setPredictionError("");

        const response = await fetch(
          `${API_BASE_URL}/api/crime/classify/${encodeURIComponent(distName)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch classification");
        }

        setClassification(data as ApiClassificationResponse);
      } catch (error: any) {
        console.error("Classification API error:", error);
        setPredictionError(error?.message || "Prediction API error");
        setClassification(null);
      } finally {
        setIsLoadingPrediction(false);
      }
    };

    fetchClassification();
  }, [distName]);

  const categoryRows = useMemo(() => {
    if (!classification?.categoryBreakdown) return [];

    return Object.entries(classification.categoryBreakdown)
      .filter(([label]) => label !== "Total" && label !== "Year")
      .map(([label, value]) => ({
        label,
        key: API_LABEL_TO_CRIME_KEY[label],
        value: Number(value ?? 0),
      }))
      .filter((item) => item.key)
      .sort((a, b) => b.value - a.value);
  }, [classification]);

  const selectedCategoryPercent = getCategoryPercent(classification, selectedCrime);
  const predictedRisk = safeRiskLevel(classification?.predictedRisk);
  const riskMeta = RISK_META[predictedRisk];
  const confidence = Number(classification?.confidence ?? 0);
  const topThree = categoryRows.slice(0, 3);
  const selectedRank = Math.max(
    1,
    categoryRows.findIndex((row) => row.key === selectedCrime) + 1
  );

  const chartData: ChartPoint[] = useMemo(() => {
    if (!selectedDistrict) return [];
    const distId = Number(selectedDistrict);

    const historicalSorted = allStats
      .filter((r) => r.district?.id === distId)
      .map((r) => ({
        year: r.stat.year,
        actual: getHistoricalCategoryPercent(r.stat, selectedCrime),
      }))
      .sort((a, b) => a.year - b.year);

    const points: ChartPoint[] = historicalSorted.map((h) => ({
      year: String(h.year),
      actual: h.actual,
      predicted: null,
    }));

    points.push({
      year: "2027",
      actual: null,
      predicted: selectedCategoryPercent,
    });

    return points;
  }, [selectedDistrict, allStats, selectedCrime, selectedCategoryPercent]);

  const historicalLatest = chartData.filter((p) => p.actual !== null).at(-1)?.actual ?? 0;
  const changePercent = historicalLatest > 0
    ? Math.round(((selectedCategoryPercent - historicalLatest) / historicalLatest) * 100)
    : 0;

  const chartBars = chartData.map((p) => ({
    ...p,
    bar: p.predicted ?? p.actual ?? 0,
    type: p.predicted !== null ? "Forecast" : "Observed",
  }));

  const maxBar = Math.max(...chartBars.map((p) => p.bar), 1);
  const riskProbabilities = classification?.probabilities ?? {};

  return (
    <div className="sentinel-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');
        :root { --accent:#ff7a18; --accent-2:#ff7a18; --bg:#0b0b0c; --panel:#161616; --panel-2:#1f1f1f; --muted:#8b8b8b; --line:rgba(255,255,255,.08); --green:#00f0a0; --yellow:#f8d66d; }
        .sentinel-page { min-height:100vh; background:#0a0a0b; color:#fff; font-family:'Inter',sans-serif; overflow:hidden; }
        .sentinel-page * { box-sizing:border-box; }
        .mono { font-family:'Space Mono',monospace; }
        .main { min-width:0; background:radial-gradient(circle at 35% 0%, rgba(255,122,24,.04), transparent 36%), #0b0b0c; }
        .content { padding:28px 52px 48px; width:100%; }
        .hero-grid { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:24px; align-items:start; }
        .eyebrow { font-family:'Space Mono',monospace; color:#bfbfbf; letter-spacing:.32em; text-transform:uppercase; font-size:.78rem; margin-top:6px; }
        .title { font-family:'Bebas Neue',sans-serif; font-size:clamp(3rem, 5.2vw, 5rem); line-height:.92; margin:28px 0 8px; letter-spacing:-.02em; }
        .title span { color:var(--accent); }
        .subtitle { font-family:'Space Mono',monospace; letter-spacing:.3em; text-transform:uppercase; color:#b9b9b9; font-size:.78rem; }
        .district-card,.panel,.impact-card { background:#171717; border:1px solid var(--line); border-radius:8px; }
        .district-card { padding:22px; }
        .card-label { font-family:'Space Mono',monospace; color:#777; font-size:.68rem; letter-spacing:.14em; text-transform:uppercase; margin-bottom:10px; }
        .custom-select { position:relative; width:100%; }
        .custom-select-trigger { width:100%; background:transparent; color:#fff; border:0; border-bottom:1px solid rgba(255,122,24,.45); padding:8px 34px 14px 0; font-family:'Bebas Neue',sans-serif; font-size:1.65rem; line-height:1; text-align:left; outline:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
        .custom-select-trigger .chev { color:var(--accent); font-size:1.2rem; transform:translateY(-2px); transition:.15s; }
        .custom-select.open .chev { transform:rotate(180deg) translateY(2px); }
        .custom-options { position:absolute; top:calc(100% + 8px); left:0; right:0; z-index:50; max-height:330px; overflow-y:auto; background:#f4f4f4; color:#151515; border-radius:8px; padding:8px; box-shadow:0 18px 45px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.14); }
        .custom-options::-webkit-scrollbar { width:8px; }
        .custom-options::-webkit-scrollbar-track { background:#e7e7e7; border-radius:10px; }
        .custom-options::-webkit-scrollbar-thumb { background:#9b9b9b; border-radius:10px; }
        .custom-option { width:100%; border:0; background:transparent; color:#232323; display:flex; align-items:center; justify-content:space-between; padding:9px 10px; border-radius:7px; font-family:'Inter',sans-serif; font-size:.95rem; text-align:left; cursor:pointer; }
        .custom-option:hover { background:#e8e8e8; }
        .custom-option.active { background:#e8e8e8; }
        .custom-check { color:#404040; font-size:1rem; font-weight:800; }
        .status-row { display:flex; gap:8px; margin-top:14px; flex-wrap:wrap; }
        .tag { font-family:'Space Mono',monospace; font-size:.62rem; font-weight:700; padding:6px 9px; border-radius:2px; text-transform:uppercase; }
        .tag.green { color:var(--green); border:1px solid rgba(0,240,160,.35); background:rgba(0,240,160,.08); }
        .tag.yellow { color:var(--yellow); border:1px solid rgba(248,214,109,.35); background:rgba(248,214,109,.08); }
        .tag.red { color:#ff8a2a; border:1px solid rgba(255,122,24,.35); background:rgba(255,122,24,.08); }
        .dashboard { margin-top:42px; display:grid; grid-template-columns:1.3fr .9fr; gap:24px; }
        .panel { padding:28px; position:relative; overflow:hidden; }
        .panel.glow { background:linear-gradient(135deg, rgba(255,122,24,.12), rgba(23,23,23,1) 45%); }
        .warning { color:#ff8a2a; font-family:'Space Mono',monospace; font-weight:700; letter-spacing:.14em; font-size:.78rem; text-transform:uppercase; display:flex; align-items:center; gap:10px; }
        .metric-label { color:#bbb; font-family:'Space Mono',monospace; letter-spacing:.18em; text-transform:uppercase; margin-top:28px; }
        .big-percent { font-family:'Bebas Neue',sans-serif; font-size:6.2rem; line-height:.95; letter-spacing:-.03em; margin-top:12px; }
        .metric-caption { color:#ffb46b; font-family:'Bebas Neue',sans-serif; font-size:1.15rem; display:inline-flex; align-items:center; gap:10px; margin-left:10px; }
        .mini-stats { border-top:1px solid var(--line); margin-top:28px; padding-top:22px; display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
        .mini-title { color:#777; font-size:.62rem; text-transform:uppercase; }
        .mini-val { font-weight:800; font-size:1.35rem; margin-top:6px; }
        .mini-val.green { color:var(--green); }
        .right-stack { display:flex; flex-direction:column; gap:20px; }
        .map-box { height:180px; background:#030303; border-radius:8px 8px 0 0; border-bottom:1px solid var(--line); position:relative; overflow:hidden; }
        .map-lines { position:absolute; inset:0; background:linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px); background-size:18px 18px; transform:perspective(250px) rotateX(54deg) translateY(-50px); opacity:.5; }
        .critical-label { position:absolute; top:18px; left:18px; background:#161616; color:#aaa; border-radius:20px; padding:6px 12px; font-family:'Space Mono',monospace; font-size:.62rem; letter-spacing:.12em; }
        .deploy { padding:24px; }
        .deploy-title { font-family:'Bebas Neue',sans-serif; font-size:1.35rem; letter-spacing:.06em; margin-bottom:16px; }
        .risk-badge { border:1px solid; padding:10px 12px; border-radius:4px; font-family:'Space Mono',monospace; font-size:.8rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase; display:flex; justify-content:space-between; align-items:center; }
        .prob-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:14px; }
        .prob-card { background:#202020; border:1px solid var(--line); padding:10px; border-radius:4px; }
        .prob-label { color:#999; font-family:'Space Mono',monospace; font-size:.58rem; letter-spacing:.12em; }
        .prob-value { font-family:'Bebas Neue',sans-serif; font-size:1.3rem; margin-top:3px; }
        .crime-selector { display:flex; gap:8px; flex-wrap:wrap; margin-top:20px; }
        .crime-pill { background:#202020; border:1px solid var(--line); color:#aaa; padding:7px 10px; border-radius:3px; font-family:'Space Mono',monospace; font-size:.58rem; text-transform:uppercase; cursor:pointer; transition:.15s; }
        .crime-pill.active { background:rgba(255,122,24,.16); color:#ffb46b; border-color:rgba(255,122,24,.45); }
        .impact-grid { margin-top:24px; display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .impact-card { padding:22px; min-height:190px; cursor:pointer; transition:.15s; }
        .impact-card:hover { transform:translateY(-2px); border-color:rgba(255,122,24,.35); }
        .impact-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; }
        .icon-box { width:36px; height:36px; background:#252525; display:grid; place-items:center; }
        .impact-title { font-family:'Bebas Neue',sans-serif; font-size:1.35rem; }
        .impact-desc { color:#8d8d8d; font-size:.78rem; line-height:1.45; min-height:46px; }
        .impact-value { font-family:'Bebas Neue',sans-serif; font-size:2rem; margin-top:16px; }
        .chart-panel { margin-top:24px; }
        .bars { height:250px; display:flex; align-items:end; gap:4px; padding:20px 0 0; }
        .bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:end; height:100%; }
        .bar { width:100%; max-width:145px; background:rgba(255,122,24,.35); border-top:2px solid rgba(255,122,24,.7); min-height:8px; position:relative; }
        .bar.forecast { background:rgba(255,122,24,.55); box-shadow:0 0 24px rgba(255,122,24,.12); }
        .bar-label { color:#666; font-size:.68rem; margin-top:10px; }
        .bar-label.forecast { color:#ffb46b; font-weight:700; }
        .insights { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:24px; }
        .insight { background:#262626; border-left:4px solid var(--accent); padding:14px 16px; font-size:.82rem; line-height:1.45; }
        .insight.green { border-left-color:var(--green); }
        .waiting { min-height:500px; display:grid; place-items:center; text-align:center; }
        .waiting-ring { width:86px; height:86px; border:1px solid rgba(255,122,24,.25); display:grid; place-items:center; margin:0 auto 22px; position:relative; }
        .waiting-ring:before { content:''; position:absolute; inset:-8px; border:1px solid rgba(255,122,24,.08); }
        .error-box { margin-top:42px; border:1px solid rgba(239,68,68,.35); background:rgba(239,68,68,.08); color:#ffb4b4; padding:18px; border-radius:8px; font-family:'Space Mono',monospace; font-size:.75rem; }
        @media (max-width:1100px){ .content{padding:34px 22px}.hero-grid,.dashboard,.impact-grid,.insights{grid-template-columns:1fr}.mini-stats{grid-template-columns:1fr 1fr}.big-percent{font-size:4.8rem} }
      `}</style>

      <main className="main">
        <section className="content">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">— PREDICTIVE ANALYTICS ENGINE — RANDOM FOREST CLASSIFIER</div>
              <h1 className="title">
                CRIME CLASSIFICATION &<br />
                <span>RISK ANALYSIS 2027</span>
              </h1>
              <div className="subtitle">Strategic Forecasting • Sri Lanka District Model</div>
            </div>

            <div className="district-card">
              <div className="card-label">District Selection</div>
              <div className={`custom-select ${isDistrictOpen ? "open" : ""}`}>
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setDistrictOpen((open) => !open)}
                >
                  <span>{distName ? distName.toUpperCase() : "SELECT DISTRICT"}</span>
                  <span className="chev">⌄</span>
                </button>

                {isDistrictOpen && (
                  <div className="custom-options">
                    <button
                      type="button"
                      className={`custom-option ${!selectedDistrict ? "active" : ""}`}
                      onClick={() => {
                        setDistrict("");
                        setClassification(null);
                        setDistrictOpen(false);
                      }}
                    >
                      <span>SELECT DISTRICT</span>
                      {!selectedDistrict && <span className="custom-check">✓</span>}
                    </button>

                    {districts.map((d) => {
                      const value = String(d.id);
                      const active = selectedDistrict === value;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          className={`custom-option ${active ? "active" : ""}`}
                          onClick={() => {
                            setDistrict(value);
                            setDistrictOpen(false);
                          }}
                        >
                          <span>{d.name}</span>
                          {active && <span className="custom-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="status-row">
                <span className="tag green">Operational</span>
                <span className="tag yellow">Random Forest</span>
              </div>
            </div>
          </div>

          {predictionError && <div className="error-box">API ERROR: {predictionError}</div>}

          {selectedDistrict ? (
            <>
              <div className="dashboard">
                <div className="panel glow">
                  <div className="warning">
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
                    RF Classification Active
                  </div>
                  <div className="metric-label">Predicted Crime Risk Confidence</div>
                  <div>
                    <span className="big-percent">
                      {isLoadingPrediction ? "..." : <><AnimatedNumber target={confidence} suffix="%" /></>}
                    </span>
                    <span className="metric-caption">
                      <TrendingUp size={34} /> {predictedRisk} RISK
                    </span>
                  </div>

                  <div className="mini-stats">
                    <div>
                      <div className="mini-title">Selected Category Share</div>
                      <div className="mini-val"><AnimatedNumber target={selectedCategoryPercent} suffix="%" /></div>
                    </div>
                    <div>
                      <div className="mini-title">Model Confidence</div>
                      <div className="mini-val">{formatPercent(confidence)}</div>
                    </div>
                    <div>
                      <div className="mini-title">Category Rank</div>
                      <div className="mini-val green">#{selectedRank}</div>
                    </div>
                  </div>
                </div>

                <div className="right-stack">
                  <div className="panel" style={{ padding: 0 }}>
                    <div className="map-box">
                      <div className="map-lines" />
                      <div className="critical-label">● DISTRICT CRIME ZONES</div>
                    </div>
                    <div className="deploy">
                      <div className="deploy-title">ACTIVE CLASSIFICATION</div>
                      <div className="card-label" style={{ marginBottom: 8 }}>
                        {distName} • {CRIME_LABELS[selectedCrime]}
                      </div>

                      <div
                        className="risk-badge"
                        style={{ color: riskMeta.color, background: riskMeta.bg, borderColor: riskMeta.border }}
                      >
                        <span>{predictedRisk}</span>
                        <span>{formatPercent(confidence)}</span>
                      </div>

                      <div className="prob-grid">
                        {(["HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map((risk) => (
                          <div className="prob-card" key={risk}>
                            <div className="prob-label">{risk}</div>
                            <div className="prob-value" style={{ color: RISK_META[risk].color }}>
                              {formatPercent(Number(riskProbabilities[risk] ?? 0))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="crime-selector">
                        {CRIME_KEYS.map((key) => (
                          <button
                            key={key}
                            className={`crime-pill${selectedCrime === key ? " active" : ""}`}
                            onClick={() => setCrime(key)}
                          >
                            {CRIME_LABELS[key]
                              .replace("over Rs. 50,000", "50k+")
                              .replace("by Knife", "Knife")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="impact-grid">
                {topThree.map((row, i) => {
                  const key = row.key as CrimeKey;
                  const risk = getImpactLevel(row.value);
                  return (
                    <div key={key} className="impact-card" onClick={() => setCrime(key)}>
                      <div className="impact-top">
                        <div className="icon-box">
                          {i === 0 ? <Database size={18} /> : i === 1 ? <AlertTriangle size={18} /> : <Crosshair size={18} />}
                        </div>
                        <span className={risk === "LOW" ? "tag green" : risk === "MEDIUM" ? "tag yellow" : "tag red"}>
                          {risk} Impact
                        </span>
                      </div>
                      <div className="impact-title">{row.label}</div>
                      <div className="impact-desc">
                        Highest category percentage for {distName}. Click to inspect this crime category.
                      </div>
                      <div className="impact-value">
                        {formatPercent(row.value)} <span style={{ color: "#ffb46b", fontFamily: "Space Mono", fontSize: ".6rem" }}>CATEGORY SHARE</span>
                      </div>
                    </div>
                  );
                })}

                <div className="impact-card" onClick={() => setCrime(selectedCrime)}>
                  <div className="impact-top">
                    <div className="icon-box"><BarChart3 size={18} /></div>
                    <span className="tag red">Selected</span>
                  </div>
                  <div className="impact-title">{CRIME_LABELS[selectedCrime]}</div>
                  <div className="impact-desc">Current selected category for percentage-based comparison and trend view.</div>
                  <div className="impact-value">
                    {formatPercent(selectedCategoryPercent)} <span style={{ color: "#ffb46b", fontFamily: "Space Mono", fontSize: ".6rem" }}>SHARE</span>
                  </div>
                </div>
              </div>

              <div className="panel chart-panel">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div className="impact-title">CRIME SHARE TREND 2021–2026</div>
                    <div className="card-label">Historical category percentage vs RF classification output</div>
                  </div>
                  <div className="status-row">
                    <span className="tag red">Forecast</span>
                    <span className="tag yellow">Percentage Share</span>
                  </div>
                </div>

                <div className="bars">
                  {chartBars.map((p) => (
                    <div key={p.year} className="bar-wrap">
                      <div
                        className={`bar ${p.type === "Forecast" ? "forecast" : ""}`}
                        style={{ height: `${Math.max(12, (p.bar / maxBar) * 210)}px` }}
                        title={`${p.year}: ${formatPercent(p.bar)}`}
                      />
                      <div className={`bar-label ${p.type === "Forecast" ? "forecast" : ""}`}>{p.year}</div>
                    </div>
                  ))}
                </div>

                <div className="insights">
                  <div className="insight">
                    <strong style={{ color: "#ffb46b" }}>CRITICAL INSIGHT</strong><br />
                    The RF model classifies <b>{distName}</b> as <b>{predictedRisk}</b> risk with <b>{formatPercent(confidence)}</b> confidence.
                    {" "}<b>{CRIME_LABELS[selectedCrime]}</b> contributes <b>{formatPercent(selectedCategoryPercent)}</b> of the district crime profile.
                  </div>
                  <div className="insight green">
                    <strong style={{ color: "var(--green)" }}>MODEL STATUS</strong><br />
                    Random Forest classification API is active. Change from latest historical percentage: <b>{changePercent >= 0 ? "+" : ""}{changePercent}%</b>.
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="panel waiting" style={{ marginTop: 42 }}>
              <div>
                <div className="waiting-ring"><Target size={34} color="#ff7a18" /></div>
                <div className="impact-title">AWAITING DISTRICT SELECTION</div>
                <p style={{ color: "#777", maxWidth: 420, lineHeight: 1.7, fontFamily: "Space Mono", fontSize: ".72rem" }}>
                  Select a district to activate Random Forest crime classification and percentage-based risk analysis.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
