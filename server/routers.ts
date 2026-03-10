import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as analytics from "./analytics";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Crime Data Routers
  crime: router({
    /**
     * Get all districts with their basic info
     */
    getAllDistricts: publicProcedure.query(async () => {
      try {
        const districts = await db.getAllDistricts();
        return districts;
      } catch (error) {
        console.error("Error fetching districts:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch districts",
        });
      }
    }),

    /**
     * Get crime statistics for a specific district across all years
     */
    getDistrictStats: publicProcedure
      .input(z.object({ districtId: z.number() }))
      .query(async ({ input }) => {
        try {
          const stats = await db.getCrimeStatisticsByDistrict(input.districtId);
          const district = await db.getDistrictById(input.districtId);
          
          if (!district) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "District not found",
            });
          }

          const summary = analytics.calculateDistrictSummary(stats);

          return {
            district,
            stats,
            summary,
          };
        } catch (error) {
          console.error("Error fetching district stats:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch district statistics",
          });
        }
      }),

    /**
     * Get crime statistics for a specific year across all districts
     */
    getYearStats: publicProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        try {
          const stats = await db.getCrimeStatisticsByYear(input.year);
          return stats;
        } catch (error) {
          console.error("Error fetching year stats:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch year statistics",
          });
        }
      }),

    /**
     * Get all crime statistics with district information
     */
    getAllStats: publicProcedure.query(async () => {
      try {
        const data = await db.getAllCrimeStatisticsWithDistricts();
        return data;
      } catch (error) {
        console.error("Error fetching all stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch all statistics",
        });
      }
    }),

    /**
     * Get crime data summary for dashboard
     */
    getDashboardSummary: publicProcedure.query(async () => {
      try {
        const allStats = await db.getAllCrimeStatisticsWithDistricts();
        const districts = await db.getAllDistricts();

        // Group by district
        const districtMap = new Map();
        for (const { crime_statistics, districts: dist } of allStats) {
          if (!districtMap.has(dist.id)) {
            districtMap.set(dist.id, {
              district: dist,
              stats: [],
            });
          }
          districtMap.get(dist.id).stats.push(crime_statistics);
        }

        // Calculate summaries
        const districtSummaries = Array.from(districtMap.values()).map(({ district, stats }) => ({
          district,
          summary: analytics.calculateDistrictSummary(stats),
        }));

        // Sort by risk level
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        districtSummaries.sort((a, b) => {
          const aRisk = riskOrder[a.summary.riskLevel as keyof typeof riskOrder] ?? 4;
          const bRisk = riskOrder[b.summary.riskLevel as keyof typeof riskOrder] ?? 4;
          return aRisk - bRisk;
        });

        // Get high-risk districts
        const highRiskDistricts = districtSummaries.filter(
          d => d.summary.riskLevel === "high" || d.summary.riskLevel === "critical"
        );

        // Calculate overall statistics
        const totalCrimes = districtSummaries.reduce((sum, d) => sum + d.summary.totalCrimes, 0);
        const averageCrimesPerDistrict = Math.round(totalCrimes / districtSummaries.length);

        return {
          totalDistricts: districts.length,
          totalCrimes,
          averageCrimesPerDistrict,
          highRiskCount: highRiskDistricts.length,
          districtSummaries,
          highRiskDistricts,
        };
      } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch dashboard summary",
        });
      }
    }),

    /**
     * Get predictions for a specific district
     */
    getPredictions: publicProcedure
      .input(z.object({ districtId: z.number() }))
      .query(async ({ input }) => {
        try {
          const predictions = await db.getPredictionsByDistrict(input.districtId);
          return predictions;
        } catch (error) {
          console.error("Error fetching predictions:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch predictions",
          });
        }
      }),

    /**
     * Generate predictions for all districts
     */
    generatePredictions: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        // Only allow admin users
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only administrators can generate predictions",
          });
        }

        const allStats = await db.getAllCrimeStatisticsWithDistricts();
        const crimeTypes = analytics.extractCrimeValues(allStats[0]?.crime_statistics);
        const predictYears = [2024, 2025];

        let generatedCount = 0;

        // Group by district and crime type
        const districtCrimeMap = new Map();
        for (const item of allStats) {
          const crime_statistics = item.crime_statistics;
          const dist = item.districts;
          const key = `${dist.id}`;
          if (!districtCrimeMap.has(key)) {
            districtCrimeMap.set(key, {
              districtId: dist.id,
              stats: [],
            });
          }
          districtCrimeMap.get(key).stats.push(crime_statistics);
        }

        // Generate predictions for each district and crime type
        for (const districtData of Array.from(districtCrimeMap.values())) {
          const { districtId, stats } = districtData;
          for (const crimeType of Object.keys(crimeTypes)) {
            const historicalData = stats
              .sort((a: any, b: any) => a.year - b.year)
              .map((s: any) => ({
                year: s.year,
                value: analytics.extractCrimeValues(s)[crimeType] || 0,
              }));

            const predictions = analytics.generatePredictions(
              districtId,
              crimeType,
              historicalData,
              predictYears
            );

            for (const pred of predictions) {
              await db.insertCrimePrediction({
                ...pred,
                confidence: pred.confidence.toString(),
              });
              generatedCount++;
            }
          }
        }

        return {
          success: true,
          generatedCount,
          message: `Generated ${generatedCount} predictions`,
        };
      } catch (error) {
        console.error("Error generating predictions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate predictions",
        });
      }
    }),

    /**
     * Get high-risk districts
     */
    getHighRiskDistricts: publicProcedure.query(async () => {
      try {
        const highRisk = await db.getHighRiskDistricts("high");
        const critical = await db.getHighRiskDistricts("critical");
        
        return {
          high: highRisk,
          critical: critical,
        };
      } catch (error) {
        console.error("Error fetching high-risk districts:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch high-risk districts",
        });
      }
    }),

    /**
     * Get crime trends for a specific crime type
     */
    getCrimeTrend: publicProcedure
      .input(z.object({ 
        crimeType: z.string(),
        districtId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        try {
          const allStats = await db.getAllCrimeStatisticsWithDistricts();
          
          const filtered = allStats.filter(item => {
            if (input.districtId) {
              return item.districts.id === input.districtId;
            }
            return true;
          });

          const trends = filtered.map(({ crime_statistics, districts: dist }) => {
            const crimeValues = analytics.extractCrimeValues(crime_statistics);
            return {
              year: crime_statistics.year,
              district: dist.name,
              value: crimeValues[input.crimeType] || 0,
            };
          });

          return trends.sort((a, b) => a.year - b.year);
        } catch (error) {
          console.error("Error fetching crime trend:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch crime trend",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
