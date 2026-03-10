import { useState, useEffect } from "react";
import { MapView } from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

type District = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

type CrimeStat = {
  districts: {
    id: number;
  };
  crime_statistics: {
    year: number;
    total: number;
  };
};

type RiskLevel = "critical" | "high" | "medium" | "low";

const RISK_COLORS: Record<RiskLevel, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#f59e0b",
  low: "#10b981",
};

export default function CrimeMap() {

  const [districts, setDistricts] = useState<District[]>([]);
  const [allStats, setAllStats] = useState<CrimeStat[]>([]);
  const [selectedYear, setSelectedYear] = useState("2023");
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  const years = ["2021", "2022", "2023"];

  useEffect(() => {
    fetch("/api/districts")
      .then(res => res.json())
      .then(data => setDistricts(data));

    fetch("/api/crime-stats")
      .then(res => res.json())
      .then(data => setAllStats(data));
  }, []);

  if (!districts.length || !allStats.length) {
    return <div className="p-6">Loading map data...</div>;
  }

  const districtCrimeData = districts.map((district) => {

    const yearStats = allStats.find(
      (item) =>
        item.districts.id === district.id &&
        item.crime_statistics.year === parseInt(selectedYear)
    );

    if (!yearStats) {
      return {
        district,
        total: 0,
        intensity: 0,
        riskLevel: "low" as RiskLevel,
      };
    }

    const stat = yearStats.crime_statistics;
    const total = stat.total || 0;

    const maxCrimes = 10000;
    const intensity = Math.min(1, total / maxCrimes);

    let riskLevel: RiskLevel = "low";

    if (intensity > 0.75) riskLevel = "critical";
    else if (intensity > 0.5) riskLevel = "high";
    else if (intensity > 0.25) riskLevel = "medium";

    return {
      district,
      total,
      intensity,
      riskLevel,
    };
  });

  const handleMapReady = (mapInstance: google.maps.Map) => {

    markers.forEach((marker) => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    districtCrimeData.forEach(({ district, total, intensity, riskLevel }) => {

      const lat = Number(district.latitude);
      const lng = Number(district.longitude);

      const color = RISK_COLORS[riskLevel];
      const markerSize = 20 + intensity * 30;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: mapInstance,
        title: district.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: markerSize / 2,
          fillColor: color,
          fillOpacity: 0.7,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding:10px">
            <strong>${district.name}</strong><br/>
            Crimes (${selectedYear}): ${total.toLocaleString()}<br/>
            Risk: ${riskLevel.toUpperCase()}<br/>
            Intensity: ${(intensity * 100).toFixed(0)}%
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstance, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    mapInstance.setCenter({ lat: 7.8731, lng: 80.7718 });
    mapInstance.setZoom(8);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">

      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Crime Hotspot Map
          </h1>
          <p className="text-gray-600">
            Interactive GIS visualization of crime intensity by district
          </p>
        </div>

        <Card className="mb-8">

          <CardHeader>
            <div className="flex justify-between items-center">

              <div>
                <CardTitle>Crime Distribution Map</CardTitle>
                <CardDescription>
                  Circle size and color represent crime intensity
                </CardDescription>
              </div>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
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

        <Card>

          <CardHeader>
            <CardTitle>District Statistics</CardTitle>
            <CardDescription>
              Crime statistics for {selectedYear}
            </CardDescription>
          </CardHeader>

          <CardContent>

            <table className="w-full text-sm">

              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4">District</th>
                  <th className="text-left py-3 px-4">Total Crimes</th>
                  <th className="text-left py-3 px-4">Intensity</th>
                  <th className="text-left py-3 px-4">Risk Level</th>
                  <th className="text-left py-3 px-4">Coordinates</th>
                </tr>
              </thead>

              <tbody>

                {districtCrimeData
                  .sort((a, b) => b.total - a.total)
                  .map(({ district, total, intensity, riskLevel }) => (

                    <tr key={district.id} className="border-b">

                      <td className="py-3 px-4 font-medium">
                        {district.name}
                      </td>

                      <td className="py-3 px-4">
                        {total.toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        {(intensity * 100).toFixed(0)}%
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-1 rounded text-white text-xs"
                          style={{ backgroundColor: RISK_COLORS[riskLevel] }}
                        >
                          {riskLevel.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-gray-600">

                        <div className="flex items-center gap-1">

                          <MapPin className="w-3 h-3" />

                          {Number(district.latitude).toFixed(4)},{" "}
                          {Number(district.longitude).toFixed(4)}

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