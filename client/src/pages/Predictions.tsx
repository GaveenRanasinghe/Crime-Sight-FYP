import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { Target, Database, AlertTriangle, TrendingUp, Crosshair, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface District {
  id: number;
  name: string;
}

interface CrimeStat {
  year: number;
  rapeCases: number;
  homicide: number;
  attemptedHomicide: number;
  abduction: number;
  kidnapping: number;
  arson: number;
  theftOver50k: number;
  grievousHurt: number;
  hurtByKnife: number;
  robbery: number;
  extortion: number;
  unnaturalOffense: number;
  sexualAbuse: number;
}

interface StatRow {
  district: District | null;
  stat: CrimeStat;
}

interface Prediction {
  crimeType: string;
  predictedYear: number;
  predictedValue: number;
  confidence: number;
  modelType?: string;
}

interface ChartPoint {
  year: string;
  actual: number | null;
  predicted: number | null;
}

type CrimeKey = keyof Omit<CrimeStat, "year">;
type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface RiskMeta {
  color: string;
  bg: string;
  border: string;
  icon: string;
}

interface TooltipPayloadItem {
  color: string;
  name: string;
  value: number | string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}

interface AnimatedNumberProps {
  target: number;
  duration?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CRIME_LABELS: Record<CrimeKey, string> = {
  rapeCases:         "Rape Cases",
  homicide:          "Homicide",
  attemptedHomicide: "Attempted Homicide",
  abduction:         "Abduction",
  kidnapping:        "Kidnapping",
  arson:             "Arson",
  theftOver50k:      "Theft over Rs. 50,000",
  grievousHurt:      "Grievous Hurt",
  hurtByKnife:       "Hurt by Knife",
  robbery:           "Robbery",
  extortion:         "Extortion",
  unnaturalOffense:  "Unnatural Offense",
  sexualAbuse:       "Sexual Abuse",
};

const CRIME_KEYS = Object.keys(CRIME_LABELS) as CrimeKey[];

interface Thresholds { critical: number; high: number; medium: number; }

const RISK_THRESHOLDS: Record<CrimeKey, Thresholds> = {
  robbery:           { critical: 1200, high: 600,  medium: 200 },
  theftOver50k:      { critical: 2500, high: 1200, medium: 500 },
  hurtByKnife:       { critical: 300,  high: 180,  medium: 80  },
  grievousHurt:      { critical: 200,  high: 100,  medium: 40  },
  abduction:         { critical: 120,  high: 60,   medium: 20  },
  kidnapping:        { critical: 150,  high: 80,   medium: 30  },
  rapeCases:         { critical: 130,  high: 70,   medium: 30  },
  homicide:          { critical: 80,   high: 40,   medium: 15  },
  attemptedHomicide: { critical: 25,   high: 12,   medium: 5   },
  arson:             { critical: 40,   high: 20,   medium: 8   },
  extortion:         { critical: 40,   high: 20,   medium: 8   },
  unnaturalOffense:  { critical: 90,   high: 40,   medium: 15  },
  sexualAbuse:       { critical: 130,  high: 60,   medium: 20  },
};

const RISK_META: Record<RiskLevel, RiskMeta> = {
  CRITICAL: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.3)",  icon: "🔴" },
  HIGH:     { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.3)", icon: "🟠" },
  MEDIUM:   { color: "#eab308", bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.3)",  icon: "🟡" },
  LOW:      { color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.3)",  icon: "🟢" },
};

// ─── Embedded prediction data (all 25 districts, hybrid RF+XGBoost) ─────────
const EMBEDDED_PREDICTIONS: Record<number, Prediction[]> = {
  1: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 134, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 35, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 24, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 40, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 219, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 85, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 339, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 173, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 133, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 1467, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 137, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 2845, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 33, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  2: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 123, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 39, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 16, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 37, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 130, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 77, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 294, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 158, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 143, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 1258, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 34, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 2999, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 20, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  3: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 70, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 23, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 5, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 9, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 66, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 36, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 227, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 102, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 114, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 412, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 15, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 1234, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 12, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  4: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 61, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 40, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 3, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 1, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 61, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 25, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 249, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 80, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 72, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 270, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 37, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 2207, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 31, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  5: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 39, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 14, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 8, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 72, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 9, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 96, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 23, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 14, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 152, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 21, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 493, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 22, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  6: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 41, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 13, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 19, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 105, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 12, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 88, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 28, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 49, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 123, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 281, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 3, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  7: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 70, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 30, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 17, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 106, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 28, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 77, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 67, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 127, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 418, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 56, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 664, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 36, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  8: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 51, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 30, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 16, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 10, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 24, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 30, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 95, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 60, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 103, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 222, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 20, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 561, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 20, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  9: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 55, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 16, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 13, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 3, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 55, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 18, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 73, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 40, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 106, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 202, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 10, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 522, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 18, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  10: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 76, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 19, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 123, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 514, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 32, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 166, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 75, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 114, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 347, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 15, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 1638, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 15, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  11: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 81, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 46, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 19, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 11, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 78, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 54, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 166, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 106, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 173, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 299, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 67, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 872, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 60, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  12: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 38, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 21, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 11, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 54, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 21, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 90, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 48, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 41, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 241, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 29, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 355, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 29, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  13: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 41, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 17, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 1, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 79, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 9, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 26, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 33, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 44, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 115, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 5, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 312, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 10, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  14: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 24, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 15, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 11, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 5, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 93, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 15, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 82, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 24, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 27, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 77, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 6, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 214, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 5, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  15: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 24, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 30, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 2, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 60, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 18, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 95, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 17, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 60, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 61, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 237, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 2, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  16: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 30, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 30, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 10, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 2, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 65, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 13, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 51, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 28, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 118, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 290, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 35, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 247, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  17: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 39, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 24, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 7, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 2, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 54, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 6, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 107, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 39, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 82, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 110, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 14, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 371, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 18, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  18: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 99, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 43, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 20, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 12, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 63, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 28, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 160, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 96, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 187, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 586, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 62, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 816, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 64, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  19: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 54, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 26, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 11, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 64, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 7, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 109, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 56, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 119, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 152, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 50, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 612, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 32, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  20: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 64, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 32, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 17, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 179, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 94, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 29, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 87, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 71, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 163, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 225, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 69, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 523, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 38, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  21: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 56, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 23, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 4, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 69, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 51, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 18, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 97, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 56, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 101, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 155, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 34, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 427, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 30, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  22: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 52, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 20, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 7, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 5, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 89, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 28, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 96, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 40, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 80, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 131, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 25, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 390, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 23, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  23: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 64, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 27, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 3, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 1, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 56, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 32, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 104, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 40, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 104, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 187, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 56, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 545, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 16, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  24: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 51, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 26, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 12, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 5, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 87, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 42, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 185, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 94, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 135, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 267, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 63, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 823, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 97, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
  25: [
    { crimeType: 'abduction', predictedYear: 2026, predictedValue: 23, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'arson', predictedYear: 2026, predictedValue: 21, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'attemptedHomicide', predictedYear: 2026, predictedValue: 6, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'extortion', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'grievousHurt', predictedYear: 2026, predictedValue: 30, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'homicide', predictedYear: 2026, predictedValue: 17, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'hurtByKnife', predictedYear: 2026, predictedValue: 273, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'kidnapping', predictedYear: 2026, predictedValue: 91, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'rapeCases', predictedYear: 2026, predictedValue: 118, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'robbery', predictedYear: 2026, predictedValue: 76, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'sexualAbuse', predictedYear: 2026, predictedValue: 7, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'theftOver50k', predictedYear: 2026, predictedValue: 331, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
    { crimeType: 'unnaturalOffense', predictedYear: 2026, predictedValue: 0, confidence: -0.0513, modelType: 'hybrid_rf_xgb' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRiskLevel(crimeKey: CrimeKey, value: number): RiskLevel {
  const t = RISK_THRESHOLDS[crimeKey];
  if (value >= t.critical) return "CRITICAL";
  if (value >= t.high)     return "HIGH";
  if (value >= t.medium)   return "MEDIUM";
  return "LOW";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SentinelTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0d1117",
      border: "1px solid rgba(255,122,24,0.3)",
      padding: "0.7rem 1rem",
      fontFamily: "'Space Mono',monospace",
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    }}>
      <div style={{ fontSize: "0.52rem", color: "#ff7a18", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: "0.62rem", color: "#cdd9e5", letterSpacing: "0.04em", marginBottom: "0.2rem" }}>
          <span style={{ color: p.color, marginRight: "0.4rem" }}>■</span>
          {p.name}:{" "}
          <strong style={{ color: "#fff" }}>
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </strong>
        </div>
      ))}
    </div>
  );
};

