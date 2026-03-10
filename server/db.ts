import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, districts, crimeStatistics, crimePredictions, dataUploads, crimeTypes } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= Crime Data Functions =============

/**
 * Get or create a district by name
 */
export async function getOrCreateDistrict(name: string, latitude: number, longitude: number, province?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(districts).where(eq(districts.name, name)).limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db.insert(districts).values({
    name,
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    province,
  });

  return { id: result[0].insertId, name, latitude, longitude, province };
}

/**
 * Get all districts
 */
export async function getAllDistricts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(districts);
}

/**
 * Get district by ID
 */
export async function getDistrictById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(districts).where(eq(districts.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Insert crime statistics
 */
export async function insertCrimeStatistic(data: typeof crimeStatistics.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(crimeStatistics).values(data);
}

/**
 * Get crime statistics for a district and year
 */
export async function getCrimeStatisticsByDistrictAndYear(districtId: number, year: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(crimeStatistics)
    .where(and(eq(crimeStatistics.districtId, districtId), eq(crimeStatistics.year, year)))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

/**
 * Get all crime statistics for a district
 */
export async function getCrimeStatisticsByDistrict(districtId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(crimeStatistics)
    .where(eq(crimeStatistics.districtId, districtId))
    .orderBy(crimeStatistics.year);
}

/**
 * Get crime statistics for a specific year across all districts
 */
export async function getCrimeStatisticsByYear(year: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(crimeStatistics)
    .where(eq(crimeStatistics.year, year));
}

/**
 * Get all crime statistics with district info
 */
export async function getAllCrimeStatisticsWithDistricts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(crimeStatistics)
    .innerJoin(districts, eq(crimeStatistics.districtId, districts.id))
    .orderBy(crimeStatistics.year, crimeStatistics.districtId);
}

/**
 * Insert crime prediction
 */
export async function insertCrimePrediction(data: typeof crimePredictions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(crimePredictions).values(data);
}

/**
 * Get predictions for a district
 */
export async function getPredictionsByDistrict(districtId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(crimePredictions)
    .where(eq(crimePredictions.districtId, districtId))
    .orderBy(desc(crimePredictions.predictedYear));
}

/**
 * Get high-risk districts based on predictions
 */
export async function getHighRiskDistricts(riskLevel: string = "high") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(crimePredictions)
    .innerJoin(districts, eq(crimePredictions.districtId, districts.id))
    .where(eq(crimePredictions.riskLevel, riskLevel as any))
    .orderBy(desc(crimePredictions.confidence));
}

/**
 * Record data upload
 */
export async function recordDataUpload(userId: number, fileName: string, fileSize: number, recordsImported: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(dataUploads).values({
    userId,
    fileName,
    fileSize,
    recordsImported,
    status: "completed",
  });
}

/**
 * Get upload history
 */
export async function getUploadHistory(userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (userId) {
    return db
      .select()
      .from(dataUploads)
      .where(eq(dataUploads.userId, userId))
      .orderBy(desc(dataUploads.uploadedAt));
  }
  
  return db.select().from(dataUploads).orderBy(desc(dataUploads.uploadedAt));
}
