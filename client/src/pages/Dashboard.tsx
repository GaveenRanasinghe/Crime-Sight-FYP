import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertCircle, TrendingUp, TrendingDown, Activity, Printer, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];
const RISK_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#f59e0b",
  low: "#10b981",
};

interface CrimeStatistic {
  year: number;
  total?: number;
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
}

interface StatItem {
  crime_statistics: CrimeStatistic;
}

interface DistrictSummary {
  totalCrimes: number;
  averagePerYear: number;
  trend: string;
  riskLevel: string;
  yearOverYearChange: number;
}

interface HighRiskDistrict {
  district: { id: string | number; name: string };
  summary: DistrictSummary;
}

interface DashboardSummary {
  totalDistricts: number;
  totalCrimes: number;
  averageCrimesPerDistrict: number;
  highRiskCount: number;
  highRiskDistricts: HighRiskDistrict[];
}

function getCrimeCount(stat: CrimeStatistic, type: string): number {
  switch (type) {
    case "Rape Cases": return stat.rapeCases || 0;
    case "Homicide": return stat.homicide || 0;
    case "Attempted Homicide": return stat.attemptedHomicide || 0;
    case "Abduction": return stat.abduction || 0;
    case "Kidnapping": return stat.kidnapping || 0;
    case "Arson": return stat.arson || 0;
    case "Theft over Rs. 50,000": return stat.theftOver50k || 0;
    case "Grievous Hurt": return stat.grievousHurt || 0;
    case "Hurt by Knife": return stat.hurtByKnife || 0;
    case "Robbery": return stat.robbery || 0;
    case "Extortion": return stat.extortion || 0;
    case "Unnatural Offense": return stat.unnaturalOffense || 0;
    case "Sexual Abuse": return stat.sexualAbuse || 0;
    default: return 0;
  }
}

