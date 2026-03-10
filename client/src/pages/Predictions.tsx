import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Activity,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RISK_COLORS = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#f59e0b",
  low: "#10b981",
};

export default function Predictions() {
  const { data: districts } = (trpc as any).crime.getAllDistricts.useQuery();
  const { data: allStats } = (trpc as any).crime.getAllStats.useQuery();

  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedCrimeType, setSelectedCrimeType] = useState<string>("Robbery");

  const { data: predictions } = (trpc as any).crime.getPredictions.useQuery(
    { districtId: parseInt(selectedDistrict) },
    { enabled: !!selectedDistrict }
  );

  const generatePredictions = (trpc as any).crime.generatePredictions.useMutation();

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

          predictions?.forEach((pred: any) => {
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
        })()
      : [];

  const selectedDistrictName =
    districts?.find((d: any) => d.id === parseInt(selectedDistrict))?.name || "";

  const filteredPredictions =
    predictions?.filter((p: any) => p.crimeType === selectedCrimeType) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Crime Predictions
          </h1>
          <p className="text-gray-600">
            AI-powered forecasting for future crime trends
          </p>
        </div>

        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Generate Predictions
            </CardTitle>
            <CardDescription>
              Generate predictions using historical crime data
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              onClick={() => generatePredictions.mutate()}
              disabled={generatePredictions.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generatePredictions.isPending
                ? "Generating..."
                : "Generate Predictions"}
            </Button>

            {generatePredictions.isSuccess && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {generatePredictions.data?.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Select District</CardTitle>
            </CardHeader>

            <CardContent>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose district" />
                </SelectTrigger>

                <SelectContent>
                  {districts?.map((district: any) => (
                    <SelectItem key={district.id} value={district.id.toString()}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>

          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Select Crime Type</CardTitle>
            </CardHeader>

            <CardContent>
              <Select value={selectedCrimeType} onValueChange={setSelectedCrimeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {crimeTypes.map((type) => (
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

          <Card>

            <CardHeader>
              <CardTitle>Historical vs Predicted Trend</CardTitle>
              <CardDescription>
                {selectedDistrictName} - {selectedCrimeType}
              </CardDescription>
            </CardHeader>

            <CardContent>

              <ResponsiveContainer width="100%" height={400}>

                <LineChart data={chartData}>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="year" />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    name="Historical"
                  />

                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    name="Predicted"
                  />

                </LineChart>

              </ResponsiveContainer>

            </CardContent>

          </Card>

        ) : (

          <Card className="text-center py-12">

            <CardContent>
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">
                Select a district to view predictions
              </p>
            </CardContent>

          </Card>

        )}

      </div>
    </div>
  );
}