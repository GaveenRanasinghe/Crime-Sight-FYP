import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Districts table storing Sri Lankan district information
 */
export const districts = mysqlTable("districts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  latitude: decimal("latitude", { precision: 10, scale: 6 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 6 }).notNull(),
  province: varchar("province", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type District = typeof districts.$inferSelect;
export type InsertDistrict = typeof districts.$inferInsert;

/**
 * Crime statistics table storing yearly crime data by district
 */
export const crimeStatistics = mysqlTable("crime_statistics", {
  id: int("id").autoincrement().primaryKey(),
  districtId: int("district_id").notNull(),
  year: int("year").notNull(),
  rapeCases: int("rape_cases").default(0),
  homicide: int("homicide").default(0),
  attemptedHomicide: int("attempted_homicide").default(0),
  abduction: int("abduction").default(0),
  kidnapping: int("kidnapping").default(0),
  arson: int("arson").default(0),
  theftOver50k: int("theft_over_50k").default(0),
  grievousHurt: int("grievous_hurt").default(0),
  hurtByKnife: int("hurt_by_knife").default(0),
  robbery: int("robbery").default(0),
  extortion: int("extortion").default(0),
  unnaturalOffense: int("unnatural_offense").default(0),
  sexualAbuse: int("sexual_abuse").default(0),
  total: int("total").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrimeStatistic = typeof crimeStatistics.$inferSelect;
export type InsertCrimeStatistic = typeof crimeStatistics.$inferInsert;

/**
 * Crime predictions table storing ML-generated predictions
 */
export const crimePredictions = mysqlTable("crime_predictions", {
  id: int("id").autoincrement().primaryKey(),
  districtId: int("district_id").notNull(),
  crimeType: varchar("crime_type", { length: 100 }).notNull(),
  predictedYear: int("predicted_year").notNull(),
  predictedValue: int("predicted_value").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).default("0"),
  trend: mysqlEnum("trend", ["increasing", "decreasing", "stable"]).notNull(),
  riskLevel: mysqlEnum("risk_level", ["low", "medium", "high", "critical"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrimePrediction = typeof crimePredictions.$inferSelect;
export type InsertCrimePrediction = typeof crimePredictions.$inferInsert;

/**
 * Data uploads table tracking imported datasets
 */
export const dataUploads = mysqlTable("data_uploads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: int("file_size"),
  recordsImported: int("records_imported").default(0),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending"),
  errorMessage: text("error_message"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type DataUpload = typeof dataUploads.$inferSelect;
export type InsertDataUpload = typeof dataUploads.$inferInsert;

/**
 * Crime type reference table
 */
export const crimeTypes = mysqlTable("crime_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrimeType = typeof crimeTypes.$inferSelect;
export type InsertCrimeType = typeof crimeTypes.$inferInsert;

/**
 * Analytics cache table for storing pre-computed analytics
 */
export const analyticsCaches = mysqlTable("analytics_caches", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cache_key", { length: 255 }).notNull().unique(),
  data: json("data"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AnalyticsCache = typeof analyticsCaches.$inferSelect;
export type InsertAnalyticsCache = typeof analyticsCaches.$inferInsert;
