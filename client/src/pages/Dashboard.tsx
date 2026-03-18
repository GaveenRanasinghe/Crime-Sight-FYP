import * as XLSX from "xlsx";
import { useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { AlertCircle, TrendingUp, TrendingDown, Activity, Printer, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e",
  "#a855f7", "#06b6d4", "#facc15",
];

const RISK_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high:     "#ea580c",
  medium:   "#f59e0b",
  low:      "#10b981",
};

const YEARS = ["2021", "2022", "2023"];

const CRIME_TYPES = [
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrimeStatistic {
  year:              number;
  districtName:      string;
  total:             number;
  rapeCases:         number;
  homicide:          number;
  attemptedHomicide: number;
  abduction:         number;
  kidnapping:        number;
  arson:             number;
  theftOver50k:      number;
  grievousHurt:      number;
  hurtByKnife:       number;
  robbery:           number;
  extortion:         number;
  unnaturalOffense:  number;
  sexualAbuse:       number;
}

interface StatItem {
  crime_statistics: CrimeStatistic;
}

interface DistrictSummary {
  totalCrimes:        number;
  averagePerYear:     number;
  trend:              string;
  riskLevel:          string;
  yearOverYearChange: number;
}

interface HighRiskDistrict {
  district: { id: string | number; name: string };
  summary:  DistrictSummary;
}

interface DashboardSummary {
  totalDistricts:           number;
  totalCrimes:              number;
  averageCrimesPerDistrict: number;
  highRiskCount:            number;
  highRiskDistricts:        HighRiskDistrict[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Safe number — NaN becomes 0
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function num(val: any): number {
  const v = Number(val);
  return isNaN(v) ? 0 : v;
}

// Return the first key in `keys` that exists and is non-empty on `row`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(row: any, keys: string[]): any {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function getCrimeCount(stat: CrimeStatistic, type: string): number {
  const map: Record<string, number> = {
    "Rape Cases":             stat.rapeCases,
    "Homicide":               stat.homicide,
    "Attempted Homicide":     stat.attemptedHomicide,
    "Abduction":              stat.abduction,
    "Kidnapping":             stat.kidnapping,
    "Arson":                  stat.arson,
    "Theft over Rs. 50,000":  stat.theftOver50k,
    "Grievous Hurt":          stat.grievousHurt,
    "Hurt by Knife":          stat.hurtByKnife,
    "Robbery":                stat.robbery,
    "Extortion":              stat.extortion,
    "Unnatural Offense":      stat.unnaturalOffense,
    "Sexual Abuse":           stat.sexualAbuse,
  };
  return map[type] ?? 0;
}

function getRiskLevel(totalCrimes: number, avg: number): string {
  if (totalCrimes > avg * 1.5) return "critical";
  if (totalCrimes > avg * 1.2) return "high";
  if (totalCrimes > avg * 0.8) return "medium";
  return "low";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRow(row: any): CrimeStatistic {
  const rapeCases         = num(pick(row, ["Rape Cases", "rape_cases", "rapeCases", "RAPE CASES"]));
  const homicide          = num(pick(row, ["Homicide", "homicide", "HOMICIDE"]));
  const attemptedHomicide = num(pick(row, ["Attempted Homicide", "attempted_homicide", "attemptedHomicide"]));
  const abduction         = num(pick(row, ["Abduction", "abduction", "ABDUCTION"]));
  const kidnapping        = num(pick(row, ["Kidnapping", "kidnapping", "KIDNAPPING"]));
  const arson             = num(pick(row, ["Arson", "arson", "ARSON"]));
  const theftOver50k      = num(pick(row, ["Theft over Rs. 50,000", "Theft Over Rs. 50,000", "Theft over Rs.50,000", "theft_over_50k", "theftOver50k"]));
  const grievousHurt      = num(pick(row, ["Grievous Hurt", "grievous_hurt", "grievousHurt", "GRIEVOUS HURT"]));
  const hurtByKnife       = num(pick(row, ["Hurt by Knife", "hurt_by_knife", "hurtByKnife", "HURT BY KNIFE"]));
  const robbery           = num(pick(row, ["Robbery", "robbery", "ROBBERY"]));
  const extortion         = num(pick(row, ["Extortion", "extortion", "EXTORTION"]));
  const unnaturalOffense  = num(pick(row, ["Unnatural Offense", "unnatural_offense", "unnaturalOffense", "UNNATURAL OFFENSE"]));
  const sexualAbuse       = num(pick(row, ["Sexual Abuse", "sexual_abuse", "sexualAbuse", "SEXUAL ABUSE"]));

  const sumOfParts =
    rapeCases + homicide + attemptedHomicide + abduction +
    kidnapping + arson + theftOver50k + grievousHurt +
    hurtByKnife + robbery + extortion + unnaturalOffense + sexualAbuse;

  const explicitTotal = num(pick(row, ["Total", "total", "TOTAL", "Total Crimes", "total_crimes"]));
  const total = explicitTotal > 0 ? explicitTotal : sumOfParts;

  return {
    year:         num(pick(row, ["Year", "year", "YEAR"])),
    districtName: String(pick(row, ["District", "district", "District Name", "district_name", "districtName", "DISTRICT"]) ?? ""),
    total,
    rapeCases, homicide, attemptedHomicide, abduction,
    kidnapping, arson, theftOver50k, grievousHurt,
    hurtByKnife, robbery, extortion, unnaturalOffense, sexualAbuse,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crimeRouter = (trpc as any).crime;
  const {
    data: apiSummary,
    isLoading: summaryLoading,
  }: { data: DashboardSummary | undefined; isLoading: boolean } =
    crimeRouter.getDashboardSummary.useQuery();

  const [allStats, setAllStats]         = useState<StatItem[]>([]);
  const [excelLoading, setExcelLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("2023");
  const [selectedCrimeType, setSelectedCrimeType] = useState<string>("Robbery");

  // ── Load Excel ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadExcel = async () => {
      try {
        const res = await fetch("/crime_data.xlsx");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const buffer   = await res.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any[] = XLSX.utils.sheet_to_json(sheet);

        if (data.length > 0) {
          console.log("[Dashboard] Column names:", Object.keys(data[0]));
          console.log("[Dashboard] First row raw:", data[0]);
        }

        const formatted = data.map((row) => ({ crime_statistics: parseRow(row) }));

        console.log("[Dashboard] Rows parsed:", formatted.length);
        if (formatted.length > 0) {
          console.log("[Dashboard] First row parsed:", formatted[0].crime_statistics);
        }

        setAllStats(formatted);
      } catch (err) {
        console.error("[Dashboard] Excel error:", err);
      } finally {
        setExcelLoading(false);
      }
    };
    loadExcel();
  }, []);

  // ── localSummary derived from Excel data ────────────────────────────────────
  const localSummary = useMemo<DashboardSummary | null>(() => {
    if (!allStats.length) return null;

    const districtNames = Array.from(
      new Set(
        allStats
          .map((i) => i.crime_statistics.districtName)
          .filter((d): d is string => Boolean(d))
      )
    );

    const totalDistricts = districtNames.length || apiSummary?.totalDistricts || 25;
    const totalCrimes    = allStats.reduce((s, i) => s + i.crime_statistics.total, 0);
    const avgPerDistrict = totalDistricts > 0 ? Math.round(totalCrimes / totalDistricts) : 0;

    let highRiskDistricts: HighRiskDistrict[] = [];

    if (districtNames.length > 0) {
      const districtTotals = districtNames.map((name) => {
        const rows = allStats.filter((i) => i.crime_statistics.districtName === name);
        const total = rows.reduce((s, r) => s + r.crime_statistics.total, 0);

        const sortedYears = Array.from(
          new Set(rows.map((r) => r.crime_statistics.year))
        ).sort((a, b) => a - b) as number[];

        const lastTwo = sortedYears.slice(-2);
        const prev = rows.filter((r) => r.crime_statistics.year === lastTwo[0]).reduce((s, r) => s + r.crime_statistics.total, 0);
        const last = rows.filter((r) => r.crime_statistics.year === lastTwo[1]).reduce((s, r) => s + r.crime_statistics.total, 0);
        const yoy  = prev > 0 ? Math.round(((last - prev) / prev) * 1000) / 10 : 0;

        return {
          name,
          total,
          yoy,
          trend:      yoy > 2 ? "increasing" : yoy < -2 ? "decreasing" : "stable",
          risk:       getRiskLevel(total, avgPerDistrict),
          avgPerYear: Math.round(total / (sortedYears.length || 1)),
        };
      });

      highRiskDistricts = districtTotals
        .filter((d) => d.risk === "high" || d.risk === "critical")
        .sort((a, b) => b.total - a.total)
        .map((d, idx) => ({
          district: { id: idx, name: d.name },
          summary: {
            totalCrimes:        d.total,
            averagePerYear:     d.avgPerYear,
            trend:              d.trend,
            riskLevel:          d.risk,
            yearOverYearChange: d.yoy,
          },
        }));
    } else {
      highRiskDistricts = apiSummary?.highRiskDistricts ?? [];
    }

    return {
      totalDistricts,
      totalCrimes,
      averageCrimesPerDistrict: avgPerDistrict,
      highRiskCount: highRiskDistricts.length,
      highRiskDistricts,
    };
  }, [allStats, apiSummary]);

  const summary = localSummary ?? apiSummary;

  // ── Chart data (memoised) ───────────────────────────────────────────────────

  const yearData = useMemo(() =>
    YEARS.map((year) => {
      const yr    = parseInt(year, 10);
      const rows  = allStats.filter((i) => i.crime_statistics.year === yr);
      const total = rows.reduce((s, i) => s + i.crime_statistics.total, 0);
      return { year, total, average: rows.length > 0 ? Math.round(total / rows.length) : 0 };
    }),
    [allStats]
  );

  const crimeTypeData = useMemo(() => {
    const yr   = parseInt(selectedYear, 10);
    const rows = allStats.filter((i) => i.crime_statistics.year === yr);
    return CRIME_TYPES
      .map((type) => ({
        name:  type,
        value: rows.reduce((s, i) => s + getCrimeCount(i.crime_statistics, type), 0),
      }))
      .filter((d) => d.value > 0);
  }, [allStats, selectedYear]);

  const trendData = useMemo(() =>
    YEARS.map((year) => {
      const yr   = parseInt(year, 10);
      const rows = allStats.filter((i) => i.crime_statistics.year === yr);
      return {
        year,
        count: rows.reduce((s, i) => s + getCrimeCount(i.crime_statistics, selectedCrimeType), 0),
      };
    }),
    [allStats, selectedCrimeType]
  );

  // ── Export helpers ──────────────────────────────────────────────────────────

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    if (!summary?.highRiskDistricts?.length) return;
    let csv = "District,Total Crimes,Average per Year,Trend,Risk Level,YoY Change\n";
    summary.highRiskDistricts.forEach((item: HighRiskDistrict) => {
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

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (excelLoading && summaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <style>{`
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
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
            <Button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2" size="lg">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" size="lg">
              <Printer className="w-4 h-4" /> Print Report
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
              <div className="text-3xl font-bold text-gray-900">{summary?.totalDistricts ?? 0}</div>
              <p className="text-xs text-gray-500 mt-1">Monitored districts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Crimes (3 Years)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary?.totalCrimes?.toLocaleString() ?? 0}</div>
              <p className="text-xs text-gray-500 mt-1">All crime types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Average per District</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary?.averageCrimesPerDistrict?.toLocaleString() ?? 0}</div>
              <p className="text-xs text-gray-500 mt-1">Per district total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">High-Risk Districts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{summary?.highRiskCount ?? 0}</div>
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

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Line Chart — Year-over-year trend */}
          <Card>
            <CardHeader>
              <CardTitle>Crime Trend (2021–2023)</CardTitle>
              <CardDescription>Total crimes by year across all districts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={yearData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Legend />
                  <Line type="monotone" dataKey="total"   stroke="#3b82f6" strokeWidth={2} name="Total Crimes"         dot={{ r: 5 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="average" stroke="#8b5cf6" strokeWidth={2} name="Average per District" dot={{ r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart — Crime type distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Crime Type Distribution</CardTitle>
              <CardDescription>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32 h-8 text-xs mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {crimeTypeData.length === 0 ? (
                <div className="flex items-center justify-center h-[350px] text-gray-400 text-sm">
                  No data for {selectedYear}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={crimeTypeData}
                      cx="35%" cy="50%"
                      labelLine
                      label={({ percent }: { percent: number }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {crimeTypeData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                    <Legend
                      layout="vertical" align="right" verticalAlign="middle"
                      wrapperStyle={{ paddingLeft: "10px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart — Crime trend analysis */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Crime Trend Analysis</CardTitle>
            <CardDescription>
              <div className="flex gap-4 mt-2">
                <Select value={selectedCrimeType} onValueChange={setSelectedCrimeType}>
                  <SelectTrigger className="w-52 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRIME_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
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
                <YAxis tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Bar dataKey="count" fill="#3b82f6" name={selectedCrimeType} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* High-Risk Districts Table */}
        {summary?.highRiskDistricts && summary.highRiskDistricts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>High-Risk Districts</CardTitle>
              <CardDescription>Districts with critical or high crime risk levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">District</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Total Crimes</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Avg / Year</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Trend</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Risk Level</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">YoY Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.highRiskDistricts.map((item: HighRiskDistrict) => (
                      <tr key={item.district.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium">{item.district.name}</td>
                        <td className="py-3 px-4">{item.summary.totalCrimes.toLocaleString()}</td>
                        <td className="py-3 px-4">{item.summary.averagePerYear.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {item.summary.trend === "increasing" ? (
                              <TrendingUp className="w-4 h-4 text-red-600" />
                            ) : item.summary.trend === "decreasing" ? (
                              <TrendingDown className="w-4 h-4 text-green-600" />
                            ) : (
                              <span className="text-gray-400 font-bold">→</span>
                            )}
                            <span className="capitalize">{item.summary.trend}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-1 rounded text-white text-xs font-semibold"
                            style={{ backgroundColor: RISK_COLORS[item.summary.riskLevel] ?? "#6b7280" }}
                          >
                            {item.summary.riskLevel.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={item.summary.yearOverYearChange > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                            {item.summary.yearOverYearChange > 0 ? "+" : ""}
                            {item.summary.yearOverYearChange.toFixed(1)}%
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