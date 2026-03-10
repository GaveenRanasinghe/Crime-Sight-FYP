import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertCircle, TrendingUp, TrendingDown, Zap, Activity } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RISK_COLORS = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#f59e0b",
  low: "#10b981",
};

export default function Predictions() {
  const { data: districts } = trpc.crime.getAllDistricts.useQuery();
  const { data: allStats } = trpc.crime.getAllStats.useQuery();
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedCrimeType, setSelectedCrimeType] = useState<string>("Robbery");
  const { data: predictions } = trpc.crime.getPredictions.useQuery(
    { districtId: parseInt(selectedDistrict) },
    { enabled: !!selectedDistrict }
  );
  const generatePredictions = trpc.crime.generatePredictions.useMutation();

  const crimeTypes = [
    "Rape Cases",
    "Homicide",
    "Attempted Homicide",
    "Abduction",
    "Kidnapping",
    "Arson",
    "Theft over Rs. 50,000",
    "Grievous Hurt",
    "Hurt by Knife",
    "Robbery",
    "Extortion",
    "Unnatural Offense",
    "Sexual Abuse",
  ];

  // Get historical and predicted data for selected crime type
  const chartData = selectedDistrict && allStats ? (() => {
    const districtStats = allStats.filter(
      item => item.districts.id === parseInt(selectedDistrict)
    );

    const data: any[] = [];

    // Add historical data
    districtStats.forEach(item => {
      const stat = item.crime_statistics;
      let value = 0;

      switch (selectedCrimeType) {
        case "Rape Cases":
          value = stat.rapeCases || 0;
          break;
        case "Homicide":
          value = stat.homicide || 0;
          break;
        case "Attempted Homicide":
          value = stat.attemptedHomicide || 0;
          break;
        case "Abduction":
          value = stat.abduction || 0;
          break;
        case "Kidnapping":
          value = stat.kidnapping || 0;
          break;
        case "Arson":
          value = stat.arson || 0;
          break;
        case "Theft over Rs. 50,000":
          value = stat.theftOver50k || 0;
          break;
        case "Grievous Hurt":
          value = stat.grievousHurt || 0;
          break;
        case "Hurt by Knife":
          value = stat.hurtByKnife || 0;
          break;
        case "Robbery":
          value = stat.robbery || 0;
          break;
        case "Extortion":
          value = stat.extortion || 0;
          break;
        case "Unnatural Offense":
          value = stat.unnaturalOffense || 0;
          break;
        case "Sexual Abuse":
          value = stat.sexualAbuse || 0;
          break;
      }

      data.push({
        year: stat.year,
        actual: value,
        type: "historical",
      });
    });

    // Add predicted data
    predictions?.forEach(pred => {
      if (pred.crimeType === selectedCrimeType) {
        data.push({
          year: pred.predictedYear,
          predicted: pred.predictedValue,
          type: "predicted",
          confidence: pred.confidence,
        });
      }
    });

    return data.sort((a, b) => a.year - b.year);
  })() : [];

  const selectedDistrictName = districts?.find(d => d.id === parseInt(selectedDistrict))?.name || "";
  const filteredPredictions = predictions?.filter(p => p.crimeType === selectedCrimeType) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Crime Predictions</h1>
          <p className="text-gray-600">AI-powered forecasting for future crime trends by district</p>
        </div>

        {/* Generate Predictions Button */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Generate Predictions
            </CardTitle>
            <CardDescription>
              Generate predictions for all districts and crime types based on historical data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => generatePredictions.mutate()}
              disabled={generatePredictions.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generatePredictions.isPending ? "Generating..." : "Generate Predictions"}
            </Button>
            {generatePredictions.isSuccess && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {generatePredictions.data?.message}
                </AlertDescription>
              </Alert>
            )}
            {generatePredictions.isError && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Failed to generate predictions. Please try again.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select District</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a district..." />
                </SelectTrigger>
                <SelectContent>
                  {districts?.map(district => (
                    <SelectItem key={district.id} value={district.id.toString()}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select Crime Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCrimeType} onValueChange={setSelectedCrimeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {crimeTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {selectedDistrict ? (
          <>
            {/* Prediction Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Historical & Predicted Trend</CardTitle>
                <CardDescription>
                  {selectedDistrictName} - {selectedCrimeType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => value?.toLocaleString()}
                        labelFormatter={(label) => `Year: ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Historical Data"
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Predicted"
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <Activity className="w-8 h-8 mr-2 animate-spin" />
                    Loading chart data...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Predictions Summary */}
            {filteredPredictions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Prediction Details</CardTitle>
                  <CardDescription>
                    Forecasted values for {selectedCrimeType} in {selectedDistrictName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPredictions.map((pred, idx) => (
                      <Card key={idx} className="border">
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm text-gray-600">Year</p>
                                <p className="text-2xl font-bold text-gray-900">{pred.predictedYear}</p>
                              </div>
                              <span
                                className="px-3 py-1 rounded text-white text-xs font-semibold"
                                style={{ backgroundColor: RISK_COLORS[pred.riskLevel] }}
                              >
                                {pred.riskLevel.toUpperCase()}
                              </span>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Predicted Cases</p>
                              <p className="text-xl font-bold text-gray-900">{pred.predictedValue.toLocaleString()}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-gray-600">Confidence</p>
                                <p className="text-lg font-semibold text-gray-900">{pred.confidence}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Trend</p>
                                <div className="flex items-center gap-1 mt-1">
                                  {pred.trend === "increasing" ? (
                                    <TrendingUp className="w-5 h-5 text-red-600" />
                                  ) : pred.trend === "decreasing" ? (
                                    <TrendingDown className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <div className="w-5 h-5 text-gray-400">→</div>
                                  )}
                                  <span className="text-sm font-medium capitalize">{pred.trend}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Select a district to view predictions</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