function AnimatedNumber({ target, duration = 1200 }: AnimatedNumberProps) {
  const [val, setVal] = useState<number>(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      setVal(Math.round(prog * target));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <span>{val.toLocaleString()}</span>;
}

const PredictedDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.predicted === null || payload.predicted === undefined) return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={payload.year === "2026" ? 7 : 4}
      fill="#38bdf8"
      stroke="#060810"
      strokeWidth={2}
    />
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Predictions() {
  const [districts, setDistricts]       = useState<District[]>([]);
  const [allStats, setAllStats]         = useState<StatRow[]>([]);
  const [selectedDistrict, setDistrict] = useState<string>("");
  const [selectedCrime, setCrime]       = useState<CrimeKey>("robbery");
  const [predictions, setPredictions]   = useState<Prediction[]>([]);
  const [isAnalyzing, setIsAnalyzing]   = useState<boolean>(false);
  const [analyzed, setAnalyzed]         = useState<boolean>(false);
  const [isDistrictOpen, setDistrictOpen] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const { data: distData } = await supabase
        .from("districts")
        .select("id, name")
        .order("name", { ascending: true });
      if (distData) setDistricts(distData as District[]);

      const { data: statsData } = await supabase
        .from("crimeStatistics")
        .select(`
          id, districtId, year,
          rapeCases, homicide, attemptedHomicide, abduction, kidnapping,
          arson, theftOver50k, grievousHurt, hurtByKnife,
          robbery, extortion, unnaturalOffense, sexualAbuse,
          districts(id, name)
        `)
        .order("year", { ascending: true });

      if (statsData) {
        const formatted: StatRow[] = (statsData as any[]).map((row) => ({
          district: Array.isArray(row.districts) ? row.districts[0] : row.districts,
          stat: {
            year:              row.year,
            rapeCases:         row.rapeCases         ?? 0,
            homicide:          row.homicide          ?? 0,
            attemptedHomicide: row.attemptedHomicide ?? 0,
            abduction:         row.abduction         ?? 0,
            kidnapping:        row.kidnapping        ?? 0,
            arson:             row.arson             ?? 0,
            theftOver50k:      row.theftOver50k      ?? 0,
            grievousHurt:      row.grievousHurt      ?? 0,
            hurtByKnife:       row.hurtByKnife       ?? 0,
            robbery:           row.robbery           ?? 0,
            extortion:         row.extortion         ?? 0,
            unnaturalOffense:  row.unnaturalOffense  ?? 0,
            sexualAbuse:       row.sexualAbuse        ?? 0,
          },
        }));
        setAllStats(formatted);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedDistrict) return;
    const distId = parseInt(selectedDistrict);
    const preds = EMBEDDED_PREDICTIONS[distId] ?? [];
    setPredictions(preds);
  }, [selectedDistrict]);

  const generatePredictions = (trpc as any).crime.generatePredictions.useMutation();

  const handleAnalyze = () => {
    if (!selectedDistrict) return;
    setIsAnalyzing(true);
    setAnalyzed(false);
    generatePredictions.mutate({}, {
      onSettled: () => {
        setTimeout(() => {
          setIsAnalyzing(false);
          setAnalyzed(true);
        }, 1200);
      },
    });
  };

  const chartData: ChartPoint[] = (() => {
    if (!selectedDistrict) return [];
    const distId = parseInt(selectedDistrict);

    const historicalSorted = allStats
      .filter((r) => r.district?.id === distId)
      .map((r) => ({ year: r.stat.year, actual: r.stat[selectedCrime] ?? 0 }))
      .sort((a, b) => a.year - b.year);

    const predRow = predictions.find(
      (p) => p.crimeType?.toLowerCase().replace(/\s/g, "") === selectedCrime.toLowerCase()
    );

    const points: ChartPoint[] = historicalSorted.map((h, i) => ({
      year:      String(h.year),
      actual:    h.actual,
      predicted: (i === historicalSorted.length - 1 && predRow != null) ? h.actual : null,
    }));

    const pred2026Value = predRow?.predictedValue ?? null;
    points.push({
      year:      "2026",
      actual:    null,
      predicted: pred2026Value,
    });

    return points;
  })();

  const selectedCrimePred = predictions.find(
    (p) => p.crimeType?.toLowerCase().replace(/\s/g, "") === selectedCrime.toLowerCase()
  );
  const predValue = selectedCrimePred?.predictedValue ?? 0;
  const riskLevel = getRiskLevel(selectedCrime, predValue);
  const riskMeta  = RISK_META[riskLevel];
  const distName  = districts.find((d) => d.id === parseInt(selectedDistrict))?.name ?? "";
  const totalPred = predictions.reduce((s, p) => s + (p.predictedValue ?? 0), 0);

  const axisStyle = { fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", fill: "#455060" };
  const gridStyle = { stroke: "rgba(255,122,24,0.05)", strokeDasharray: "4 4" };

  const sortedPredictions = [...predictions].sort((a, b) => (b.predictedValue ?? 0) - (a.predictedValue ?? 0));
  const topThree = sortedPredictions.slice(0, 3);
  const selectedContribution = totalPred > 0 ? Math.round((predValue / totalPred) * 100) : 0;
  const selectedRank = Math.max(1, sortedPredictions.findIndex((p) => p.crimeType === selectedCrime) + 1);
  const historicalLatest = chartData.filter((p) => p.actual !== null).at(-1)?.actual ?? 0;
  const changePercent = historicalLatest > 0 ? Math.round(((predValue - historicalLatest) / historicalLatest) * 100) : 0;
  const chartBars = chartData.map((p) => ({
    ...p,
    bar: p.predicted ?? p.actual ?? 0,
    type: p.predicted !== null ? "Forecast" : "Observed",
  }));
  const maxBar = Math.max(...chartBars.map((p) => p.bar), 1);

  return (
    <div className="sentinel-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');
        :root { --accent:#ff7a18; --accent-2:#ff7a18; --bg:#0b0b0c; --panel:#161616; --panel-2:#1f1f1f; --muted:#8b8b8b; --line:rgba(255,255,255,.08); --green:#00f0a0; --yellow:#f8d66d; }
        .sentinel-page { min-height:100vh; background:#0a0a0b; color:#fff; font-family:'Inter',sans-serif; overflow:hidden; }
        .sentinel-page * { box-sizing:border-box; }
        .bebas { font-family:'Bebas Neue',sans-serif; }
        .mono { font-family:'Space Mono',monospace; }
        .sentinel-side { background:#181818; border-right:1px solid var(--line); min-height:100vh; display:flex; flex-direction:column; padding:22px 16px; }
        .brand { font-size:1.75rem; font-weight:800; letter-spacing:-.06em; margin-bottom:28px; }
        .suite { display:flex; align-items:center; gap:14px; padding:12px 14px; margin-bottom:28px; }
        .suite-icon { width:38px; height:38px; background:var(--accent); color:#111; display:grid; place-items:center; border-radius:4px; }
        .suite-title { font-family:'Space Mono',monospace; font-size:.78rem; font-weight:700; letter-spacing:.18em; }
        .suite-sub { font-size:.62rem; color:#777; margin-top:2px; text-transform:uppercase; }
        .side-nav { display:flex; flex-direction:column; gap:8px; }
        .side-item { display:flex; align-items:center; gap:14px; padding:14px 16px; color:#8b8b8b; font-size:.85rem; border-left:3px solid transparent; }
        .side-item.active { color:#ffb46b; background:rgba(255,122,24,.12); border-left-color:var(--accent); }
        .side-spacer { flex:1; }
        .report-btn { width:100%; border:0; background:#2a2a2a; color:#ffb46b; padding:14px; border-radius:7px; font-family:'Space Mono',monospace; font-weight:700; letter-spacing:.14em; font-size:.7rem; text-transform:uppercase; }
        .side-foot { color:#777; font-size:.75rem; display:flex; flex-direction:column; gap:16px; margin-top:28px; }
        .main { min-width:0; background:radial-gradient(circle at 35% 0%, rgba(255,122,24,.04), transparent 36%), #0b0b0c; }
        .topbar { height:64px; background:#151515; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; padding:0 28px; }
        .top-tabs { display:flex; align-items:center; gap:30px; height:100%; }
        .top-tab { height:100%; display:flex; align-items:center; color:#8f8f8f; font-family:'Space Mono',monospace; font-size:.75rem; letter-spacing:.14em; text-transform:uppercase; border-bottom:2px solid transparent; }
        .top-tab.active { color:#ffb46b; border-bottom-color:var(--accent); }
        .query { width:270px; height:32px; background:#242424; border:1px solid var(--line); color:#777; border-radius:3px; display:flex; align-items:center; padding:0 12px; gap:9px; font-size:.72rem; }
        .emergency { background:var(--accent); color:#111; border:0; height:36px; padding:0 18px; border-radius:3px; font-weight:800; font-size:.7rem; text-transform:uppercase; }
        .content { padding:28px 52px 48px; width:100%; }
        .hero-grid { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:24px; align-items:start; }
        .eyebrow { font-family:'Space Mono',monospace; color:#bfbfbf; letter-spacing:.32em; text-transform:uppercase; font-size:.78rem; margin-top:6px; }
        .title { font-family:'Bebas Neue',sans-serif; font-size:clamp(3rem, 5.2vw, 5rem); line-height:.92; margin:28px 0 8px; letter-spacing:-.02em; }
        .title span { color:var(--accent); }
        .subtitle { font-family:'Space Mono',monospace; letter-spacing:.3em; text-transform:uppercase; color:#b9b9b9; font-size:.78rem; }
        .district-card,.panel,.impact-card { background:#171717; border:1px solid var(--line); border-radius:8px; }
        .district-card { padding:22px; }
        .card-label { font-family:'Space Mono',monospace; color:#777; font-size:.68rem; letter-spacing:.14em; text-transform:uppercase; margin-bottom:10px; }
        .district-select { width:100%; background:transparent; color:#fff; border:0; border-bottom:1px solid rgba(255,122,24,.45); padding:8px 0 12px; font-family:'Bebas Neue',sans-serif; font-size:1.65rem; outline:none; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23ff7a18' stroke-width='2' fill='none'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 18px; }
        .district-select option { background:#171717; color:#fff; font-family:Inter,sans-serif; }
        .custom-select { position:relative; width:100%; }
        .custom-select-trigger { width:100%; background:transparent; color:#fff; border:0; border-bottom:1px solid rgba(255,122,24,.45); padding:8px 34px 14px 0; font-family:'Bebas Neue',sans-serif; font-size:1.65rem; line-height:1; text-align:left; outline:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
        .custom-select-trigger .chev { color:var(--accent); font-size:1.2rem; transform:translateY(-2px); transition:.15s; }
        .custom-select.open .chev { transform:rotate(180deg) translateY(2px); }
        .custom-options { position:absolute; top:calc(100% + 8px); left:0; right:0; z-index:50; max-height:330px; overflow-y:auto; background:#f4f4f4; color:#151515; border-radius:8px; padding:8px; box-shadow:0 18px 45px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.14); }
        .custom-options::-webkit-scrollbar { width:8px; }
        .custom-options::-webkit-scrollbar-track { background:#e7e7e7; border-radius:10px; }
        .custom-options::-webkit-scrollbar-thumb { background:#9b9b9b; border-radius:10px; }
        .custom-option { width:100%; border:0; background:transparent; color:#232323; display:flex; align-items:center; justify-content:space-between; padding:9px 10px; border-radius:7px; font-family:'Inter',sans-serif; font-size:.95rem; text-align:left; cursor:pointer; }
        .custom-option:hover { background:#e8e8e8; }
        .custom-option.active { background:#e8e8e8; }
        .custom-check { color:#404040; font-size:1rem; font-weight:800; }
        .status-row { display:flex; gap:8px; margin-top:14px; flex-wrap:wrap; }
        .tag { font-family:'Space Mono',monospace; font-size:.62rem; font-weight:700; padding:6px 9px; border-radius:2px; text-transform:uppercase; }
        .tag.green { color:var(--green); border:1px solid rgba(0,240,160,.35); background:rgba(0,240,160,.08); }
        .tag.yellow { color:var(--yellow); border:1px solid rgba(248,214,109,.35); background:rgba(248,214,109,.08); }
        .tag.red { color:#ff8a2a; border:1px solid rgba(255,122,24,.35); background:rgba(255,122,24,.08); }
        .dashboard { margin-top:42px; display:grid; grid-template-columns:1.3fr .9fr; gap:24px; }
        .panel { padding:28px; position:relative; overflow:hidden; }
        .panel.glow { background:linear-gradient(135deg, rgba(255,122,24,.12), rgba(23,23,23,1) 45%); }
        .warning { color:#ff8a2a; font-family:'Space Mono',monospace; font-weight:700; letter-spacing:.14em; font-size:.78rem; text-transform:uppercase; display:flex; align-items:center; gap:10px; }
        .metric-label { color:#bbb; font-family:'Space Mono',monospace; letter-spacing:.18em; text-transform:uppercase; margin-top:28px; }
        .big-percent { font-family:'Bebas Neue',sans-serif; font-size:6.2rem; line-height:.95; letter-spacing:-.03em; margin-top:12px; }
        .metric-caption { color:#ffb46b; font-family:'Bebas Neue',sans-serif; font-size:1.15rem; display:inline-flex; align-items:center; gap:10px; margin-left:10px; }
        .mini-stats { border-top:1px solid var(--line); margin-top:28px; padding-top:22px; display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
        .mini-title { color:#777; font-size:.62rem; text-transform:uppercase; }
        .mini-val { font-weight:800; font-size:1.35rem; margin-top:6px; }
        .mini-val.green { color:var(--green); }
        .right-stack { display:flex; flex-direction:column; gap:20px; }
        .map-box { height:180px; background:#030303; border-radius:8px 8px 0 0; border-bottom:1px solid var(--line); position:relative; overflow:hidden; }
        .map-lines { position:absolute; inset:0; background:linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px); background-size:18px 18px; transform:perspective(250px) rotateX(54deg) translateY(-50px); opacity:.5; }
        .critical-label { position:absolute; top:18px; left:18px; background:#161616; color:#aaa; border-radius:20px; padding:6px 12px; font-family:'Space Mono',monospace; font-size:.62rem; letter-spacing:.12em; }
        .deploy { padding:24px; }
        .deploy-title { font-family:'Bebas Neue',sans-serif; font-size:1.35rem; letter-spacing:.06em; margin-bottom:16px; }
        .crime-selector { display:flex; gap:8px; flex-wrap:wrap; margin-top:20px; }
        .crime-pill { background:#202020; border:1px solid var(--line); color:#aaa; padding:7px 10px; border-radius:3px; font-family:'Space Mono',monospace; font-size:.58rem; text-transform:uppercase; cursor:pointer; transition:.15s; }
        .crime-pill.active { background:rgba(255,122,24,.16); color:#ffb46b; border-color:rgba(255,122,24,.45); }
        .impact-grid { margin-top:24px; display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .impact-card { padding:22px; min-height:190px; cursor:pointer; transition:.15s; }
        .impact-card:hover { transform:translateY(-2px); border-color:rgba(255,122,24,.35); }
        .impact-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; }
        .icon-box { width:36px; height:36px; background:#252525; display:grid; place-items:center; }
        .impact-title { font-family:'Bebas Neue',sans-serif; font-size:1.35rem; }
        .impact-desc { color:#8d8d8d; font-size:.78rem; line-height:1.45; min-height:46px; }
        .impact-value { font-family:'Bebas Neue',sans-serif; font-size:2rem; margin-top:16px; }
        .chart-panel { margin-top:24px; }
        .bars { height:250px; display:flex; align-items:end; gap:4px; padding:20px 0 0; }
        .bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:end; height:100%; }
        .bar { width:100%; max-width:145px; background:rgba(255,122,24,.35); border-top:2px solid rgba(255,122,24,.7); min-height:8px; position:relative; }
        .bar.forecast { background:rgba(255,122,24,.55); box-shadow:0 0 24px rgba(255,122,24,.12); }
        .bar-label { color:#666; font-size:.68rem; margin-top:10px; }
        .bar-label.forecast { color:#ffb46b; font-weight:700; }
        .insights { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:24px; }
        .insight { background:#262626; border-left:4px solid var(--accent); padding:14px 16px; font-size:.82rem; line-height:1.45; }
        .insight.green { border-left-color:var(--green); }
        .waiting { min-height:500px; display:grid; place-items:center; text-align:center; }
        .waiting-ring { width:86px; height:86px; border:1px solid rgba(255,122,24,.25); display:grid; place-items:center; margin:0 auto 22px; position:relative; }
        .waiting-ring:before { content:''; position:absolute; inset:-8px; border:1px solid rgba(255,122,24,.08); }
        @media (max-width:1100px){ .content{padding:34px 22px}.hero-grid,.dashboard,.impact-grid,.insights{grid-template-columns:1fr}.mini-stats{grid-template-columns:1fr 1fr}.big-percent{font-size:4.8rem} }
      `}</style>

      <main className="main">
        <section className="content">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">— PREDICTIVE ANALYTICS ENGINE — HYBRID RF+XGBOOST</div>
              <h1 className="title">CRIME CLASSIFICATION &<br/><span>PREDICTION 2026</span></h1>
              <div className="subtitle">Strategic Forecasting • Sri Lanka District Model</div>
            </div>
            <div className="district-card">
              <div className="card-label">District Selection</div>
              <div className={`custom-select ${isDistrictOpen ? "open" : ""}`}>
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setDistrictOpen((open) => !open)}
                >
                  <span>{distName ? distName.toUpperCase() : "SELECT DISTRICT"}</span>
                  <span className="chev">⌄</span>
                </button>

                {isDistrictOpen && (
                  <div className="custom-options">
                    <button
                      type="button"
                      className={`custom-option ${!selectedDistrict ? "active" : ""}`}
                      onClick={() => {
                        setDistrict("");
                        setAnalyzed(false);
                        setDistrictOpen(false);
                      }}
                    >
                      <span>SELECT DISTRICT</span>
                      {!selectedDistrict && <span className="custom-check">✓</span>}
                    </button>
                    {districts.map((d) => {
                      const value = String(d.id);
                      const active = selectedDistrict === value;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          className={`custom-option ${active ? "active" : ""}`}
                          onClick={() => {
                            setDistrict(value);
                            setAnalyzed(false);
                            setDistrictOpen(false);
                          }}
                        >
                          <span>{d.name}</span>
                          {active && <span className="custom-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="status-row"><span className="tag green">Operational</span><span className="tag yellow">Hybrid RF+XGBoost</span></div>
            </div>
          </div>

          {selectedDistrict ? (
            <>
              <div className="dashboard">
                <div className="panel glow">
                  <div className="warning"><span style={{ width:8, height:8, borderRadius:"50%", background:"var(--accent)" }} /> Forecast Variance Detected</div>
                  <div className="metric-label">Predicted Crime Contribution</div>
                  <div><span className="big-percent">+{selectedContribution}%</span><span className="metric-caption"><TrendingUp size={34}/> FORECAST SHARE</span></div>
                  <div className="mini-stats">
                    <div><div className="mini-title">Predicted Cases</div><div className="mini-val"><AnimatedNumber target={predValue}/></div></div>
                    <div><div className="mini-title">Total District Forecast</div><div className="mini-val">{totalPred.toLocaleString()}</div></div>
                    <div><div className="mini-title">Classification Rank</div><div className="mini-val green">#{selectedRank}</div></div>
                  </div>
                </div>

                <div className="right-stack">
                  <div className="panel" style={{ padding:0 }}>
                    <div className="map-box"><div className="map-lines"/><div className="critical-label">● CRITICAL CRIME ZONES</div></div>
                    <div className="deploy">
                      <div className="deploy-title">ACTIVE CLASSIFICATION</div>
                      <div className="card-label" style={{ marginBottom:8 }}>{distName} • {CRIME_LABELS[selectedCrime]}</div>
                      <div className="risk-badge" style={{ color:riskMeta.color, background:riskMeta.bg, borderColor:riskMeta.border }}>{riskLevel}</div>
                      <div className="crime-selector">
                        {CRIME_KEYS.map((key) => <button key={key} className={`crime-pill${selectedCrime === key ? " active" : ""}`} onClick={() => setCrime(key)}>{CRIME_LABELS[key].replace("over Rs. 50,000", "50k+").replace("by Knife", "Knife")}</button>)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="impact-grid">
                {topThree.map((p, i) => {
                  const key = p.crimeType as CrimeKey;
                  const val = p.predictedValue ?? 0;
                  const pct = totalPred > 0 ? Math.round((val / totalPred) * 100) : 0;
                  const risk = getRiskLevel(key, val);
                  return (
                    <div key={key} className="impact-card" onClick={() => setCrime(key)}>
                      <div className="impact-top"><div className="icon-box">{i === 0 ? <Database size={18}/> : i === 1 ? <AlertTriangle size={18}/> : <Crosshair size={18}/>}</div><span className={risk === "LOW" ? "tag green" : risk === "MEDIUM" ? "tag yellow" : "tag red"}>{risk} Impact</span></div>
                      <div className="impact-title">{CRIME_LABELS[key]}</div>
                      <div className="impact-desc">Highest model output cluster for {distName}. Click to inspect this crime category.</div>
                      <div className="impact-value">+{pct}% <span style={{ color:"#ffb46b", fontFamily:"Space Mono", fontSize:".6rem" }}>FORECAST CONTRIB.</span></div>
                    </div>
                  );
                })}
                <div className="impact-card" onClick={() => setCrime(selectedCrime)}>
                  <div className="impact-top"><div className="icon-box"><BarChart3 size={18}/></div><span className="tag red">Selected</span></div>
                  <div className="impact-title">{CRIME_LABELS[selectedCrime]}</div>
                  <div className="impact-desc">Current selected category for detailed prediction and trend comparison.</div>
                  <div className="impact-value">{predValue.toLocaleString()} <span style={{ color:"#ffb46b", fontFamily:"Space Mono", fontSize:".6rem" }}>CASES</span></div>
                </div>
              </div>

              <div className="panel chart-panel">
                <div style={{ display:"flex", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
                  <div><div className="impact-title">CRIME TREND PROJECTION 2021–2026</div><div className="card-label">Historical observations vs hybrid model forecast</div></div>
                  <div className="status-row"><span className="tag red">Forecast</span><span className="tag yellow">Incident Vol.</span></div>
                </div>
                <div className="bars">
                  {chartBars.map((p) => (
                    <div key={p.year} className="bar-wrap">
                      <div className={`bar ${p.type === "Forecast" ? "forecast" : ""}`} style={{ height:`${Math.max(12, (p.bar / maxBar) * 210)}px` }} title={`${p.year}: ${p.bar.toLocaleString()}`} />
                      <div className={`bar-label ${p.type === "Forecast" ? "forecast" : ""}`}>{p.year}</div>
                    </div>
                  ))}
                </div>
                <div className="insights">
                  <div className="insight"><strong style={{ color:"#ffb46b" }}>CRITICAL INSIGHT</strong><br/>The 2026 forecast for <b>{CRIME_LABELS[selectedCrime]}</b> in {distName} is {predValue.toLocaleString()} cases with {riskLevel.toLowerCase()} classification.</div>
                  <div className="insight green"><strong style={{ color:"var(--green)" }}>MODEL STATUS</strong><br/>Hybrid RF+XGBoost prediction is active. Change from latest historical value: <b>{changePercent >= 0 ? "+" : ""}{changePercent}%</b>.</div>
                </div>
              </div>
            </>
          ) : (
            <div className="panel waiting" style={{ marginTop:42 }}>
              <div>
                <div className="waiting-ring"><Target size={34} color="#ff7a18" /></div>
                <div className="impact-title">AWAITING DISTRICT SELECTION</div>
                <p style={{ color:"#777", maxWidth:420, lineHeight:1.7, fontFamily:"Space Mono", fontSize:".72rem" }}>Select a district to activate classification forecasting and view the 2026 prediction dashboard.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
