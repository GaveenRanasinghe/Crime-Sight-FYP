import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { MapView } from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, AlertCircle, Loader2 } from "lucide-react";

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
  districts?: District;
};

type RiskLevel = "critical" | "high" | "medium" | "low";

const RISK_COLORS: Record<RiskLevel, string> = {
  critical: "#dc2626",
  high:     "#ea580c",
  medium:   "#f59e0b",
  low:      "#10b981",
};

export default function CrimeMap() {
  const [districts, setDistricts]       = useState<District[]>([]);
  const [allStats, setAllStats]         = useState<CrimeStat[]>([]);
  const [selectedYear, setSelectedYear] = useState("2023");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const mapRef    = useRef<L.Map | null>(null);
  const layersRef = useRef<L.CircleMarker[]>([]);

  const years = ["2021", "2022", "2023"];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const dRes = await fetch("/api/districts");
        if (!dRes.ok) throw new Error(`Districts API failed: ${dRes.status} ${dRes.statusText}`);
        const dData: District[] = await dRes.json();
        console.log("✅ Districts:", dData);
        if (!Array.isArray(dData) || dData.length === 0)
          throw new Error("Districts API returned empty data. Have you run the SQL seed in Supabase?");

        const sRes = await fetch("/api/crime-stats");
        if (!sRes.ok) throw new Error(`Crime Stats API failed: ${sRes.status} ${sRes.statusText}`);
        const sData: CrimeStat[] = await sRes.json();
        console.log("✅ Crime Stats:", sData);
        if (!Array.isArray(sData) || sData.length === 0)
          throw new Error("Crime Stats API returned empty data. Have you run the SQL seed in Supabase?");

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

  // Redraw circles when year or data changes
  useEffect(() => {
    if (mapRef.current && districts.length && allStats.length) {
      drawMarkers(mapRef.current);
    }
  }, [selectedYear, districts, allStats]);

  const getDistrictCrimeData = () =>
    districts.map((district) => {
      const yearStat = allStats.find((stat) => {
        const sid = stat.districtId ?? stat.districts?.id;
        return sid === district.id && String(stat.year) === selectedYear;
      });
      const total     = yearStat?.total ?? 0;
      const intensity = Math.min(1, total / 10000);
      let riskLevel: RiskLevel = "low";
      if (intensity > 0.75)      riskLevel = "critical";
      else if (intensity > 0.5)  riskLevel = "high";
      else if (intensity > 0.25) riskLevel = "medium";
      return { district, total, intensity, riskLevel };
    });

  const drawMarkers = (map: L.Map) => {
    // Remove old layers
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    getDistrictCrimeData().forEach(({ district, total, intensity, riskLevel }) => {
      const lat   = Number(district.latitude);
      const lng   = Number(district.longitude);
      const color = RISK_COLORS[riskLevel];
      const radius = 8 + intensity * 24;

      const circle = L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.75,
        color: "#ffffff",
        weight: 2,
      }).addTo(map);

      circle.bindPopup(`
        <div style="font-family:sans-serif;min-width:160px">
          <strong style="font-size:14px">${district.name}</strong>
          ${district.province ? `<div style="color:#666;font-size:12px">${district.province} Province</div>` : ""}
          <hr style="margin:6px 0;border-color:#eee"/>
          <div>Crimes (${selectedYear}): <strong>${total.toLocaleString()}</strong></div>
          <div>Risk: <strong style="color:${color}">${riskLevel.toUpperCase()}</strong></div>
          <div>Intensity: ${(intensity * 100).toFixed(0)}%</div>
        </div>
      `);

      layersRef.current.push(circle);
    });
  };

  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
    if (districts.length && allStats.length) {
      drawMarkers(map);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-lg font-medium">Loading map data...</p>
          <p className="text-sm text-gray-400">Fetching districts and crime statistics</p>
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
            <div className="bg-gray-50 rounded p-3 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-600">Possible causes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Flask server not running on port 5000</li>
                <li>Supabase tables not created — run the SQL setup file</li>
                <li>SUPABASE_URL or SUPABASE_KEY missing in .env</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const districtCrimeData = getDistrictCrimeData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Crime Hotspot Map</h1>
          <p className="text-gray-600">Interactive GIS visualization of crime intensity by district</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Crime Distribution Map</CardTitle>
                <CardDescription>
                  Circle size and color represent crime intensity. Click a circle for details.
                </CardDescription>
              </div>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border">
              <MapView onMapReady={handleMapReady} />
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex gap-6 mb-6 flex-wrap">
          {(Object.entries(RISK_COLORS) as [RiskLevel, string][]).map(([level, color]) => (
            <div key={level} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: color }} />
              <span className="text-sm text-gray-600 capitalize font-medium">{level}</span>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>District Statistics</CardTitle>
            <CardDescription>Crime statistics for {selectedYear} — sorted by total crimes</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">District</th>
                  <th className="text-left py-3 px-4">Province</th>
                  <th className="text-left py-3 px-4">Total Crimes</th>
                  <th className="text-left py-3 px-4">Intensity</th>
                  <th className="text-left py-3 px-4">Risk Level</th>
                  <th className="text-left py-3 px-4">Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {districtCrimeData
                  .sort((a, b) => b.total - a.total)
                  .map(({ district, total, intensity, riskLevel }, index) => (
                    <tr key={district.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                      <td className="py-3 px-4 font-medium">{district.name}</td>
                      <td className="py-3 px-4 text-gray-500">{district.province ?? "—"}</td>
                      <td className="py-3 px-4">{total.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${(intensity * 100).toFixed(0)}%`,
                                backgroundColor: RISK_COLORS[riskLevel],
                              }}
                            />
                          </div>
                          <span className="text-xs">{(intensity * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-1 rounded text-white text-xs font-semibold"
                          style={{ backgroundColor: RISK_COLORS[riskLevel] }}
                        >
                          {riskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {Number(district.latitude).toFixed(4)}, {Number(district.longitude).toFixed(4)}
                        </div>
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