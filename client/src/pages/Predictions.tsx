import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Target } from "lucide-react";

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
      border: "1px solid rgba(255,107,74,0.3)",
      padding: "0.7rem 1rem",
      fontFamily: "'Space Mono',monospace",
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    }}>
      <div style={{ fontSize: "0.52rem", color: "#ff6b4a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
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
  const gridStyle = { stroke: "rgba(255,107,74,0.05)", strokeDasharray: "4 4" };

  return (
    <div style={{ minHeight: "100vh", background: "#060810", padding: "1.5rem 2rem", fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap');
        .pc { background:#0a0d14; border:1px solid rgba(255,107,74,0.1); position:relative; overflow:hidden; }
        .pc::before { content:''; position:absolute; top:0; left:0; right:0; height:1.5px;
          background:linear-gradient(90deg,#ff6b4a,rgba(255,107,74,0.2),transparent); }
        .pc-corner { position:absolute; top:0; right:0; width:14px; height:14px;
          border-top:1.5px solid rgba(255,107,74,0.6); border-right:1.5px solid rgba(255,107,74,0.6); }
        .pc-corner-bl { position:absolute; bottom:0; left:0; width:14px; height:14px;
          border-bottom:1.5px solid rgba(255,107,74,0.2); border-left:1.5px solid rgba(255,107,74,0.2); }
        .mono-label { font-family:'Space Mono',monospace; font-size:0.5rem;
          letter-spacing:0.18em; color:#ff6b4a; text-transform:uppercase; }
        .bebas { font-family:'Bebas Neue',sans-serif; }
        .pred-select { width:100%; background:#060810; border:1px solid rgba(255,107,74,0.2);
          color:#cdd9e5; font-family:'Space Mono',monospace; font-size:0.62rem;
          padding:0.6rem 0.8rem; appearance:none; cursor:pointer; outline:none; border-radius:0;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23ff6b4a'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:right 0.8rem center; }
        .pred-select:focus { border-color:rgba(255,107,74,0.5); }
        .pred-select option { background:#0a0d14; }
        .risk-badge { display:inline-flex; align-items:center; gap:0.4rem; padding:0.25rem 0.7rem;
          font-family:'Space Mono',monospace; font-size:0.5rem; font-weight:700;
          letter-spacing:0.16em; text-transform:uppercase; border:1px solid; }
        .analyze-btn { width:100%; background:linear-gradient(135deg,#ff6b4a,#e8441f);
          color:#060810; font-family:'Space Mono',monospace; font-size:0.7rem; font-weight:700;
          letter-spacing:0.16em; padding:0.9rem; border:none; cursor:pointer; text-transform:uppercase;
          display:flex; align-items:center; justify-content:center; gap:0.5rem;
          transition:all 0.2s; position:relative; overflow:hidden; }
        .analyze-btn::after { content:''; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);
          transform:translateX(-100%); transition:transform 0.4s; }
        .analyze-btn:hover::after { transform:translateX(100%); }
        .analyze-btn:hover:not(:disabled) { box-shadow:0 0 24px rgba(255,107,74,0.4); }
        .analyze-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .stat-val { font-family:'Bebas Neue',sans-serif; font-size:1.8rem; color:#fff; line-height:1; }
        .stat-sub { font-family:'Space Mono',monospace; font-size:0.48rem; color:#455060;
          letter-spacing:0.1em; margin-top:0.3rem; }
        .pred-table { width:100%; border-collapse:collapse; }
        .pred-th { font-family:'Space Mono',monospace; font-size:0.48rem; letter-spacing:0.14em;
          text-transform:uppercase; color:#455060; padding:0.6rem 1rem; text-align:left;
          border-bottom:1px solid rgba(255,107,74,0.08); background:#080b12; }
        .pred-tr { border-bottom:1px solid rgba(255,107,74,0.04); transition:background 0.15s; cursor:pointer; }
        .pred-tr:hover { background:rgba(255,107,74,0.025); }
        .pred-td { padding:0.6rem 1rem; font-family:'Space Mono',monospace; font-size:0.58rem; color:#8b949e; }
        .pred-td.big { font-family:'Bebas Neue',sans-serif; font-size:1rem; color:#e2e8f0; }
        @keyframes pulse-slow { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .fade-in { animation:fade-in 0.4s ease both; }
        .crime-pill { padding:0.3rem 0.6rem; border:1px solid rgba(255,107,74,0.15);
          font-family:'Space Mono',monospace; font-size:0.48rem; letter-spacing:0.08em;
          color:#455060; cursor:pointer; transition:all 0.15s; text-transform:uppercase;
          white-space:nowrap; background:transparent; }
        .crime-pill.active { background:rgba(255,107,74,0.12); border-color:rgba(255,107,74,0.4); color:#ff6b4a; }
        .crime-pill:hover:not(.active) { border-color:rgba(255,107,74,0.25); color:#8b949e; }
        .waiting { display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding:5rem 2rem; text-align:center; }
        .waiting-ring { width:80px; height:80px; border:1px solid rgba(255,107,74,0.15);
          display:flex; align-items:center; justify-content:center;
          margin-bottom:1.5rem; position:relative; }
        .waiting-ring::before { content:''; position:absolute; inset:-4px;
          border:1px solid rgba(255,107,74,0.06); }
      `}</style>

      <div style={{ maxWidth: "1360px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.75rem" }}>
          <div>
            <div className="mono-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <div style={{ width: 20, height: 1, background: "#ff6b4a" }} />
              Predictive Analytics Engine — Hybrid RF+XGBoost
            </div>
            <h1 className="bebas" style={{ fontSize: "clamp(2.2rem,4vw,3.6rem)", color: "#fff", letterSpacing: "0.03em", lineHeight: 0.92, margin: 0 }}>
              Crime Predictions <span style={{ color: "#ff6b4a" }}>2026</span>
            </h1>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.52rem", color: "#455060", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "0.35rem" }}>
              Sri Lanka District-Level Forecast · All 25 Districts · 13 Crime Categories
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div style={{
              padding: "0.18rem 0.5rem", background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.25)", fontFamily: "'Space Mono',monospace",
              fontSize: "0.48rem", letterSpacing: "0.1em", color: "#22c55e",
              display: "flex", alignItems: "center", gap: "0.3rem",
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: "pulse-slow 1s infinite" }} />
              SYSTEM ONLINE
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1rem", marginBottom: "1rem" }}>

          {/* Left panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="pc" style={{ padding: "1.25rem" }}>
              <div className="pc-corner" />
              <div className="pc-corner-bl" />
              <div className="mono-label" style={{ marginBottom: "0.6rem" }}>01 — District</div>
              <select
                className="pred-select"
                value={selectedDistrict}
                onChange={(e) => { setDistrict(e.target.value); setAnalyzed(false); }}
              >
                <option value="">Select District...</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {selectedDistrict && (
                <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", color: "#22c55e", letterSpacing: "0.1em" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: "pulse-slow 2s infinite" }} />
                  DISTRICT LOCKED — ID {selectedDistrict}
                </div>
              )}
            </div>

            <div className="pc" style={{ padding: "1.25rem" }}>
              <div className="pc-corner" />
              <div className="mono-label" style={{ marginBottom: "0.75rem" }}>02 — Crime Category</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {CRIME_KEYS.map((key) => (
                  <button
                    key={key}
                    className={`crime-pill${selectedCrime === key ? " active" : ""}`}
                    onClick={() => setCrime(key)}
                  >
                    {CRIME_LABELS[key].replace("over Rs. 50,000", "50k+").replace("by Knife", "(Knife)")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {selectedDistrict ? (
              <>
                {/* Risk strip */}
                <div className="pc fade-in" style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                  <div className="pc-corner" />
                  <div>
                    <div className="mono-label" style={{ marginBottom: "0.3rem" }}>Active Forecast Target</div>
                    <div className="bebas" style={{ fontSize: "1.8rem", color: "#fff", letterSpacing: "0.03em", lineHeight: 1 }}>
                      {distName} — {CRIME_LABELS[selectedCrime]}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <div>
                      <div className="mono-label" style={{ marginBottom: "0.3rem" }}>2026 Forecast</div>
                      <div className="bebas" style={{ fontSize: "2rem", color: "#ff6b4a", letterSpacing: "0.02em" }}>
                        {predValue > 0 ? <AnimatedNumber target={predValue} /> : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="mono-label" style={{ marginBottom: "0.3rem" }}>Risk Level</div>
                      <div className="risk-badge" style={{ color: riskMeta.color, background: riskMeta.bg, borderColor: riskMeta.border }}>
                        {riskMeta.icon} {riskLevel}
                      </div>
                    </div>
                    <div>
                      <div className="mono-label" style={{ marginBottom: "0.3rem" }}></div>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", color: "#38bdf8", letterSpacing: "0.06em" }}>
                        
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line chart */}
                <div className="pc fade-in" style={{ padding: "1.25rem" }}>
                  <div className="pc-corner" />
                  <div className="mono-label" style={{ marginBottom: "0.25rem" }}>Historical vs Predicted Trend</div>
                  <div className="bebas" style={{ fontSize: "1rem", color: "#e2e8f0", letterSpacing: "0.04em", marginBottom: "1rem" }}>
                    {distName} — {CRIME_LABELS[selectedCrime]}
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid {...gridStyle} />
                      <XAxis dataKey="year" type="category" tick={axisStyle} axisLine={false} tickLine={false} interval={0} />
                      <YAxis
                        tick={axisStyle} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                      />
                      <Tooltip content={<SentinelTooltip />} />
                      <Legend wrapperStyle={{ fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", color: "#455060" }} />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#ff6b4a"
                        strokeWidth={2}
                        name="Historical"
                        dot={{ fill: "#ff6b4a", r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        strokeDasharray="6 4"
                        name="Predicted 2026"
                        dot={<PredictedDot />}
                        activeDot={{ r: 9, fill: "#38bdf8", stroke: "#060810", strokeWidth: 2 }}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Predictions table — Model & Confidence columns REMOVED */}
                {predictions.length > 0 && (
                  <div className="pc fade-in">
                    <div className="pc-corner" />
                    <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,107,74,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div className="mono-label" style={{ marginBottom: "0.2rem" }}>Prediction Data Table</div>
                        <div className="bebas" style={{ fontSize: "1.1rem", color: "#e2e8f0", letterSpacing: "0.04em" }}>
                          {distName} — All Categories · 2026
                        </div>
                      </div>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.5rem", color: "#455060" }}>
                        {predictions.length} predictions · Hybrid RF+XGBoost
                      </div>
                    </div>
                    <table className="pred-table">
                      <thead>
                        <tr>
                          <th className="pred-th">#</th>
                          <th className="pred-th">Crime Category</th>
                          <th className="pred-th">DB Key</th>
                          <th className="pred-th">Year</th>
                          <th className="pred-th">Predicted Cases</th>
                          <th className="pred-th">Risk Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CRIME_KEYS.map((key, i) => {
                          const pred = predictions.find(
                            (p) => p.crimeType?.toLowerCase().replace(/\s/g, "") === key.toLowerCase()
                          );
                          const val  = pred?.predictedValue ?? 0;
                          const risk = getRiskLevel(key, val);
                          const rm   = RISK_META[risk];
                          return (
                            <tr
                              key={key}
                              className="pred-tr"
                              style={{ background: key === selectedCrime ? "rgba(255,107,74,0.04)" : undefined }}
                              onClick={() => setCrime(key)}
                            >
                              <td className="pred-td" style={{ color: "#2d3a4a" }}>{String(i + 1).padStart(2, "0")}</td>
                              <td className="pred-td big">{CRIME_LABELS[key]}</td>
                              <td className="pred-td" style={{ color: "#38bdf8", fontSize: "0.5rem" }}>{key}</td>
                              <td className="pred-td big">{pred?.predictedYear ?? 2026}</td>
                              <td className="pred-td big" style={{ color: key === selectedCrime ? "#ff6b4a" : "#e2e8f0" }}>
                                {val.toLocaleString()}
                              </td>
                              <td className="pred-td">
                                <span className="risk-badge" style={{ color: rm.color, background: rm.bg, borderColor: rm.border, padding: "0.18rem 0.5rem" }}>
                                  {risk}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="pc" style={{ minHeight: 500 }}>
                <div className="waiting">
                  <div className="waiting-ring">
                    <Target size={28} style={{ color: "#ff6b4a", opacity: 0.4 }} />
                  </div>
                  <div className="bebas" style={{ fontSize: "1.6rem", color: "#cdd9e5", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                    Awaiting District Selection
                  </div>
                  <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.55rem", color: "#2d3a4a", letterSpacing: "0.06em", lineHeight: 1.8, maxWidth: 320, textAlign: "center" }}>
                    Select a district to activate predictive analytics. Choose a crime category and run the hybrid RF+XGBoost model to view 2026 forecasts.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
