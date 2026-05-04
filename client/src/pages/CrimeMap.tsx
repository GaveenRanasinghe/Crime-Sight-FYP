"use client";

import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { MapView } from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, Filter } from "lucide-react";

const GEO_TO_DB_NAME: Record<string, string> = {
  "Trikuṇāmalaya": "Trincomalee",
  "Mulativ":       "Mullaitivu",
  "Yāpanaya":      "Jaffna",
  "Kilinŏchchi":   "Kilinochchi",
  "Mannārama":     "Mannar",
  "Puttalama":     "Puttalam",
  "Gampaha":       "Gampaha",
  "Kŏḷamba":       "Colombo",
  "Kaḷutara":      "Kalutara",
  "Gālla":         "Galle",
  "Mātara":        "Matara",
  "Hambantŏṭa":    "Hambantota",
  "Ampāra":        "Ampara",
  "Maḍakalapuva":  "Batticaloa",
  "Ratnapura":     "Ratnapura",
  "Mŏṇarāgala":    "Monaragala",
  "Kægalla":       "Kegalle",
  "Badulla":       "Badulla",
  "Mātale":        "Matale",
  "Pŏḷŏnnaruva":   "Polonnaruwa",
  "Kuruṇægala":    "Kurunegala",
  "Anurādhapura":  "Anuradhapura",
  "Nuvara Ĕliya":  "Nuwara Eliya",
  "Vavuniyāva":    "Vavuniya",
  "Mahanuvara":    "Kandy",
};

type CrimeType = { key: string; label: string; emoji: string; max: number };

const CRIME_TYPES: CrimeType[] = [
  { key: "total",             label: "All Crimes (Total)",   emoji: "🔢", max: 9000 },
  { key: "rapeCases",         label: "Rape Cases",           emoji: "⚠️",  max: 400  },
  { key: "homicide",          label: "Homicide",             emoji: "🔪", max: 160  },
  { key: "attemptedHomicide", label: "Attempted Homicide",   emoji: "⚔️",  max: 800  },
  { key: "abduction",         label: "Abduction",            emoji: "🚨", max: 600  },
  { key: "kidnapping",        label: "Kidnapping",           emoji: "👤", max: 200  },
  { key: "arson",             label: "Arson",                emoji: "🔥", max: 90   },
  { key: "theftOver50k",      label: "Theft over Rs.50,000", emoji: "💰", max: 3500 },
  { key: "grievousHurt",      label: "Grievous Hurt",        emoji: "🤕", max: 2000 },
  { key: "hurtByKnife",       label: "Hurt by Knife",        emoji: "🗡️",  max: 500  },
  { key: "robbery",           label: "Robbery",              emoji: "🏃", max: 2500 },
  { key: "extortion",         label: "Extortion",            emoji: "💸", max: 900  },
  { key: "unnaturalOffense",  label: "Unnatural Offense",    emoji: "⛔", max: 300  },
  { key: "sexualAbuse",       label: "Sexual Abuse",         emoji: "🚫", max: 500  },
];

type District = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  province?: string;
};

type CrimeStat = {
  id: number;
  districtId: number;
  year: number;
  total: number;
  rapeCases?: number;
  homicide?: number;
  attemptedHomicide?: number;
  abduction?: number;
  kidnapping?: number;
  arson?: number;
  theftOver50k?: number;
  grievousHurt?: number;
  hurtByKnife?: number;
  robbery?: number;
  extortion?: number;
  unnaturalOffense?: number;
  sexualAbuse?: number;
  districts?: District;
};

type RiskLevel = "critical" | "high" | "medium" | "low";

const RISK_COLORS: Record<RiskLevel, string> = {
  critical: "#dc2626",
  high:     "#ea580c",
  medium:   "#f59e0b",
  low:      "#10b981",
};

const GEOJSON_URL = "/sri-lanka-districts.json";

const mapStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap');

  .map-page {
    min-height: 100vh;
    background: #0a0c0f;
    padding: 2rem;
    font-family: 'Inter', sans-serif;
  }

  /* Page header */
  .map-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 1.75rem; flex-wrap: wrap; gap: 1.5rem;
  }
  .map-page-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 2.8rem; line-height: 0.95; letter-spacing: 0.04em;
    color: #fff; margin-bottom: 0.4rem;
  }
  .map-page-title span { color: #ff6b4a; }
  .map-page-sub {
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem; letter-spacing: 0.1em;
    color: #555e6a; text-transform: uppercase; max-width: 460px; line-height: 1.6;
  }
  .map-header-stats { display: flex; gap: 1.5rem; }
  .map-header-stat {
    background: #0d1117;
    border: 1px solid rgba(255,107,74,0.15);
    padding: 0.75rem 1.25rem; min-width: 120px;
    position: relative;
  }
  .map-header-stat::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 2px; background: linear-gradient(90deg, #ff6b4a, transparent);
  }
  .map-header-stat-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.5rem; letter-spacing: 0.16em;
    color: #555e6a; text-transform: uppercase; margin-bottom: 0.25rem;
  }
  .map-header-stat-val {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.8rem; line-height: 1; color: #ff6b4a;
  }
  .map-header-stat-val.elevated { color: #facc15; font-size: 1.3rem; letter-spacing: 0.04em; }

  /* Main grid */
  .map-grid {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  /* Left panel */
  .map-panel {
    background: #0d1117;
    border: 1px solid rgba(255,107,74,0.15);
    display: flex; flex-direction: column; gap: 0;
    position: relative; overflow: hidden;
  }
  .map-panel::before {
    content: ''; position: absolute; top: 0; left: 0; bottom: 0;
    width: 2px; background: linear-gradient(180deg, #ff6b4a, rgba(255,107,74,0.1));
  }
  .map-panel-section {
    padding: 1.25rem 1.25rem 1rem;
    border-bottom: 1px solid rgba(255,107,74,0.08);
  }
  .map-panel-section:last-child { border-bottom: none; flex: 1; }
  .map-panel-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.55rem; letter-spacing: 0.18em;
    color: #ff6b4a; text-transform: uppercase;
    margin-bottom: 0.875rem;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .map-panel-label svg { flex-shrink: 0; }

  /* Crime type select */
  .map-select-wrap { margin-bottom: 1rem; }
  .map-field-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.52rem; letter-spacing: 0.14em;
    color: #555e6a; text-transform: uppercase; margin-bottom: 0.4rem; display: block;
  }

  /* Year pills */
  .map-year-pills { display: flex; gap: 0.4rem; }
  .map-year-pill {
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem; letter-spacing: 0.08em;
    padding: 0.45rem 0.875rem;
    border: 1px solid rgba(255,107,74,0.2);
    background: transparent; color: #8b949e;
    cursor: pointer; transition: all 0.15s; text-transform: uppercase;
  }
  .map-year-pill:hover { border-color: rgba(255,107,74,0.4); color: #e2e8f0; }
  .map-year-pill.active {
    background: #ff6b4a; border-color: #ff6b4a;
    color: #0a0c0f; font-weight: 700;
  }

  /* Legend */
  .map-legend { display: flex; flex-direction: column; gap: 0.5rem; }
  .map-legend-item { display: flex; align-items: center; gap: 0.6rem; }
  .map-legend-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
  .map-legend-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem; color: #8b949e; letter-spacing: 0.06em;
  }

  /* Operational insight */
  .map-insight {
    background: rgba(255,107,74,0.05);
    border: 1px solid rgba(255,107,74,0.15);
    padding: 1rem;
    margin: 1.25rem;
    position: relative;
  }
  .map-insight-title {
    font-family: 'Space Mono', monospace;
    font-size: 0.52rem; letter-spacing: 0.16em;
    color: #ff6b4a; text-transform: uppercase; margin-bottom: 0.5rem;
  }
  .map-insight-text {
    font-size: 0.78rem; color: #8b949e; line-height: 1.65;
  }

  /* Map container */
  .map-container {
    background: #0d1117;
    border: 1px solid rgba(255,107,74,0.15);
    overflow: hidden; position: relative;
  }
  .map-container-header {
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid rgba(255,107,74,0.1);
    display: flex; align-items: center; justify-content: space-between;
    background: #0d1117;
  }
  .map-container-title {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem; letter-spacing: 0.14em;
    color: #e2e8f0; text-transform: uppercase;
  }
  .map-container-sub {
    font-family: 'Space Mono', monospace;
    font-size: 0.52rem; letter-spacing: 0.08em;
    color: #555e6a; text-transform: uppercase;
  }
  .map-active-badge {
    background: rgba(255,107,74,0.1);
    border: 1px solid rgba(255,107,74,0.25);
    padding: 0.2rem 0.6rem;
    font-family: 'Space Mono', monospace;
    font-size: 0.52rem; color: #ff6b4a; letter-spacing: 0.1em; text-transform: uppercase;
  }

  /* District analytics table */
  .analytics-section { margin-top: 1.5rem; }
  .analytics-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 1rem;
  }
  .analytics-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.6rem; letter-spacing: 0.04em; color: #fff;
    display: flex; align-items: center; gap: 0.75rem;
  }
  .analytics-title-icon { color: #ff6b4a; }
  .analytics-export {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase;
    background: transparent;
    border: 1px solid rgba(255,107,74,0.25);
    color: #ff6b4a; padding: 0.45rem 0.875rem; cursor: pointer;
    transition: all 0.15s; display: flex; align-items: center; gap: 0.4rem;
  }
  .analytics-export:hover { background: rgba(255,107,74,0.08); border-color: rgba(255,107,74,0.5); }

  .analytics-table-wrap {
    background: #0d1117;
    border: 1px solid rgba(255,107,74,0.12);
    overflow: hidden;
  }
  .analytics-table { width: 100%; border-collapse: collapse; }
  .analytics-thead { background: #111418; }
  .analytics-th {
    font-family: 'Space Mono', monospace;
    font-size: 0.52rem; letter-spacing: 0.14em; text-transform: uppercase;
    color: #555e6a; padding: 0.875rem 1rem; text-align: left;
    border-bottom: 1px solid rgba(255,107,74,0.1);
  }
  .analytics-tr {
    border-bottom: 1px solid rgba(255,107,74,0.06);
    transition: background 0.15s;
  }
  .analytics-tr:hover { background: rgba(255,107,74,0.04); }
  .analytics-tr:last-child { border-bottom: none; }
  .analytics-td {
    padding: 0.875rem 1rem; font-size: 0.85rem; color: #8b949e;
    font-family: 'Inter', sans-serif;
  }
  .analytics-td.rank { color: #3d444d; font-family: 'Space Mono', monospace; font-size: 0.65rem; }
  .analytics-td.district-name {
    color: #e2e8f0; font-weight: 600;
    display: flex; align-items: center; gap: 0.6rem;
  }
  .district-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .analytics-td.crime-index {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.15rem; color: #e2e8f0; letter-spacing: 0.04em;
  }

  /* Risk badge */
  .risk-badge {
    font-family: 'Space Mono', monospace;
    font-size: 0.52rem; letter-spacing: 0.1em; font-weight: 700;
    padding: 0.2rem 0.5rem; text-transform: uppercase; color: #0a0c0f;
  }

  /* Intensity bar */
  .intensity-wrap { display: flex; align-items: center; gap: 0.6rem; }
  .intensity-track {
    flex: 1; height: 3px; background: #1e2530; max-width: 120px;
  }
  .intensity-fill { height: 100%; transition: width 0.3s; }
  .intensity-pct {
    font-family: 'Space Mono', monospace;
    font-size: 0.52rem; color: #555e6a; width: 28px; text-align: right;
  }

  /* Table footer */
  .analytics-footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid rgba(255,107,74,0.08);
    background: #111418;
    display: flex; align-items: center; justify-content: space-between;
  }
  .analytics-footer-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.52rem; letter-spacing: 0.12em;
    color: #3d444d; text-transform: uppercase;
  }

  /* Loading / Error states */
  .map-loading {
    min-height: 100vh; background: #0a0c0f;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 1rem;
  }
  .map-loading-text {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem; letter-spacing: 0.14em;
    color: #555e6a; text-transform: uppercase;
  }
  .map-error-card {
    background: #0d1117;
    border: 1px solid rgba(255,107,74,0.25);
    max-width: 480px; width: 100%; padding: 2rem;
    position: relative;
  }
  .map-error-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 2px; background: #ff6b4a;
  }
  .map-error-title {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase;
    color: #ff6b4a; margin-bottom: 0.75rem;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .map-error-msg { font-size: 0.85rem; color: #8b949e; margin-bottom: 1.25rem; line-height: 1.6; }
  .map-retry-btn {
    width: 100%; background: #ff6b4a; color: #0a0c0f;
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase;
    padding: 0.75rem; border: none; cursor: pointer; transition: background 0.15s;
  }
  .map-retry-btn:hover { background: #ff8c74; }

  /* Responsive */
  @media (max-width: 900px) {
    .map-grid { grid-template-columns: 1fr; }
    .map-page-header { flex-direction: column; }
    .map-header-stats { flex-wrap: wrap; }
  }
`;

export default function CrimeMap() {
  const [districts, setDistricts]         = useState<District[]>([]);
  const [allStats, setAllStats]           = useState<CrimeStat[]>([]);
  const [selectedYear, setSelectedYear]   = useState("2023");
  const [selectedCrime, setSelectedCrime] = useState("total");
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  const mapRef      = useRef<L.Map | null>(null);
  const circlesRef  = useRef<L.CircleMarker[]>([]);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const geoJsonData = useRef<any>(null);

  const years = ["2021", "2022", "2023"];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dRes, sRes, gRes] = await Promise.all([
          fetch("/api/districts"),
          fetch("/api/crime-stats"),
          fetch(GEOJSON_URL),
        ]);
        if (!dRes.ok) throw new Error(`Districts API failed: ${dRes.status}`);
        if (!sRes.ok) throw new Error(`Crime Stats API failed: ${sRes.status}`);
        if (!gRes.ok) throw new Error(`GeoJSON failed: ${gRes.status}`);

        const dData: District[]  = await dRes.json();
        const sData: CrimeStat[] = await sRes.json();
        const gData              = await gRes.json();

        if (!Array.isArray(dData) || dData.length === 0)
          throw new Error("Districts API returned empty data.");
        if (!Array.isArray(sData) || sData.length === 0)
          throw new Error("Crime Stats API returned empty data.");

        geoJsonData.current = gData;
        setDistricts(dData);
        setAllStats(sData);
      } catch (err: any) {
        console.error("❌ Fetch error:", err);
        setError(err.message || "Unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (mapRef.current && districts.length && allStats.length) {
      drawLayers(mapRef.current);
    }
  }, [selectedYear, selectedCrime, districts, allStats]);

  const getCrimeDef = () => CRIME_TYPES.find((c) => c.key === selectedCrime)!;

  const getDistrictCrimeData = () => {
    const crimeDef = getCrimeDef();
    return districts.map((district) => {
      const yearStat = allStats.find((stat) => {
        const sid = stat.districtId ?? stat.districts?.id;
        return sid === district.id && String(stat.year) === selectedYear;
      });
      const value     = yearStat ? ((yearStat as any)[crimeDef.key] ?? 0) : 0;
      const intensity = Math.min(1, value / crimeDef.max);
      let riskLevel: RiskLevel = "low";
      if (intensity > 0.75)      riskLevel = "critical";
      else if (intensity > 0.5)  riskLevel = "high";
      else if (intensity > 0.25) riskLevel = "medium";
      return { district, value, intensity, riskLevel };
    });
  };

  const drawLayers = (map: L.Map) => {
    circlesRef.current.forEach((c) => c.remove());
    circlesRef.current = [];
    if (geoLayerRef.current) { geoLayerRef.current.remove(); geoLayerRef.current = null; }

    const crimeData      = getDistrictCrimeData();
    const crimeDef       = getCrimeDef();
    const districtLookup = new Map(crimeData.map((d) => [d.district.name, d]));

    if (geoJsonData.current) {
      geoLayerRef.current = L.geoJSON(geoJsonData.current, {
        style: (feature) => {
          const geoName = feature?.properties?.name ?? "";
          const dbName  = GEO_TO_DB_NAME[geoName] ?? geoName;
          const data    = districtLookup.get(dbName);
          const color   = data ? RISK_COLORS[data.riskLevel] : "#94a3b8";
          return { fillColor: color, fillOpacity: 0.35, color, weight: 2, opacity: 0.8 };
        },
        onEachFeature: (feature, layer) => {
          const geoName = feature?.properties?.name ?? "";
          const dbName  = GEO_TO_DB_NAME[geoName] ?? geoName;
          const data    = districtLookup.get(dbName);
          if (data) {
            const { district, value, intensity, riskLevel } = data;
            const color = RISK_COLORS[riskLevel];
            layer.bindTooltip(
              `<strong>${district.name}</strong>${district.province ? ` · ${district.province}` : ""}`,
              { sticky: true }
            );
            layer.bindPopup(`
              <div style="font-family:sans-serif;min-width:190px">
                <strong style="font-size:14px">${district.name}</strong>
                ${district.province ? `<div style="color:#666;font-size:12px">${district.province} Province</div>` : ""}
                <hr style="margin:6px 0;border-color:#eee"/>
                <div>${crimeDef.emoji} <strong>${crimeDef.label}</strong></div>
                <div>Year: <strong>${selectedYear}</strong></div>
                <div>Count: <strong>${value.toLocaleString()}</strong></div>
                <div>Risk: <strong style="color:${color}">${riskLevel.toUpperCase()}</strong></div>
                <div>Intensity: ${(intensity * 100).toFixed(0)}%</div>
              </div>
            `);
            layer.on("mouseover", function (this: L.Path) { this.setStyle({ fillOpacity: 0.6, weight: 3 }); });
            layer.on("mouseout",  function (this: L.Path) { this.setStyle({ fillOpacity: 0.35, weight: 2 }); });
          } else {
            layer.bindTooltip(geoName, { sticky: true });
          }
        },
      }).addTo(map);
    }

    crimeData.forEach(({ district, value, intensity, riskLevel }) => {
      const color  = RISK_COLORS[riskLevel];
      const radius = 6 + intensity * 16;
      const circle = L.circleMarker(
        [Number(district.latitude), Number(district.longitude)],
        { radius, fillColor: color, fillOpacity: 0.9, color: "#fff", weight: 2 }
      ).addTo(map);
      circle.bindPopup(`
        <div style="font-family:sans-serif;min-width:190px">
          <strong style="font-size:14px">${district.name}</strong>
          ${district.province ? `<div style="color:#666;font-size:12px">${district.province} Province</div>` : ""}
          <hr style="margin:6px 0;border-color:#eee"/>
          <div>${crimeDef.emoji} <strong>${crimeDef.label}</strong></div>
          <div>Year: <strong>${selectedYear}</strong></div>
          <div>Count: <strong>${value.toLocaleString()}</strong></div>
          <div>Risk: <strong style="color:${color}">${riskLevel.toUpperCase()}</strong></div>
        </div>
      `);
      circlesRef.current.push(circle);
    });
  };

  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
    if (districts.length && allStats.length) drawLayers(map);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="map-loading">
        <style>{mapStyles}</style>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff6b4a" strokeWidth="1.5"
          style={{ animation: "spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <p className="map-loading-text">Loading Crime Map...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0c0f", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <style>{mapStyles}</style>
        <div className="map-error-card">
          <div className="map-error-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Map Data Load Failure
          </div>
          <p className="map-error-msg">{error}</p>
          <button className="map-retry-btn" onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const districtCrimeData = getDistrictCrimeData();
  const crimeDef          = getCrimeDef();
  const totalCrimes       = districtCrimeData.reduce((s, d) => s + d.value, 0);
  const criticalCount     = districtCrimeData.filter(d => d.riskLevel === "critical").length;
  const overallRisk       = criticalCount > 3 ? "CRITICAL" : criticalCount > 1 ? "ELEVATED" : "NOMINAL";

  return (
    <div className="map-page">
      <style>{mapStyles}</style>

      {/* ── Page header ── */}
      <div className="map-page-header">
        <div>
          <h1 className="map-page-title">Crime Hotspot Map<span></span></h1>
          <p className="map-page-sub">
            GIS Map visualization of regional risk areas across Sri Lanka.
            Real-time incident data aggregated by district sectors.
          </p>
        </div>
        <div className="map-header-stats">
          <div className="map-header-stat">
            <div className="map-header-stat-label">Active Alerts</div>
            <div className="map-header-stat-val">{totalCrimes.toLocaleString()}</div>
          </div>
          <div className="map-header-stat">
            <div className="map-header-stat-label">Risk Level</div>
            <div className={`map-header-stat-val elevated`}>{overallRisk}</div>
          </div>
        </div>
      </div>

      {/* ── Main grid: left panel + map ── */}
      <div className="map-grid">

        {/* Left panel */}
        <div className="map-panel">
          <div className="map-panel-section">
            <div className="map-panel-label">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>
              Data Filters
            </div>

            <div className="map-select-wrap">
              <span className="map-field-label">Crime Type</span>
              <Select value={selectedCrime} onValueChange={setSelectedCrime}>
                <SelectTrigger style={{
                  background: "#0a0c0f", border: "1px solid rgba(255,107,74,0.2)",
                  borderRadius: 0, color: "#e2e8f0",
                  fontFamily: "'Space Mono',monospace", fontSize: "0.7rem",
                }}>
                  <SelectValue placeholder="Select crime type" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {CRIME_TYPES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.emoji} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <span className="map-field-label">Intelligence Year</span>
              <div className="map-year-pills">
                {years.map((y) => (
                  <button
                    key={y}
                    className={`map-year-pill ${selectedYear === y ? "active" : ""}`}
                    onClick={() => setSelectedYear(y)}
                  >{y}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="map-panel-section">
            <div className="map-panel-label">Legend</div>
            <div className="map-legend">
              {([
                ["critical", "#dc2626", "Critical Risk"],
                ["high",     "#ea580c", "High Alert"],
                ["medium",   "#f59e0b", "Medium Risk"],
                ["low",      "#10b981", "Low & Stable"],
              ] as const).map(([, color, label]) => (
                <div className="map-legend-item" key={label}>
                  <div className="map-legend-dot" style={{ background: color }} />
                  <span className="map-legend-label">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Operational insight */}
          <div className="map-insight">
            <div className="map-insight-title">Operational Insight</div>
            <p className="map-insight-text">
              Showing <strong style={{color:"#ff6b4a"}}>{crimeDef.label}</strong> data
              for <strong style={{color:"#ff6b4a"}}>{selectedYear}</strong>.
              {criticalCount > 0 && ` ${criticalCount} district${criticalCount > 1 ? "s" : ""} at critical risk level.`}
            </p>
          </div>
        </div>

        {/* Map */}
        <div className="map-container">
          <div className="map-container-header">
            <div>
              <div className="map-container-title">Crime Distribution Map</div>
              <div className="map-container-sub">District boundaries colored by risk level · Click or hover for details</div>
            </div>
            <div className="map-active-badge">{crimeDef.emoji} {crimeDef.label} · {selectedYear}</div>
          </div>
          <MapView onMapReady={handleMapReady} />
        </div>
      </div>

      {/* ── District analytics table ── */}
      <div className="analytics-section">
        <div className="analytics-header">
          <div className="analytics-title">
            <svg className="analytics-title-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            District Analytics
          </div>
          
        </div>

        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead className="analytics-thead">
              <tr>
                <th className="analytics-th">#</th>
                <th className="analytics-th">District</th>
                <th className="analytics-th">Province</th>
                <th className="analytics-th">Crime Index</th>
                <th className="analytics-th">Risk Level</th>
                <th className="analytics-th">Intensity Profile</th>
              </tr>
            </thead>
            <tbody>
              {districtCrimeData
                .sort((a, b) => b.value - a.value)
                .map(({ district, value, intensity, riskLevel }, index) => (
                  <tr key={district.id} className="analytics-tr">
                    <td className="analytics-td rank">{String(index + 1).padStart(2, "0")}</td>
                    <td className="analytics-td">
                      <div className="district-name" style={{display:"flex",alignItems:"center",gap:"0.6rem",color:"#e2e8f0",fontWeight:600}}>
                        <div className="district-dot" style={{ background: RISK_COLORS[riskLevel] }} />
                        {district.name}
                      </div>
                    </td>
                    <td className="analytics-td">{district.province ?? "—"}</td>
                    <td className="analytics-td crime-index" style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.15rem",color:"#e2e8f0",letterSpacing:"0.04em"}}>
                      {value.toLocaleString()}
                    </td>
                    <td className="analytics-td">
                      <span className="risk-badge" style={{ background: RISK_COLORS[riskLevel] }}>
                        {riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="analytics-td">
                      <div className="intensity-wrap">
                        <div className="intensity-track">
                          <div className="intensity-fill" style={{
                            width: `${(intensity * 100).toFixed(0)}%`,
                            background: RISK_COLORS[riskLevel],
                          }} />
                        </div>
                        <span className="intensity-pct">{(intensity * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="analytics-footer">
            <span className="analytics-footer-label">
              Displaying {districtCrimeData.length} of {districtCrimeData.length} sectors
            </span>
            <span className="analytics-footer-label">{crimeDef.label} · {selectedYear}</span>
          </div>
        </div>
      </div>
    </div>
  );
}