import { CrimeStatistic } from "../drizzle/schema";

/**
 * Calculate simple linear regression for time series prediction
 */
export function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number } {
  if (data.length < 2) {
    return { slope: 0, intercept: data[0]?.y || 0 };
  }

  const n = data.length;
  const sumX = data.reduce((sum, d) => sum + d.x, 0);
  const sumY = data.reduce((sum, d) => sum + d.y, 0);
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
  const sumX2 = data.reduce((sum, d) => sum + d.x * d.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Calculate R-squared (coefficient of determination)
 */
export function calculateRSquared(data: { x: number; y: number }[], slope: number, intercept: number): number {
  const yMean = data.reduce((sum, d) => sum + d.y, 0) / data.length;
  const ssTotal = data.reduce((sum, d) => sum + Math.pow(d.y - yMean, 2), 0);
  const ssResidual = data.reduce((sum, d) => sum + Math.pow(d.y - (slope * d.x + intercept), 2), 0);

  if (ssTotal === 0) return 0;
  return 1 - ssResidual / ssTotal;
}

/**
 * Predict future value using linear regression
 */
export function predictValue(x: number, slope: number, intercept: number): number {
  return Math.max(0, Math.round(slope * x + intercept));
}

/**
 * Calculate trend direction based on slope
 */
export function calculateTrend(slope: number): "increasing" | "decreasing" | "stable" {
  const threshold = 0.5; // Minimum slope change to consider trend
  if (slope > threshold) return "increasing";
  if (slope < -threshold) return "decreasing";
  return "stable";
}

/**
 * Determine risk level based on crime value and trend
 */
export function determineRiskLevel(value: number, slope: number, avgValue: number): "low" | "medium" | "high" | "critical" {
  const ratio = value / (avgValue || 1);
  const trend = calculateTrend(slope);

  // Critical: High value with increasing trend
  if (ratio > 1.5 && trend === "increasing") return "critical";
  
  // High: Significantly above average or increasing trend with moderate values
  if (ratio > 1.3 || (ratio > 0.9 && trend === "increasing")) return "high";
  
  // Medium: Slightly above average or stable with moderate values
  if (ratio > 0.8) return "medium";
  
  // Low: Below average
  return "low";
}

/**
 * Extract crime values from statistics record
 */
export function extractCrimeValues(stat: CrimeStatistic): Record<string, number> {
  return {
    "Rape Cases": stat.rapeCases || 0,
    "Homicide": stat.homicide || 0,
    "Attempted Homicide": stat.attemptedHomicide || 0,
    "Abduction": stat.abduction || 0,
    "Kidnapping": stat.kidnapping || 0,
    "Arson": stat.arson || 0,
    "Theft over Rs. 50,000": stat.theftOver50k || 0,
    "Grievous Hurt": stat.grievousHurt || 0,
    "Hurt by Knife": stat.hurtByKnife || 0,
    "Robbery": stat.robbery || 0,
    "Extortion": stat.extortion || 0,
    "Unnatural Offense": stat.unnaturalOffense || 0,
    "Sexual Abuse": stat.sexualAbuse || 0,
  };
}

/**
 * Generate predictions for a crime type across years
 */
export function generatePredictions(
  districtId: number,
  crimeType: string,
  historicalData: { year: number; value: number }[],
  predictYears: number[] = [2024, 2025]
): Array<{
  districtId: number;
  crimeType: string;
  predictedYear: number;
  predictedValue: number;
  confidence: number;
  trend: "increasing" | "decreasing" | "stable";
  riskLevel: "low" | "medium" | "high" | "critical";
}> {
  if (historicalData.length < 2) {
    return [];
  }

  // Prepare data for regression
  const regressionData = historicalData.map((d, idx) => ({
    x: idx,
    y: d.value,
  }));

  const { slope, intercept } = linearRegression(regressionData);
  const rSquared = calculateRSquared(regressionData, slope, intercept);
  const avgValue = historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length;
  const trend = calculateTrend(slope);

  // Generate predictions
  return predictYears.map((year, idx) => {
    const xValue = historicalData.length + idx;
    const predictedValue = predictValue(xValue, slope, intercept);
    const confidence = Math.min(100, Math.max(0, rSquared * 100));
    const riskLevel = determineRiskLevel(predictedValue, slope, avgValue);

    return {
      districtId,
      crimeType,
      predictedYear: year,
      predictedValue,
      confidence: parseFloat(confidence.toFixed(2)),
      trend,
      riskLevel,
    };
  });
}

/**
 * Calculate crime statistics summary for a district
 */
export function calculateDistrictSummary(stats: CrimeStatistic[]): {
  totalCrimes: number;
  averagePerYear: number;
  trend: "increasing" | "decreasing" | "stable";
  riskLevel: "low" | "medium" | "high" | "critical";
  yearOverYearChange: number;
} {
  if (stats.length === 0) {
    return {
      totalCrimes: 0,
      averagePerYear: 0,
      trend: "stable",
      riskLevel: "low",
      yearOverYearChange: 0,
    };
  }

  const totals = stats.map(s => s.total || 0);
  const totalCrimes = totals.reduce((sum, t) => sum + t, 0);
  const averagePerYear = totalCrimes / stats.length;

  // Calculate year-over-year change
  let yearOverYearChange = 0;
  if (stats.length >= 2) {
    const lastYear = totals[totals.length - 1];
    const prevYear = totals[totals.length - 2];
    yearOverYearChange = prevYear > 0 ? ((lastYear - prevYear) / prevYear) * 100 : 0;
  }

  // Determine trend
  const regressionData = totals.map((y, x) => ({ x, y }));
  const { slope } = linearRegression(regressionData);
  const trend = calculateTrend(slope);

  // Determine risk level
  const lastValue = totals[totals.length - 1];
  const riskLevel = determineRiskLevel(lastValue, slope, averagePerYear);

  return {
    totalCrimes,
    averagePerYear: Math.round(averagePerYear),
    trend,
    riskLevel,
    yearOverYearChange: parseFloat(yearOverYearChange.toFixed(2)),
  };
}

/**
 * Compare districts by crime metrics
 */
export function compareDistricts(
  districtStats: Array<{
    districtId: number;
    districtName: string;
    stats: CrimeStatistic[];
  }>
): Array<{
  districtId: number;
  districtName: string;
  totalCrimes: number;
  averagePerYear: number;
  trend: string;
  riskLevel: string;
}> {
  return districtStats.map(({ districtId, districtName, stats }) => {
    const summary = calculateDistrictSummary(stats);
    return {
      districtId,
      districtName,
      totalCrimes: summary.totalCrimes,
      averagePerYear: summary.averagePerYear,
      trend: summary.trend,
      riskLevel: summary.riskLevel,
    };
  });
}
