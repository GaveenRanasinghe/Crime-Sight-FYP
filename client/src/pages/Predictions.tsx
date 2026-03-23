import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertCircle, TrendingUp, TrendingDown, Zap, Activity } from "lucide-react";

const RISK_COLORS = {
  critical: "#dc2626",
  high:     "#ea580c",
  medium:   "#f59e0b",
  low:      "#10b981",
};

const crimeTypes = [
  "Rape Cases","Homicide","Attempted Homicide","Abduction","Kidnapping",
  "Arson","Theft over Rs. 50,000","Grievous Hurt","Hurt by Knife",
  "Robbery","Extortion","Unnatural Offense","Sexual Abuse",
];

// Custom tooltip
const SentinelTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "0.6rem 0.875rem", fontFamily: "'Space Mono',monospace", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
      <div style={{ fontSize: "0.55rem", color: "#ff6b4a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.4rem" }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontSize: "0.65rem", color: "#111", letterSpacing: "0.06em" }}>
          <span style={{ color: p.color, marginRight: "0.3rem" }}>■</span>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Predictions() {
  const [districts, setDistricts]   = useState<any[]>([]);
  const [allStats, setAllStats]     = useState<any[]>([]);

  // Fetch districts and stats directly from Supabase
  useEffect(() => {
    const load = async () => {
      // Fetch districts
      const { data: distData } = await supabase
        .from("districts")
        .select("id, name")
        .order("name", { ascending: true });
      if (distData) setDistricts(distData);

      // Fetch crime stats joined with districts
      const { data: statsData } = await supabase
        .from("crimeStatistics")
        .select(`
          id, districtId, year,
          rapeCases, homicide, attemptedHomicide, abduction, kidnapping,
          arson, theftOver50k, grievousHurt, hurtByKnife,
          robbery, extortion, unnaturalOffense, sexualAbuse,
          districts ( id, name )
        `)
        .order("year", { ascending: true });
      if (statsData) {
        // Normalize to match the existing chartData logic format
        const formatted = (statsData as any[]).map((row) => ({
          districts: Array.isArray(row.districts) ? row.districts[0] : row.districts,
          crime_statistics: {
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
            sexualAbuse:       row.sexualAbuse       ?? 0,
          },
        }));
        setAllStats(formatted);
      }
    };
    load();
  }, []);

  const [selectedDistrict, setSelectedDistrict]   = useState<string>("");
  const [selectedCrimeType, setSelectedCrimeType] = useState<string>("Robbery");

  const { data: predictions } = (trpc as any).crime.getPredictions.useQuery(
    { districtId: parseInt(selectedDistrict) },
    { enabled: !!selectedDistrict }
  );

  const generatePredictions = (trpc as any).crime.generatePredictions.useMutation();

  const chartData =
    selectedDistrict && allStats
      ? (() => {
          const districtStats = allStats.filter(
            (item: any) => item.districts.id === parseInt(selectedDistrict)
          );
          const data: any[] = [];
          districtStats.forEach((item: any) => {
            const stat = item.crime_statistics;
            let value = 0;
            switch (selectedCrimeType) {
              case "Rape Cases":           value = stat.rapeCases        || 0; break;
              case "Homicide":             value = stat.homicide         || 0; break;
              case "Attempted Homicide":   value = stat.attemptedHomicide|| 0; break;
              case "Abduction":            value = stat.abduction        || 0; break;
              case "Kidnapping":           value = stat.kidnapping       || 0; break;
              case "Arson":                value = stat.arson            || 0; break;
              case "Theft over Rs. 50,000":value = stat.theftOver50k     || 0; break;
              case "Grievous Hurt":        value = stat.grievousHurt     || 0; break;
              case "Hurt by Knife":        value = stat.hurtByKnife      || 0; break;
              case "Robbery":              value = stat.robbery          || 0; break;
              case "Extortion":            value = stat.extortion        || 0; break;
              case "Unnatural Offense":    value = stat.unnaturalOffense || 0; break;
              case "Sexual Abuse":         value = stat.sexualAbuse      || 0; break;
            }
            data.push({ year: stat.year, actual: value, type: "historical" });
          });
          predictions?.forEach((pred: any) => {
            if (pred.crimeType === selectedCrimeType) {
              data.push({ year: pred.predictedYear, predicted: pred.predictedValue, type: "predicted", confidence: pred.confidence });
            }
          });
          return data.sort((a, b) => a.year - b.year);
        })()
      : [];

  const selectedDistrictName = districts.find((d: any) => d.id === parseInt(selectedDistrict))?.name || "";
  const filteredPredictions  = predictions?.filter((p: any) => p.crimeType === selectedCrimeType) || [];
  const totalRows = allStats.length;

  const axisStyle = { fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", fill: "#555e6a" };
  const gridStyle = { stroke: "rgba(255,107,74,0.06)", strokeDasharray: "4 4" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", padding: "2rem", fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap');

        .pred-card { background:#0d1117; border:1px solid rgba(255,107,74,0.12); position:relative; overflow:hidden; border-radius:0; }
        .pred-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,#ff6b4a,rgba(255,107,74,0.15),transparent); }
        .pred-card-corner { position:absolute; top:0; right:0; width:16px; height:16px; border-top:1.5px solid #ff6b4a; border-right:1.5px solid #ff6b4a; }

        .pred-label { font-family:'Space Mono',monospace; font-size:0.52rem; letter-spacing:0.18em; color:#ff6b4a; text-transform:uppercase; margin-bottom:0.5rem; }
        .pred-title { font-family:'Bebas Neue',sans-serif; font-size:1.2rem; color:#fff; letter-spacing:0.04em; line-height:1; }

        .stat-footer-card { background:#0d1117; border:1px solid rgba(255,107,74,0.12); padding:1.25rem 1.5rem; position:relative; }
        .stat-footer-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,#ff6b4a,transparent); }
        .stat-footer-icon { color:#ff6b4a; margin-bottom:0.6rem; }
        .stat-footer-label { font-family:'Space Mono',monospace; font-size:0.5rem; letter-spacing:0.14em; color:#555e6a; text-transform:uppercase; margin-bottom:0.25rem; }
        .stat-footer-val { font-family:'Bebas Neue',sans-serif; font-size:1.6rem; color:#fff; line-height:1; }
        .stat-footer-sub { font-family:'Space Mono',monospace; font-size:0.55rem; color:#8b949e; letter-spacing:0.06em; }

        .pred-select-label { font-family:'Space Mono',monospace; font-size:0.55rem; letter-spacing:0.14em; color:#555e6a; text-transform:uppercase; margin-bottom:0.5rem; display:block; }
        .coverage-badge { display:inline-flex; align-items:center; gap:0.35rem; margin-top:0.75rem; padding:0.2rem 0.6rem; background:rgba(74,222,128,0.08); border:1px solid rgba(74,222,128,0.2); font-family:'Space Mono',monospace; font-size:0.52rem; letter-spacing:0.1em; color:#4ade80; text-transform:uppercase; }
        .coverage-dot { width:5px; height:5px; border-radius:50%; background:#4ade80; animation:pulse-dot 2s infinite; }
        @keyframes pulse-dot { 0%,100%{opacity:1;} 50%{opacity:0.4;} }

        .variance-badge { display:inline-flex; align-items:center; gap:0.35rem; margin-top:0.75rem; padding:0.2rem 0.6rem; background:rgba(250,204,21,0.08); border:1px solid rgba(250,204,21,0.2); font-family:'Space Mono',monospace; font-size:0.52rem; letter-spacing:0.1em; color:#facc15; text-transform:uppercase; }

        .gen-btn { width:100%; background:#ff6b4a; color:#0a0c0f; font-family:'Space Mono',monospace; font-size:0.72rem; font-weight:700; letter-spacing:0.14em; padding:0.9rem; border:none; cursor:pointer; text-transform:uppercase; transition:all 0.18s; display:flex; align-items:center; justify-content:center; gap:0.5rem; }
        .gen-btn:hover:not(:disabled) { background:#ff8c74; }
        .gen-btn:disabled { opacity:0.6; cursor:not-allowed; }

        .success-alert { background:rgba(74,222,128,0.07); border:1px solid rgba(74,222,128,0.2); padding:0.75rem 1rem; margin-top:1rem; font-family:'Space Mono',monospace; font-size:0.6rem; letter-spacing:0.06em; color:#4ade80; display:flex; align-items:center; gap:0.5rem; }

        .waiting-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4rem 2rem; text-align:center; }
        .waiting-icon { width:80px; height:80px; background:rgba(255,107,74,0.06); border:1px solid rgba(255,107,74,0.15); display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem; }
        .waiting-title { font-family:'Bebas Neue',sans-serif; font-size:1.4rem; color:#e2e8f0; letter-spacing:0.06em; margin-bottom:0.5rem; }
        .waiting-sub { font-family:'Space Mono',monospace; font-size:0.6rem; color:#555e6a; letter-spacing:0.06em; line-height:1.6; max-width:280px; }

        .pred-table { width:100%; border-collapse:collapse; }
        .pred-th { font-family:'Space Mono',monospace; font-size:0.5rem; letter-spacing:0.14em; text-transform:uppercase; color:#555e6a; padding:0.75rem 1rem; text-align:left; border-bottom:1px solid rgba(255,107,74,0.1); background:#111418; }
        .pred-tr { border-bottom:1px solid rgba(255,107,74,0.05); transition:background 0.15s; }
        .pred-tr:hover { background:rgba(255,107,74,0.03); }
        .pred-td { padding:0.65rem 1rem; font-size:0.78rem; color:#8b949e; font-family:'Space Mono',monospace; font-size:0.6rem; }
        .pred-td.val { font-family:'Bebas Neue',sans-serif; font-size:1rem; color:#e2e8f0; }
        .conf-bar-track { flex:1; height:3px; background:#1e2530; max-width:80px; }
        .conf-bar-fill { height:100%; background:#ff6b4a; }
      `}</style>

      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", letterSpacing: "0.18em", color: "#ff6b4a", textTransform: "uppercase", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 24, height: 1, background: "#ff6b4a" }} />
            Predictive Analytics Engine
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2.5rem,5vw,4rem)", color: "#fff", letterSpacing: "0.04em", lineHeight: 0.95, marginBottom: "0.5rem" }}>
            Crime Predictions
          </h1>
          <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.6rem", color: "#555e6a", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            AI-powered forecasting for future crime trends
          </p>
        </div>

        {/* Main grid: left controls + right chart */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1rem", marginBottom: "1rem" }}>

          {/* Left panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* District selector */}
            <div className="pred-card" style={{ padding: "1.25rem" }}>
              <div className="pred-card-corner" />
              <span className="pred-select-label">Select District</span>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger style={{ background: "#0a0c0f", border: "1px solid rgba(255,107,74,0.2)", borderRadius: 0, color: "#e2e8f0", fontFamily: "'Space Mono',monospace", fontSize: "0.65rem" }}>
                  <SelectValue placeholder="Choose district" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {districts?.map((district: any) => (
                    <SelectItem key={district.id} value={district.id.toString()}>{district.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDistrict && (
                <div className="coverage-badge">
                  <div className="coverage-dot" />
                  Active Scan
                </div>
              )}
            </div>

            {/* Crime type selector */}
            <div className="pred-card" style={{ padding: "1.25rem" }}>
              <div className="pred-card-corner" />
              <span className="pred-select-label">Select Crime Type</span>
              <Select value={selectedCrimeType} onValueChange={setSelectedCrimeType}>
                <SelectTrigger style={{ background: "#0a0c0f", border: "1px solid rgba(255,107,74,0.2)", borderRadius: 0, color: "#e2e8f0", fontFamily: "'Space Mono',monospace", fontSize: "0.65rem" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {crimeTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="variance-badge">Historical Density</div>
            </div>

            {/* Generate predictions */}
            <div className="pred-card" style={{ padding: "1.25rem" }}>
              <div className="pred-card-corner" />
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.3rem", color: "#fff", letterSpacing: "0.04em", marginBottom: "0.6rem" }}>
                Generate Predictions
              </div>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", color: "#8b949e", letterSpacing: "0.04em", lineHeight: 1.65, marginBottom: "1.25rem" }}>
                Execute neural-net processing on historical data clusters to forecast high-probability incident nodes.
              </p>
              <button
                className="gen-btn"
                onClick={() => generatePredictions.mutate()}
                disabled={generatePredictions.isPending}
              >
                <Zap size={13} />
                {generatePredictions.isPending ? "Generating..." : "Initialize Analysis"}
              </button>
              {generatePredictions.isSuccess && (
                <div className="success-alert">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  {generatePredictions.data?.message}
                </div>
              )}
            </div>
          </div>

          {/* Right: chart or waiting */}
          <div className="pred-card">
            <div className="pred-card-corner" />
            {selectedDistrict ? (
              <>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,107,74,0.08)" }}>
                  <div className="pred-label">Historical vs Predicted Trend</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.4rem", color: "#fff", letterSpacing: "0.04em" }}>
                    {selectedDistrictName} — {selectedCrimeType}
                  </div>
                </div>
                <div style={{ padding: "1.25rem" }}>
                  <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={chartData}>
                      <CartesianGrid {...gridStyle} />
                      <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis tick={axisStyle} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                      <Tooltip content={<SentinelTooltip />} />
                      <Legend wrapperStyle={{ fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", color: "#8b949e" }} />
                      <Line type="monotone" dataKey="actual"    stroke="#ff6b4a" strokeWidth={2} name="Historical" dot={{ fill: "#ff6b4a", r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="predicted" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 5" name="Predicted" dot={{ fill: "#38bdf8", r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Predictions table */}
                {filteredPredictions.length > 0 && (
                  <div style={{ borderTop: "1px solid rgba(255,107,74,0.08)", margin: "0 1.25rem 1.25rem" }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", letterSpacing: "0.16em", color: "#ff6b4a", textTransform: "uppercase", padding: "0.875rem 0 0.5rem" }}>
                      Prediction Data
                    </div>
                    <table className="pred-table">
                      <thead>
                        <tr>
                          <th className="pred-th">Year</th>
                          <th className="pred-th">Predicted Value</th>
                          <th className="pred-th">Confidence</th>
                          <th className="pred-th">Profile</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPredictions.map((pred: any, i: number) => (
                          <tr key={i} className="pred-tr">
                            <td className="pred-td val">{pred.predictedYear}</td>
                            <td className="pred-td val">{pred.predictedValue?.toLocaleString()}</td>
                            <td className="pred-td">{(pred.confidence * 100).toFixed(0)}%</td>
                            <td className="pred-td">
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div className="conf-bar-track">
                                  <div className="conf-bar-fill" style={{ width: `${(pred.confidence * 100).toFixed(0)}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="waiting-state">
                <div className="waiting-icon">
                  <Activity size={32} style={{ color: "#ff6b4a", opacity: 0.5 }} />
                </div>
                <div className="waiting-title">Waiting for Parameters</div>
                <p className="waiting-sub">
                  Select a district and incident type to view geospatial predictions and tactical risk assessments.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginTop: "1rem" }}>
          {[
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b4a" strokeWidth="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>, label: "Datasets Loaded", val: `${(totalRows / 1000).toFixed(1)}M Rows`, sub: "Historical records" },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b4a" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>, label: "Engine Load", val: "12.4% Idle", sub: "System nominal" },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b4a" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, label: "Model Confidence", val: "98.2%", sub: "Accurate" },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b4a" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label: "Last Forecast", val: "04:00 AM", sub: "Scheduled run" },
          ].map(({ icon, label, val, sub }) => (
            <div className="stat-footer-card" key={label}>
              <div className="stat-footer-icon">{icon}</div>
              <div className="stat-footer-label">{label}</div>
              <div className="stat-footer-val">{val}</div>
              <div className="stat-footer-sub">{sub}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}