export default function Dashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crimeRouter = (trpc as any).crime;
  const { data: summary, isLoading: summaryLoading }: { data: DashboardSummary | undefined; isLoading: boolean } =
    crimeRouter.getDashboardSummary.useQuery();
  const { data: allStats }: { data: StatItem[] | undefined } =
    crimeRouter.getAllStats.useQuery();

  const [selectedYear, setSelectedYear] = useState<string>("2023");
  const [selectedCrimeType, setSelectedCrimeType] = useState<string>("Robbery");

  const years = ["2021", "2022", "2023"];
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

  // Prepare year-over-year comparison data
  const yearData = years.map((year) => {
    const yearStats = allStats?.filter((item: StatItem) => item.crime_statistics.year === parseInt(year)) || [];
    const total = yearStats.reduce((sum: number, item: StatItem) => sum + (item.crime_statistics.total || 0), 0);
    return {
      year,
      total,
      average: Math.round(total / (yearStats.length || 1)),
    };
  });

  // Prepare crime type distribution for selected year
  const crimeTypeData = crimeTypes.map((type) => {
    const yearStats = allStats?.filter((item: StatItem) => item.crime_statistics.year === parseInt(selectedYear)) || [];
    const total = yearStats.reduce((sum: number, item: StatItem) => sum + getCrimeCount(item.crime_statistics, type), 0);
    return { name: type, value: total };
  }).filter((item) => item.value > 0);

  // Prepare trend data for selected crime type
  const trendData = years.map((year) => {
    const yearStats = allStats?.filter((item: StatItem) => item.crime_statistics.year === parseInt(year)) || [];
    const total = yearStats.reduce((sum: number, item: StatItem) => sum + getCrimeCount(item.crime_statistics, selectedCrimeType), 0);
    return { year, count: total };
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!summary?.highRiskDistricts) return;

    let csv = "District,Total Crimes,Average per Year,Trend,Risk Level,YoY Change\n";
    summary.highRiskDistricts.forEach((item: HighRiskDistrict) => {
      csv += `"${item.district.name}",${item.summary.totalCrimes},${item.summary.averagePerYear},"${item.summary.trend}","${item.summary.riskLevel}",${item.summary.yearOverYearChange}\n`;
    });

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
    element.setAttribute("download", `crime-report-${new Date().toISOString().split("T")[0]}.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <style>{`
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .max-w-7xl { max-width: 100%; }
          .grid { page-break-inside: avoid; }
        }
      `}</style>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start no-print">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Crime Analytics Dashboard</h1>
            <p className="text-gray-600">Sri Lanka District-Level Crime Statistics (2021-2023)</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleExportCSV}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              size="lg"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              size="lg"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Districts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary?.totalDistricts || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Monitored districts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Crimes (3 Years)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary?.totalCrimes?.toLocaleString() || 0}</div>
              <p className="text-xs text-gray-500 mt-1">All crime types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Average per District</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary?.averageCrimesPerDistrict?.toLocaleString() || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Per district total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">High-Risk Districts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{summary?.highRiskCount || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Require attention</p>
            </CardContent>
          </Card>
        </div>

        {/* High-Risk Alert */}
        {summary?.highRiskDistricts && summary.highRiskDistricts.length > 0 && (
          <Alert className="mb-8 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{summary.highRiskDistricts.length} districts</strong> identified as high-risk or critical:{" "}
              {summary.highRiskDistricts.slice(0, 3).map((d: HighRiskDistrict) => d.district.name).join(", ")}
              {summary.highRiskDistricts.length > 3 && ` and ${summary.highRiskDistricts.length - 3} more`}
            </AlertDescription>
          </Alert>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Year-over-Year Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Crime Trend (2021-2023)</CardTitle>
              <CardDescription>Total crimes by year across all districts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={yearData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total Crimes" />
                  <Line type="monotone" dataKey="average" stroke="#8b5cf6" strokeWidth={2} name="Average per District" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Crime Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Crime Type Distribution</CardTitle>
              <CardDescription>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32 h-8 text-xs mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={crimeTypeData}
                    cx="35%"
                    cy="50%"
                    labelLine={true}
                    label={({ percent }: { percent: number }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {crimeTypeData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: "20px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Crime Trend Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Crime Trend Analysis</CardTitle>
            <CardDescription>
              <div className="flex gap-4 mt-2">
                <Select value={selectedCrimeType} onValueChange={setSelectedCrimeType}>
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {crimeTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Bar dataKey="count" fill="#3b82f6" name={selectedCrimeType} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* High-Risk Districts Table */}
        {summary?.highRiskDistricts && summary.highRiskDistricts.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>High-Risk Districts</CardTitle>
              <CardDescription>Districts with critical or high crime risk levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 px-4 font-semibold">District</th>
                      <th className="text-left py-2 px-4 font-semibold">Total Crimes</th>
                      <th className="text-left py-2 px-4 font-semibold">Avg/Year</th>
                      <th className="text-left py-2 px-4 font-semibold">Trend</th>
                      <th className="text-left py-2 px-4 font-semibold">Risk Level</th>
                      <th className="text-left py-2 px-4 font-semibold">YoY Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.highRiskDistricts.map((item: HighRiskDistrict) => (
                      <tr key={item.district.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{item.district.name}</td>
                        <td className="py-3 px-4">{item.summary.totalCrimes.toLocaleString()}</td>
                        <td className="py-3 px-4">{item.summary.averagePerYear.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {item.summary.trend === "increasing" ? (
                              <TrendingUp className="w-4 h-4 text-red-600" />
                            ) : item.summary.trend === "decreasing" ? (
                              <TrendingDown className="w-4 h-4 text-green-600" />
                            ) : (
                              <span className="w-4 h-4 text-gray-400">→</span>
                            )}
                            <span className="capitalize">{item.summary.trend}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-1 rounded text-white text-xs font-semibold"
                            style={{ backgroundColor: RISK_COLORS[item.summary.riskLevel] || "#6b7280" }}
                          >
                            {item.summary.riskLevel.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={item.summary.yearOverYearChange > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                            {item.summary.yearOverYearChange > 0 ? "+" : ""}{item.summary.yearOverYearChange.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}