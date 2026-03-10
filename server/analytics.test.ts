import { describe, it, expect } from "vitest";
import {
  linearRegression,
  calculateRSquared,
  predictValue,
  calculateTrend,
  determineRiskLevel,
  generatePredictions,
  calculateDistrictSummary,
} from "./analytics";

describe("Analytics Engine", () => {
  describe("linearRegression", () => {
    it("should calculate slope and intercept correctly", () => {
      const data = [
        { x: 0, y: 100 },
        { x: 1, y: 200 },
        { x: 2, y: 300 },
      ];

      const result = linearRegression(data);
      expect(result.slope).toBeCloseTo(100, 1);
      expect(result.intercept).toBeCloseTo(100, 1);
    });

    it("should handle single data point", () => {
      const data = [{ x: 0, y: 150 }];
      const result = linearRegression(data);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(150);
    });

    it("should handle empty data", () => {
      const data: { x: number; y: number }[] = [];
      const result = linearRegression(data);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
    });
  });

  describe("calculateRSquared", () => {
    it("should calculate R-squared for perfect fit", () => {
      const data = [
        { x: 0, y: 100 },
        { x: 1, y: 200 },
        { x: 2, y: 300 },
      ];
      const slope = 100;
      const intercept = 100;

      const rSquared = calculateRSquared(data, slope, intercept);
      expect(rSquared).toBeCloseTo(1, 1);
    });

    it("should return 0 for constant data", () => {
      const data = [
        { x: 0, y: 100 },
        { x: 1, y: 100 },
        { x: 2, y: 100 },
      ];
      const slope = 0;
      const intercept = 100;

      const rSquared = calculateRSquared(data, slope, intercept);
      expect(rSquared).toBe(0);
    });
  });

  describe("predictValue", () => {
    it("should predict value correctly", () => {
      const predicted = predictValue(5, 10, 20);
      expect(predicted).toBe(70); // 10 * 5 + 20 = 70
    });

    it("should return 0 for negative predictions", () => {
      const predicted = predictValue(1, -100, 50);
      expect(predicted).toBe(0); // -100 + 50 = -50, clamped to 0
    });
  });

  describe("calculateTrend", () => {
    it("should identify increasing trend", () => {
      const trend = calculateTrend(2.0);
      expect(trend).toBe("increasing");
    });

    it("should identify decreasing trend", () => {
      const trend = calculateTrend(-2.0);
      expect(trend).toBe("decreasing");
    });

    it("should identify stable trend", () => {
      const trend = calculateTrend(0.1);
      expect(trend).toBe("stable");
    });
  });

  describe("determineRiskLevel", () => {
    it("should classify critical risk", () => {
      const risk = determineRiskLevel(1600, 10, 1000);
      expect(risk).toBe("critical");
    });

    it("should classify high risk", () => {
      const risk = determineRiskLevel(1400, 5, 1000);
      expect(risk).toBe("high");
    });

    it("should classify medium risk", () => {
      const risk = determineRiskLevel(900, 0, 1000);
      expect(risk).toBe("medium");
    });

    it("should classify low risk", () => {
      const risk = determineRiskLevel(500, -5, 1000);
      expect(risk).toBe("low");
    });
  });

  describe("generatePredictions", () => {
    it("should generate predictions for valid data", () => {
      const historicalData = [
        { year: 2021, value: 100 },
        { year: 2022, value: 150 },
        { year: 2023, value: 200 },
      ];

      const predictions = generatePredictions(
        1,
        "Robbery",
        historicalData,
        [2024, 2025]
      );

      expect(predictions).toHaveLength(2);
      expect(predictions[0].districtId).toBe(1);
      expect(predictions[0].crimeType).toBe("Robbery");
      expect(predictions[0].predictedYear).toBe(2024);
      expect(predictions[0].predictedValue).toBeGreaterThan(0);
      expect(predictions[0].confidence).toBeGreaterThan(0);
      expect(predictions[0].confidence).toBeLessThanOrEqual(100);
    });

    it("should return empty array for insufficient data", () => {
      const historicalData = [{ year: 2021, value: 100 }];
      const predictions = generatePredictions(1, "Robbery", historicalData, [
        2024,
      ]);
      expect(predictions).toHaveLength(0);
    });

    it("should identify increasing trend in predictions", () => {
      const historicalData = [
        { year: 2021, value: 100 },
        { year: 2022, value: 200 },
        { year: 2023, value: 300 },
      ];

      const predictions = generatePredictions(1, "Robbery", historicalData, [
        2024,
      ]);

      expect(predictions[0].trend).toBe("increasing");
    });

    it("should identify decreasing trend in predictions", () => {
      const historicalData = [
        { year: 2021, value: 300 },
        { year: 2022, value: 200 },
        { year: 2023, value: 100 },
      ];

      const predictions = generatePredictions(1, "Robbery", historicalData, [
        2024,
      ]);

      expect(predictions[0].trend).toBe("decreasing");
    });
  });

  describe("calculateDistrictSummary", () => {
    it("should calculate summary for valid data", () => {
      const stats = [
        {
          id: 1,
          districtId: 1,
          year: 2021,
          rapeCases: 10,
          homicide: 5,
          attemptedHomicide: 3,
          abduction: 2,
          kidnapping: 1,
          arson: 1,
          theftOver50k: 50,
          grievousHurt: 20,
          hurtByKnife: 15,
          robbery: 100,
          extortion: 10,
          unnaturalOffense: 2,
          sexualAbuse: 5,
          total: 224,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          districtId: 1,
          year: 2022,
          rapeCases: 12,
          homicide: 6,
          attemptedHomicide: 4,
          abduction: 3,
          kidnapping: 2,
          arson: 2,
          theftOver50k: 60,
          grievousHurt: 25,
          hurtByKnife: 18,
          robbery: 120,
          extortion: 12,
          unnaturalOffense: 3,
          sexualAbuse: 6,
          total: 273,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any;

      const summary = calculateDistrictSummary(stats);

      expect(summary.totalCrimes).toBe(497);
      expect(summary.averagePerYear).toBe(249); // 497 / 2 = 248.5, rounded to 249
      expect(summary.trend).toBe("increasing");
      expect(summary.yearOverYearChange).toBeGreaterThan(0);
    });

    it("should return defaults for empty data", () => {
      const summary = calculateDistrictSummary([]);

      expect(summary.totalCrimes).toBe(0);
      expect(summary.averagePerYear).toBe(0);
      expect(summary.trend).toBe("stable");
      expect(summary.riskLevel).toBe("low");
    });
  });
});
