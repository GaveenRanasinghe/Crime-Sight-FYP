import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Sector,
} from "recharts";
import { TrendingUp, TrendingDown, Download } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

// All slices start monochromatic dark — only the clicked one lights up orange
const MONO_COLORS = [
  "#2a1a15","#321e18","#3a231c","#422720","#4a2b24",
  "#522f28","#5a332c","#623730","#6a3b34","#723f38",
  "#7a433c","#824740","#8a4b44",
];
const ACTIVE_COLOR = "#ff6b4a";
const HOVER_COLOR  = "#cc5239";

const RISK_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high:     "#ea580c",
  medium:   "#f59e0b",
  low:      "#10b981",
};

const YEARS = ["2021", "2022", "2023"];

const CRIME_TYPE_MAP: Record<string, string> = {
  "Rape Cases":           "rapeCases",
  "Homicide":             "homicide",
  "Attempted Homicide":   "attemptedHomicide",
  "Abduction":            "abduction",
  "Kidnapping":           "kidnapping",
  "Arson":                "arson",
  "Theft over Rs.50,000": "theftOver50k",
  "Grievous Hurt":        "grievousHurt",
  "Hurt by Knife":        "hurtByKnife",
  "Robbery":              "robbery",
  "Extortion":            "extortion",
  "Unnatural Offense":    "unnaturalOffense",
  "Sexual Abuse":         "sexualAbuse",
};
const CRIME_TYPES = Object.keys(CRIME_TYPE_MAP);

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawStat {
  id: number;
  districtId: number;
  year: number;
  total: number;
  murder: number;
  rape: number;
  robbery: number;
  assault: number;
  theft: number;
  drugOffenses: number;
  rapeCases: number;
  homicide: number;
  attemptedHomicide: number;
  abduction: number;
  kidnapping: number;
  arson: number;
  theftOver50k: number;
  grievousHurt: number;
  hurtByKnife: number;
  extortion: number;
  unnaturalOffense: number;
  sexualAbuse: number;
  districts: { id: number; name: string }[] | null;
}

interface CrimeStat {
  year: number;
  districtId: number;
  districtName: string;
  total: number;
  murder: number;
  rape: number;
  robbery: number;
  assault: number;
  theft: number;
  drugOffenses: number;
  rapeCases: number;
  homicide: number;
  attemptedHomicide: number;
  abduction: number;
  kidnapping: number;
  arson: number;
  theftOver50k: number;
  grievousHurt: number;
  hurtByKnife: number;
  extortion: number;
  unnaturalOffense: number;
  sexualAbuse: number;
}

interface HighRiskDistrict {
  district: { id: number; name: string };
  summary: {
    totalCrimes: number;
    averagePerYear: number;
    trend: string;
    riskLevel: string;
    yearOverYearChange: number;
  };
}

interface DashboardSummary {
  totalDistricts: number;
  totalCrimes: number;
  averageCrimesPerDistrict: number;
  highRiskCount: number;
  highRiskDistricts: HighRiskDistrict[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRiskLevel(total: number, avg: number): string {
  if (total > avg * 1.5) return "critical";
  if (total > avg * 1.2) return "high";
  if (total > avg * 0.8) return "medium";
  return "low";
}

function getCrimeCount(stat: CrimeStat, type: string): number {
  const col = CRIME_TYPE_MAP[type];
  return col ? (stat as any)[col] ?? 0 : 0;
}

// ─── Active slice shape — expands + glows ─────────────────────────────────────

const ActiveSlice = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={ACTIVE_COLOR}
        stroke={ACTIVE_COLOR}
        strokeWidth={1}
        style={{ filter: "drop-shadow(0 0 10px rgba(255,107,74,0.7))" }}
      />
      {/* Outer ring arc */}
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 14}
        outerRadius={outerRadius + 16}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={ACTIVE_COLOR}
        opacity={0.4}
      />
    </g>
  );
};

// ─── Custom bar tooltip ───────────────────────────────────────────────────────

const SentinelTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", padding: "0.6rem 0.875rem", fontFamily: "'Space Mono',monospace", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
      {label && <div style={{ fontSize: "0.55rem", color: "#ff6b4a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.4rem" }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontSize: "0.65rem", color: "#111", letterSpacing: "0.06em" }}>
          <span style={{ color: p.color, marginRight: "0.3rem" }}>■</span>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats, setStats]     = useState<CrimeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selectedYear, setSelectedYear]           = useState("2023");
  const [selectedCrimeType, setSelectedCrimeType] = useState("Robbery");
  const [activeSlice, setActiveSlice]             = useState<number | null>(null);
  const [hoveredSlice, setHoveredSlice]           = useState<number | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      setLoading(true); setError(null);
      try {
        const { data, error: err } = await supabase
          .from("crimeStatistics")
          .select(`
            id, districtId, year, total,
            murder, rape, robbery, assault, theft, drugOffenses,
            rapeCases, homicide, attemptedHomicide, abduction, kidnapping,
            arson, theftOver50k, grievousHurt, hurtByKnife,
            extortion, unnaturalOffense, sexualAbuse,
            districts ( id, name )
          `)
          .order("year", { ascending: true });
        if (err) throw new Error(err.message);
        const mapped: CrimeStat[] = (data as unknown as RawStat[]).map((row) => ({
          year:              row.year,
          districtId:        row.districtId,
          districtName:      (Array.isArray(row.districts) ? row.districts[0]?.name : (row.districts as any)?.name) ?? `District ${row.districtId}`,
          total:             row.total             ?? 0,
          murder:            row.murder            ?? 0,
          rape:              row.rape              ?? 0,
          robbery:           row.robbery           ?? 0,
          assault:           row.assault           ?? 0,
          theft:             row.theft             ?? 0,
          drugOffenses:      row.drugOffenses      ?? 0,
          rapeCases:         row.rapeCases         ?? 0,
          homicide:          row.homicide          ?? 0,
          attemptedHomicide: row.attemptedHomicide ?? 0,
          abduction:         row.abduction         ?? 0,
          kidnapping:        row.kidnapping        ?? 0,
          arson:             row.arson             ?? 0,
          theftOver50k:      row.theftOver50k      ?? 0,
          grievousHurt:      row.grievousHurt      ?? 0,
          hurtByKnife:       row.hurtByKnife       ?? 0,
          extortion:         row.extortion         ?? 0,
          unnaturalOffense:  row.unnaturalOffense  ?? 0,
          sexualAbuse:       row.sexualAbuse       ?? 0,
        }));
        setStats(mapped);
      } catch (e: any) {
        setError(e.message ?? "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ── Summary ──────────────────────────────────────────────────────────────
  const summary = useMemo((): DashboardSummary | null => {
    if (!stats.length) return null;
    const districtNames  = Array.from(new Set(stats.map((s) => s.districtName)));
    const totalDistricts = districtNames.length;
    const totalCrimes    = stats.reduce((s, r) => s + r.total, 0);
    const avgPerDistrict = totalDistricts > 0 ? Math.round(totalCrimes / totalDistricts) : 0;
    const districtTotals = districtNames.map((name) => {
      const rows   = stats.filter((r) => r.districtName === name);
      const total  = rows.reduce((s, r) => s + r.total, 0);
      const byYear = YEARS.map((y) => rows.filter((r) => String(r.year) === y).reduce((s, r) => s + r.total, 0));
      const prev   = byYear[byYear.length - 2] ?? 0;
      const last   = byYear[byYear.length - 1] ?? 0;
      const yoy    = prev > 0 ? Math.round(((last - prev) / prev) * 1000) / 10 : 0;
      return { name, total, yoy, trend: yoy > 2 ? "increasing" : yoy < -2 ? "decreasing" : "stable", risk: getRiskLevel(total, avgPerDistrict), avgPerYear: Math.round(total / YEARS.length) };
    });
    const highRiskDistricts: HighRiskDistrict[] = districtTotals
      .filter((d) => d.risk === "high" || d.risk === "critical")
      .sort((a, b) => b.total - a.total)
      .map((d, idx) => ({ district: { id: idx, name: d.name }, summary: { totalCrimes: d.total, averagePerYear: d.avgPerYear, trend: d.trend, riskLevel: d.risk, yearOverYearChange: d.yoy } }));
    return { totalDistricts, totalCrimes, averageCrimesPerDistrict: avgPerDistrict, highRiskCount: highRiskDistricts.length, highRiskDistricts };
  }, [stats]);

  // ── Chart data ───────────────────────────────────────────────────────────
  const crimeTypeData = useMemo(() => {
    const rows = stats.filter((r) => String(r.year) === selectedYear);
    return CRIME_TYPES
      .map((type) => ({ name: type, value: rows.reduce((s, r) => s + getCrimeCount(r, type), 0) }))
      .filter((d) => d.value > 0);
  }, [stats, selectedYear]);

  const totalForYear = useMemo(() => crimeTypeData.reduce((s, d) => s + d.value, 0), [crimeTypeData]);

  const trendData = useMemo(() =>
    YEARS.map((year) => {
      const rows = stats.filter((r) => String(r.year) === year);
      return { year, count: rows.reduce((s, r) => s + getCrimeCount(r, selectedCrimeType), 0) };
    }), [stats, selectedCrimeType]);

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!summary?.highRiskDistricts?.length) return;
    let csv = "District,Total Crimes,Average per Year,Trend,Risk Level,YoY Change\n";
    summary.highRiskDistricts.forEach((item) => {
      csv += `"${item.district.name}",${item.summary.totalCrimes},${item.summary.averagePerYear},"${item.summary.trend}","${item.summary.riskLevel}",${item.summary.yearOverYearChange}\n`;
    });
    const el = document.createElement("a");
    el.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    el.download = `crime-report-${new Date().toISOString().split("T")[0]}.csv`;
    el.style.display = "none";
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  };

  const activeData    = activeSlice !== null ? crimeTypeData[activeSlice] : null;
  const activePercent = activeData ? ((activeData.value / totalForYear) * 100).toFixed(1) : null;

  // ── Loading / Error ──────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff6b4a" strokeWidth="1.5" style={{ animation: "spin 1s linear infinite" }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.65rem", letterSpacing: "0.16em", color: "#555e6a", textTransform: "uppercase" }}>Loading intelligence data...</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ background: "#0d1117", border: "1px solid rgba(220,38,38,0.3)", padding: "2rem", maxWidth: 480, width: "100%", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#dc2626" }} />
        <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.62rem", color: "#f87171", letterSpacing: "0.08em", marginBottom: "1rem" }}>DATA LOAD FAILURE: {error}</p>
        <button onClick={() => window.location.reload()} style={{ background: "#ff6b4a", color: "#0a0c0f", border: "none", fontFamily: "'Space Mono',monospace", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.65rem 1.25rem", cursor: "pointer" }}>
          Retry Connection
        </button>
      </div>
    </div>
  );

  const axisStyle = { fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", fill: "#555e6a" };
  const gridStyle = { stroke: "rgba(255,107,74,0.06)", strokeDasharray: "4 4" };
  const halfIdx   = Math.ceil(crimeTypeData.length / 2);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", padding: "2rem", fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @media print{body{background:white;}.no-print{display:none!important;}}

        .db-card{background:#0d1117;border:1px solid rgba(255,107,74,0.12);position:relative;overflow:hidden;border-radius:0;}
        .db-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#ff6b4a,rgba(255,107,74,0.15),transparent);}
        .db-card-corner{position:absolute;top:0;right:0;width:16px;height:16px;border-top:1.5px solid #ff6b4a;border-right:1.5px solid #ff6b4a;}
        .db-section-label{font-family:'Space Mono',monospace;font-size:0.52rem;letter-spacing:0.18em;color:#ff6b4a;text-transform:uppercase;margin-bottom:0.5rem;}
        .db-section-title{font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:#fff;letter-spacing:0.04em;line-height:1;}

        .stat-card{background:#0d1117;border:1px solid rgba(255,107,74,0.12);padding:1.25rem 1.5rem;position:relative;overflow:hidden;}
        .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#ff6b4a,transparent);}
        .stat-card-label{font-family:'Space Mono',monospace;font-size:0.68rem;letter-spacing:0.14em;color:#8b949e;text-transform:uppercase;margin-bottom:0.5rem;}
        .stat-card-val{font-family:'Bebas Neue',sans-serif;font-size:3.2rem;line-height:1;color:#fff;margin-bottom:0.3rem;}
        .stat-card-val.red{color:#dc2626;}
        .stat-card-sub{font-family:'Space Mono',monospace;font-size:0.62rem;color:#555e6a;letter-spacing:0.1em;text-transform:uppercase;}

        .alert-sentinel{background:rgba(220,38,38,0.07);border:1px solid rgba(220,38,38,0.22);padding:0.875rem 1.25rem;display:flex;align-items:flex-start;gap:0.6rem;}
        .alert-sentinel-text{font-family:'Space Mono',monospace;font-size:0.62rem;color:#f87171;letter-spacing:0.04em;line-height:1.6;}

        .db-btn{font-family:'Space Mono',monospace;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.6rem 1.1rem;cursor:pointer;border:none;display:flex;align-items:center;gap:0.4rem;transition:all 0.15s;}
        .db-btn-outline{background:transparent;border:1px solid rgba(255,107,74,0.25)!important;color:#ff6b4a;}
        .db-btn-outline:hover{background:rgba(255,107,74,0.08);border-color:rgba(255,107,74,0.5)!important;}

        .table-wrap{background:#0d1117;border:1px solid rgba(255,107,74,0.12);}
        .db-table{width:100%;border-collapse:collapse;}
        .db-thead{background:#111418;}
        .db-th{font-family:'Space Mono',monospace;font-size:0.5rem;letter-spacing:0.14em;text-transform:uppercase;color:#555e6a;padding:0.875rem 1rem;text-align:left;border-bottom:1px solid rgba(255,107,74,0.1);}
        .db-tr{border-bottom:1px solid rgba(255,107,74,0.05);transition:background 0.15s;}
        .db-tr:hover{background:rgba(255,107,74,0.03);}
        .db-tr:last-child{border-bottom:none;}
        .db-td{padding:0.75rem 1rem;font-size:0.82rem;color:#8b949e;}
        .db-td.name{color:#e2e8f0;font-weight:600;display:flex;align-items:center;gap:0.5rem;}
        .db-td.num{font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:#e2e8f0;letter-spacing:0.04em;}
        .risk-pill{font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;letter-spacing:0.1em;padding:0.18rem 0.5rem;text-transform:uppercase;color:#0a0c0f;}
        .trend-cell{display:flex;align-items:center;gap:0.4rem;font-size:0.75rem;}
        .yoy-pos{font-family:'Space Mono',monospace;font-size:0.65rem;color:#dc2626;font-weight:700;}
        .yoy-neg{font-family:'Space Mono',monospace;font-size:0.65rem;color:#10b981;font-weight:700;}

        /* Legend rows */
        .leg-row{display:flex;align-items:center;gap:0.45rem;padding:0.28rem 0.5rem;cursor:pointer;border:1px solid transparent;transition:all 0.15s;border-radius:1px;}
        .leg-row:hover{background:rgba(255,107,74,0.04);border-color:rgba(255,107,74,0.12);}
        .leg-row.active-leg{background:rgba(255,107,74,0.07);border-color:rgba(255,107,74,0.28);}
        .leg-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;transition:all 0.2s;}
        .leg-name{font-family:'Space Mono',monospace;font-size:0.62rem;color:#3d444d;letter-spacing:0.04em;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color 0.2s;}
        .leg-row.active-leg .leg-name{color:#c8d0da;}
        .leg-pct{font-family:'Bebas Neue',sans-serif;font-size:1rem;color:#2a3040;transition:color 0.2s;flex-shrink:0;}
        .leg-row.active-leg .leg-pct{color:#ff6b4a;}

        .detail-fade{animation:fadeIn 0.18s ease;}
      `}</style>

      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Header */}
        <div className="no-print" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="db-section-label">Analytics Command</div>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2rem,4vw,3rem)", color: "#fff", letterSpacing: "0.04em", lineHeight: 0.95, marginBottom: "0.4rem" }}>
              Crime Analytics <span style={{ color: "#ff6b4a" }}>Dashboard</span>
            </h1>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.58rem", color: "#555e6a", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Sri Lanka District-Level Crime Statistics · 2021–2023
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="db-btn db-btn-outline" onClick={handleExportCSV}><Download size={12} /> Export CSV</button>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Districts",      val: summary?.totalDistricts ?? 0,                              sub: "Monitored sectors",  cls: "" },
            { label: "Total Crimes (3 Yrs)", val: (summary?.totalCrimes ?? 0).toLocaleString(),              sub: "All crime types",    cls: "" },
            { label: "Avg per District",     val: (summary?.averageCrimesPerDistrict ?? 0).toLocaleString(), sub: "Per district total", cls: "" },
            { label: "High-Risk Districts",  val: summary?.highRiskCount ?? 0,                               sub: "Require attention",  cls: "red" },
          ].map(({ label, val, sub, cls }) => (
            <div className="stat-card" key={label}>
              <div className="stat-card-label">{label}</div>
              <div className={`stat-card-val ${cls}`}>{val}</div>
              <div className="stat-card-sub">{sub}</div>
            </div>
          ))}
        </div>

        {/* Alert */}
        {summary?.highRiskDistricts && summary.highRiskDistricts.length > 0 && (
          <div className="alert-sentinel no-print" style={{ marginBottom: "1.5rem" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="alert-sentinel-text">
              <strong style={{ color: "#fff" }}>{summary.highRiskDistricts.length} districts</strong> identified as high-risk or critical:{" "}
              {summary.highRiskDistricts.slice(0, 3).map((d) => d.district.name).join(", ")}
              {summary.highRiskDistricts.length > 3 && ` and ${summary.highRiskDistricts.length - 3} more`}
            </p>
          </div>
        )}

        {/* ── PIE CHART ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div className="db-card" style={{ padding: "1.5rem" }}>
            <div className="db-card-corner" />

            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div>
                <div className="db-section-label">Distribution</div>
                <div className="db-section-title">Crime Type Breakdown</div>
                <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.46rem", color: "#2a3040", letterSpacing: "0.1em", marginTop: "0.3rem" }}>
                  CLICK ANY SLICE OR ROW TO INSPECT
                </p>
              </div>
              <Select value={selectedYear} onValueChange={(y) => { setSelectedYear(y); setActiveSlice(null); }}>
                <SelectTrigger style={{ width: 90, background: "#0a0c0f", border: "1px solid rgba(255,107,74,0.2)", borderRadius: 0, color: "#e2e8f0", fontFamily: "'Space Mono',monospace", fontSize: "0.65rem" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {crimeTypeData.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 280, fontFamily: "'Space Mono',monospace", fontSize: "0.62rem", color: "#3d444d", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                No data for {selectedYear}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 260px 1fr", gap: "1.25rem", alignItems: "center" }}>

                {/* LEFT legend */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  {crimeTypeData.slice(0, halfIdx).map((entry, i) => {
                    const pct      = ((entry.value / totalForYear) * 100).toFixed(1);
                    const isActive = activeSlice === i;
                    return (
                      <div key={entry.name} className={`leg-row ${isActive ? "active-leg" : ""}`} onClick={() => setActiveSlice(isActive ? null : i)}>
                        <div className="leg-dot" style={{ background: isActive ? ACTIVE_COLOR : "#3a231c", border: `1px solid ${isActive ? ACTIVE_COLOR : "#5a332c"}` }} />
                        <span className="leg-name">{entry.name}</span>
                        <span className="leg-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>

                {/* CENTER — donut pie */}
                <div style={{ position: "relative" }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={crimeTypeData}
                        cx="50%" cy="50%"
                        outerRadius={108}
                        innerRadius={42}
                        dataKey="value"
                        activeIndex={activeSlice ?? undefined}
                        activeShape={<ActiveSlice />}
                        onClick={(_, index) => setActiveSlice(activeSlice === index ? null : index)}
                        onMouseEnter={(_, index) => setHoveredSlice(index)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        stroke="#0a0c0f"
                        strokeWidth={1.5}
                        style={{ cursor: "pointer" }}
                      >
                        {crimeTypeData.map((_e, i) => (
                          <Cell
                            key={i}
                            fill={
                              activeSlice === i
                                ? ACTIVE_COLOR
                                : hoveredSlice === i && activeSlice === null
                                ? HOVER_COLOR
                                : MONO_COLORS[i % MONO_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Donut center label */}
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                    {activeSlice !== null ? (
                      <div className="detail-fade">
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.7rem", color: ACTIVE_COLOR, lineHeight: 1 }}>{activePercent}%</div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.36rem", color: "#555e6a", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "2px" }}>selected</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1rem", color: "#2a3040", lineHeight: 1 }}>{selectedYear}</div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.34rem", color: "#1e252e", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "2px" }}>tap slice</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT legend + detail panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  {crimeTypeData.slice(halfIdx).map((entry, i) => {
                    const realIdx  = halfIdx + i;
                    const pct      = ((entry.value / totalForYear) * 100).toFixed(1);
                    const isActive = activeSlice === realIdx;
                    return (
                      <div key={entry.name} className={`leg-row ${isActive ? "active-leg" : ""}`} onClick={() => setActiveSlice(isActive ? null : realIdx)}>
                        <div className="leg-dot" style={{ background: isActive ? ACTIVE_COLOR : "#3a231c", border: `1px solid ${isActive ? ACTIVE_COLOR : "#5a332c"}` }} />
                        <span className="leg-name">{entry.name}</span>
                        <span className="leg-pct">{pct}%</span>
                      </div>
                    );
                  })}

                  {/* Detail card */}
                  {activeData && (
                    <div className="detail-fade" style={{ marginTop: "0.75rem", background: "rgba(255,107,74,0.05)", border: "1px solid rgba(255,107,74,0.18)", padding: "0.875rem 1rem" }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.42rem", color: "#ff6b4a", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                        Selected Crime Type
                      </div>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.05rem", color: "#fff", letterSpacing: "0.04em", lineHeight: 1.15, marginBottom: "0.6rem" }}>
                        {activeData.name}
                      </div>
                      <div style={{ display: "flex", gap: "1.25rem", marginBottom: "0.6rem" }}>
                        <div>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.38rem", color: "#555e6a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1px" }}>Incidents</div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", color: ACTIVE_COLOR, lineHeight: 1 }}>{activeData.value.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.38rem", color: "#555e6a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1px" }}>Share</div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", color: "#e2e8f0", lineHeight: 1 }}>{activePercent}%</div>
                        </div>
                      </div>
                      {/* Proportion bar */}
                      <div style={{ height: 2, background: "rgba(255,107,74,0.1)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${activePercent}%`, background: ACTIVE_COLOR, transition: "width 0.3s ease" }} />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Bar chart */}
        <div className="db-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="db-card-corner" />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <div>
              <div className="db-section-label">Trend Analysis</div>
              <div className="db-section-title">Crime Trend Analysis</div>
            </div>
            <Select value={selectedCrimeType} onValueChange={setSelectedCrimeType}>
              <SelectTrigger style={{ width: 220, background: "#0a0c0f", border: "1px solid rgba(255,107,74,0.2)", borderRadius: 0, color: "#e2e8f0", fontFamily: "'Space Mono',monospace", fontSize: "0.65rem" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {CRIME_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
              <Tooltip content={<SentinelTooltip />} />
              <Bar dataKey="count" name={selectedCrimeType} fill="#ff6b4a" radius={[2,2,0,0]}
                background={{ fill: "rgba(255,107,74,0.04)" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* High-risk districts table */}
        {summary?.highRiskDistricts && summary.highRiskDistricts.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <div className="db-section-label">Threat Assessment</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.6rem", color: "#fff", letterSpacing: "0.04em" }}>High-Risk Districts</div>
              </div>
              <button className="db-btn db-btn-outline" onClick={handleExportCSV}><Download size={11} /> Export Data</button>
            </div>
            <div className="table-wrap">
              <table className="db-table">
                <thead className="db-thead">
                  <tr>
                    <th className="db-th">District</th>
                    <th className="db-th">Total Crimes</th>
                    <th className="db-th">Avg / Year</th>
                    <th className="db-th">Trend</th>
                    <th className="db-th">Risk Level</th>
                    <th className="db-th">YoY Change</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.highRiskDistricts.map((item) => (
                    <tr key={item.district.id} className="db-tr">
                      <td className="db-td name">
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: RISK_COLORS[item.summary.riskLevel] ?? "#6b7280", flexShrink: 0 }} />
                        {item.district.name}
                      </td>
                      <td className="db-td num">{item.summary.totalCrimes.toLocaleString()}</td>
                      <td className="db-td num">{item.summary.averagePerYear.toLocaleString()}</td>
                      <td className="db-td">
                        <div className="trend-cell" style={{ color: item.summary.trend === "increasing" ? "#dc2626" : item.summary.trend === "decreasing" ? "#10b981" : "#8b949e" }}>
                          {item.summary.trend === "increasing" ? <TrendingUp size={13} /> : item.summary.trend === "decreasing" ? <TrendingDown size={13} /> : <span style={{ fontWeight: 700 }}>→</span>}
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.6rem", letterSpacing: "0.06em", textTransform: "capitalize" }}>{item.summary.trend}</span>
                        </div>
                      </td>
                      <td className="db-td">
                        <span className="risk-pill" style={{ background: RISK_COLORS[item.summary.riskLevel] ?? "#6b7280" }}>
                          {item.summary.riskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td className="db-td">
                        <span className={item.summary.yearOverYearChange > 0 ? "yoy-pos" : "yoy-neg"}>
                          {item.summary.yearOverYearChange > 0 ? "+" : ""}{item.summary.yearOverYearChange.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "0.65rem 1rem", borderTop: "1px solid rgba(255,107,74,0.06)", background: "#111418", fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", color: "#3d444d", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Displaying {summary.highRiskDistricts.length} high-risk sectors · Sri Lanka Crime Intelligence System
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}