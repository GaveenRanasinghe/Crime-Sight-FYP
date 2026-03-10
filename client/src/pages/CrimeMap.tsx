import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, MapPin } from "lucide-react";

const RISK_COLORS = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#f59e0b",
  low: "#10b981",
};

export default function CrimeMap() {
  const { data: districts } = trpc.crime.getAllDistricts.useQuery();
  const { data: allStats } = trpc.crime.getAllStats.useQuery();
  const [selectedYear, setSelectedYear] = useState<string>("2023");
  const [mapReady, setMapReady] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  const years = ["2021", "2022", "2023"];

  // Calculate crime intensity for each district in selected year
  const districtCrimeData = districts?.map(district => {
    const yearStats = allStats?.find(
      item =>
        item.districts.id === district.id &&
        item.crime_statistics.year === parseInt(selectedYear)
    );

    if (!yearStats) {
      return {
        district,
        total: 0,
        intensity: 0,
        riskLevel: "low" as const,
      };
    }

    const stat = yearStats.crime_statistics;
    const total = stat.total || 0;

    // Calculate intensity (0-1)
    const maxCrimes = 10000; // Reference max for normalization
    const intensity = Math.min(1, total / maxCrimes);

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (intensity > 0.75) riskLevel = "critical";
    else if (intensity > 0.5) riskLevel = "high";
    else if (intensity > 0.25) riskLevel = "medium";

    return {
      district,
      total,
      intensity,
      riskLevel,
    };
  }) || [];

  const handleMapReady = (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    setMapReady(true);

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    // Add markers for each district
    const newMarkers: google.maps.Marker[] = [];

    districtCrimeData.forEach(({ district, total, intensity, riskLevel }) => {
      const lat = parseFloat(district.latitude.toString());
      const lng = parseFloat(district.longitude.toString());

      // Create custom marker with color based on risk level
      const color = RISK_COLORS[riskLevel];
      const markerSize = 20 + intensity * 30; // Size based on intensity

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

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; font-family: Arial, sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${district.name}</h3>
            <p style="margin: 4px 0; font-size: 12px;">
              <strong>Total Crimes (${selectedYear}):</strong> ${total.toLocaleString()}
            </p>
            <p style="margin: 4px 0; font-size: 12px;">
              <strong>Risk Level:</strong> 
              <span style="display: inline-block; padding: 2px 6px; background-color: ${color}; color: white; border-radius: 3px; font-size: 11px; margin-left: 4px;">
                ${riskLevel.toUpperCase()}
              </span>
            </p>
            <p style="margin: 4px 0; font-size: 12px;">
              <strong>Intensity:</strong> ${(intensity * 100).toFixed(0)}%
            </p>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstance, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Center map on Sri Lanka
    mapInstance.setCenter({ lat: 7.8731, lng: 80.7718 });
    mapInstance.setZoom(8);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Crime Hotspot Map</h1>
          <p className="text-gray-600">Interactive GIS visualization of crime intensity by district</p>
        </div>

        {/* Map Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Crime Distribution Map</CardTitle>
                <CardDescription>
                  Circle size and color indicate crime intensity. Larger and redder circles indicate higher crime rates.
                </CardDescription>
              </div>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <MapView onMapReady={handleMapReady} />
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Risk Level Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: RISK_COLORS.critical }}></div>
                <span className="text-sm font-medium">Critical (75%+)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: RISK_COLORS.high }}></div>
                <span className="text-sm font-medium">High (50-75%)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: RISK_COLORS.medium }}></div>
                <span className="text-sm font-medium">Medium (25-50%)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: RISK_COLORS.low }}></div>
                <span className="text-sm font-medium">Low (&lt;25%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* District Statistics Table */}
        <Card>
          <CardHeader>
            <CardTitle>District Statistics</CardTitle>
            <CardDescription>Crime statistics for {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">District</th>
                    <th className="text-left py-3 px-4 font-semibold">Total Crimes</th>
                    <th className="text-left py-3 px-4 font-semibold">Intensity</th>
                    <th className="text-left py-3 px-4 font-semibold">Risk Level</th>
                    <th className="text-left py-3 px-4 font-semibold">Coordinates</th>
                  </tr>
                </thead>
                <tbody>
                  {districtCrimeData
                    .sort((a, b) => b.total - a.total)
                    .map(({ district, total, intensity, riskLevel }) => (
                      <tr key={district.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{district.name}</td>
                        <td className="py-3 px-4">{total.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${intensity * 100}%`,
                                  backgroundColor: RISK_COLORS[riskLevel],
                                }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">{(intensity * 100).toFixed(0)}%</span>
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
                            {parseFloat(district.latitude.toString()).toFixed(4)}, {parseFloat(district.longitude.toString()).toFixed(4)}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
