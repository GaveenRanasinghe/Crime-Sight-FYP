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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-lg font-medium">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <CardTitle className="text-red-600">Failed to Load Map Data</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 text-sm">{error}</p>
            <button onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const districtCrimeData = getDistrictCrimeData();
  const crimeDef          = getCrimeDef();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Page header ── */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Crime Hotspot Map</h1>
          <p className="text-gray-600">Interactive GIS visualization of crime intensity by district</p>
        </div>

        {/* ── Filter bar — ABOVE the map so dropdowns never go behind it ── */}
        <div className="bg-white rounded-xl border shadow-sm px-5 py-4 mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          {/* Crime type dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Crime Type</label>
            <Select value={selectedCrime} onValueChange={setSelectedCrime}>
              <SelectTrigger className="w-56 bg-white">
                <SelectValue placeholder="Select crime type" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {CRIME_TYPES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Year</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Active filter badge */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">Showing:</span>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-sm font-medium">
              {crimeDef.emoji} {crimeDef.label}
            </span>
            <span className="bg-gray-100 text-gray-700 border border-gray-200 rounded-full px-3 py-1 text-sm font-medium">
              {selectedYear}
            </span>
          </div>
        </div>

        {/* ── Map card ── */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle>Crime Distribution Map</CardTitle>
            <CardDescription>
              District boundaries colored by risk level. Click or hover for details.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-xl overflow-hidden">
              <MapView onMapReady={handleMapReady} />
            </div>
          </CardContent>
        </Card>

        {/* ── Legend ── */}
        <div className="flex gap-6 mb-6 flex-wrap items-center">
          <span className="text-sm text-gray-500 font-medium">Risk Level:</span>
          {(Object.entries(RISK_COLORS) as [RiskLevel, string][]).map(([level, color]) => (
            <div key={level} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-white shadow" style={{ backgroundColor: color }} />
              <span className="text-sm text-gray-600 capitalize font-medium">{level}</span>
            </div>
          ))}
        </div>

        {/* ── Stats table ── */}
        <Card>
          <CardHeader>
            <CardTitle>District Statistics</CardTitle>
            <CardDescription>
              {crimeDef.emoji} {crimeDef.label} · {selectedYear} — sorted by count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">District</th>
                  <th className="text-left py-3 px-4">Province</th>
                  <th className="text-left py-3 px-4">{crimeDef.label}</th>
                  <th className="text-left py-3 px-4">Intensity</th>
                  <th className="text-left py-3 px-4">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {districtCrimeData
                  .sort((a, b) => b.value - a.value)
                  .map(({ district, value, intensity, riskLevel }, index) => (
                    <tr key={district.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                      <td className="py-3 px-4 font-medium">{district.name}</td>
                      <td className="py-3 px-4 text-gray-500">{district.province ?? "—"}</td>
                      <td className="py-3 px-4 font-semibold">{value.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{
                              width: `${(intensity * 100).toFixed(0)}%`,
                              backgroundColor: RISK_COLORS[riskLevel],
                            }} />
                          </div>
                          <span className="text-xs">{(intensity * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded text-white text-xs font-semibold"
                          style={{ backgroundColor: RISK_COLORS[riskLevel] }}>
                          {riskLevel.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}