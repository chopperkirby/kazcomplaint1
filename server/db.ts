import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  cities,
  complaintComments,
  complaints,
  complaintVotes,
  districts,
  regions,
  trafficIncidents,
  users,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createUserWithPassword(data: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<{ id: number; openId: string }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const openId = `email_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    role: "user",
    lastSignedIn: new Date(),
  });
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return { id: result[0].id, openId };
}

// ─── Priority formula ─────────────────────────────────────────────────────────

export function calculatePriority(supportCount: number, ageHours: number): number {
  const base =
    supportCount < 50
      ? supportCount * 1.0
      : 50 + Math.pow(supportCount - 50, 1.8) * 2;
  const ageFactor = 1 + Math.log1p(ageHours / 24) * 0.5;
  return parseFloat((base * ageFactor).toFixed(2));
}

// ─── Region / City / District helpers ────────────────────────────────────────

export async function getRegions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(regions).orderBy(regions.nameRu);
}

export async function getCitiesByRegion(regionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cities).where(eq(cities.regionId, regionId)).orderBy(cities.nameRu);
}

export async function getAllCities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cities).orderBy(cities.nameRu);
}

export async function getDistrictsByCity(cityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(districts).where(eq(districts.cityId, cityId)).orderBy(districts.nameRu);
}

// ─── Complaint helpers ────────────────────────────────────────────────────────

export async function createComplaint(data: {
  userId: number;
  title: string;
  description: string;
  category: string;
  department: string;
  regionId?: number;
  cityId?: number;
  districtId?: number;
  address?: string;
  lat?: number;
  lng?: number;
  photoUrls?: string[];
  videoUrls?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(complaints).values({
    userId: data.userId,
    title: data.title,
    description: data.description,
    category: data.category as any,
    department: data.department as any,
    regionId: data.regionId,
    cityId: data.cityId,
    districtId: data.districtId,
    address: data.address,
    lat: data.lat,
    lng: data.lng,
    photoUrls: data.photoUrls ?? [],
    videoUrls: data.videoUrls ?? [],
    priority: 0,
    supportCount: 0,
    status: "new",
  });
  return result;
}

export async function getComplaints(opts: {
  search?: string;
  status?: string;
  category?: string;
  department?: string;
  regionId?: number;
  cityId?: number;
  districtId?: number;
  userId?: number;
  limit?: number;
  offset?: number;
  sortBy?: "priority" | "date" | "support";
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions = [];
  if (opts.search) {
    conditions.push(
      or(
        like(complaints.title, `%${opts.search}%`),
        like(complaints.description, `%${opts.search}%`)
      )
    );
  }
  if (opts.status) conditions.push(eq(complaints.status, opts.status as any));
  if (opts.category) conditions.push(eq(complaints.category, opts.category as any));
  if (opts.department) conditions.push(eq(complaints.department, opts.department as any));
  if (opts.regionId) conditions.push(eq(complaints.regionId, opts.regionId));
  if (opts.cityId) conditions.push(eq(complaints.cityId, opts.cityId));
  if (opts.districtId) conditions.push(eq(complaints.districtId, opts.districtId));
  if (opts.userId) conditions.push(eq(complaints.userId, opts.userId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const orderCol =
    opts.sortBy === "priority"
      ? desc(complaints.priority)
      : opts.sortBy === "support"
      ? desc(complaints.supportCount)
      : desc(complaints.createdAt);
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const [items, countResult] = await Promise.all([
    db.select().from(complaints).where(where).orderBy(orderCol).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(complaints).where(where),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getComplaintById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
  return result[0] ?? null;
}

export async function voteComplaint(complaintId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db
    .select()
    .from(complaintVotes)
    .where(and(eq(complaintVotes.complaintId, complaintId), eq(complaintVotes.userId, userId)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .delete(complaintVotes)
      .where(and(eq(complaintVotes.complaintId, complaintId), eq(complaintVotes.userId, userId)));
    await db
      .update(complaints)
      .set({ supportCount: sql`${complaints.supportCount} - 1` })
      .where(eq(complaints.id, complaintId));
    return { voted: false };
  }
  await db.insert(complaintVotes).values({ complaintId, userId });
  await db
    .update(complaints)
    .set({ supportCount: sql`${complaints.supportCount} + 1` })
    .where(eq(complaints.id, complaintId));
  return { voted: true };
}

export async function getUserVotes(userId: number, complaintIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (complaintIds.length === 0) return [];
  const votes = await db
    .select({ complaintId: complaintVotes.complaintId })
    .from(complaintVotes)
    .where(
      and(
        eq(complaintVotes.userId, userId),
        sql`${complaintVotes.complaintId} IN (${sql.join(
          complaintIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
    );
  return votes.map((v) => v.complaintId);
}

export async function updateComplaintStatus(
  id: number,
  status: string,
  staffNote?: string,
  staffId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const updateData: Record<string, unknown> = { status };
  if (staffNote !== undefined) updateData.staffNote = staffNote;
  if (staffId !== undefined) updateData.assignedStaffId = staffId;
  if (status === "completed" || status === "rejected") updateData.resolvedAt = new Date();
  await db.update(complaints).set(updateData as any).where(eq(complaints.id, id));
  return { success: true };
}

export async function updateComplaintAiSuggestion(id: number, aiSuggestion: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(complaints).set({ aiSuggestion }).where(eq(complaints.id, id));
}

export async function updateComplaintVideoAnalysis(id: number, videoAiAnalysis: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(complaints).set({ videoAiAnalysis }).where(eq(complaints.id, id));
}

export async function addComment(data: {
  complaintId: number;
  userId: number;
  content: string;
  isStaffReply: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(complaintComments).values(data);
  return { success: true };
}

// ─── Map data ─────────────────────────────────────────────────────────────────

export async function getMapData(cityId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [sql`${complaints.lat} IS NOT NULL`, sql`${complaints.lng} IS NOT NULL`];
  if (cityId) conditions.push(eq(complaints.cityId, cityId));
  return db
    .select({
      id: complaints.id,
      title: complaints.title,
      lat: complaints.lat,
      lng: complaints.lng,
      priority: complaints.priority,
      status: complaints.status,
      category: complaints.category,
      address: complaints.address,
      supportCount: complaints.supportCount,
      cityId: complaints.cityId,
    })
    .from(complaints)
    .where(and(...conditions))
    .orderBy(desc(complaints.priority))
    .limit(500);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAnalytics(opts: { regionId?: number; cityId?: number }) {
  const db = await getDb();
  if (!db) return { byStatus: [], byCategory: [], byDepartment: [], byCity: [] };
  const conditions = [];
  if (opts.regionId) conditions.push(eq(complaints.regionId, opts.regionId));
  if (opts.cityId) conditions.push(eq(complaints.cityId, opts.cityId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [byStatus, byCategory, byDepartment] = await Promise.all([
    db
      .select({ status: complaints.status, count: sql<number>`count(*)` })
      .from(complaints)
      .where(where)
      .groupBy(complaints.status),
    db
      .select({ category: complaints.category, count: sql<number>`count(*)` })
      .from(complaints)
      .where(where)
      .groupBy(complaints.category)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db
      .select({ department: complaints.department, count: sql<number>`count(*)` })
      .from(complaints)
      .where(where)
      .groupBy(complaints.department),
  ]);

  return { byStatus, byCategory, byDepartment };
}

// ─── City Rankings ────────────────────────────────────────────────────────────

export async function getCityRankings() {
  const db = await getDb();
  if (!db) return [];

  const allCities = await db.select().from(cities);
  const rankings = await Promise.all(
    allCities.map(async (city) => {
      const [stats] = await db
        .select({
          total: sql<number>`count(*)`,
          inProgress: sql<number>`SUM(CASE WHEN ${complaints.status} = 'in_progress' THEN 1 ELSE 0 END)`,
          completed: sql<number>`SUM(CASE WHEN ${complaints.status} = 'completed' THEN 1 ELSE 0 END)`,
          avgPriority: sql<number>`AVG(${complaints.priority})`,
        })
        .from(complaints)
        .where(eq(complaints.cityId, city.id));

      const total = Number(stats?.total ?? 0);
      const completed = Number(stats?.completed ?? 0);
      const inProgress = Number(stats?.inProgress ?? 0);
      const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const avgPriority = Number(stats?.avgPriority ?? 0);

      return {
        cityId: city.id,
        cityName: city.nameRu,
        total,
        inProgress,
        completed,
        resolutionRate,
        avgPriority: parseFloat(avgPriority.toFixed(1)),
        score: resolutionRate - Math.min(avgPriority / 10, 30),
      };
    })
  );

  return rankings
    .filter((r) => r.total > 0)
    .sort((a, b) => b.resolutionRate - a.resolutionRate);
}

export async function getActiveProblems(opts: { cityId?: number; regionId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    or(eq(complaints.status, "new"), eq(complaints.status, "in_progress"), eq(complaints.status, "pending_approval"))!,
  ];
  if (opts.cityId) conditions.push(eq(complaints.cityId, opts.cityId));
  if (opts.regionId) conditions.push(eq(complaints.regionId, opts.regionId));

  return db
    .select()
    .from(complaints)
    .where(and(...conditions))
    .orderBy(desc(complaints.priority))
    .limit(50);
}

// ─── Traffic Incidents ────────────────────────────────────────────────────────

export async function getTrafficIncidents(opts: { cityId?: number; regionId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(trafficIncidents.status, "active")];
  if (opts.cityId) conditions.push(eq(trafficIncidents.cityId, opts.cityId));
  if (opts.regionId) conditions.push(eq(trafficIncidents.regionId, opts.regionId));
  return db
    .select()
    .from(trafficIncidents)
    .where(and(...conditions))
    .orderBy(desc(trafficIncidents.congestionIndex));
}

export async function createTrafficIncident(data: {
  cityId?: number;
  regionId?: number;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  severity: "low" | "medium" | "high" | "critical";
  congestionIndex?: number;
  address?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(trafficIncidents).values(data);
  return { success: true };
}

export async function resolveTrafficIncident(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(trafficIncidents)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(trafficIncidents.id, id));
  return { success: true };
}

export async function updateTrafficAiSolution(id: number, aiSolution: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(trafficIncidents).set({ aiSolution }).where(eq(trafficIncidents.id, id));
}

// ─── Seed Kazakhstan data ─────────────────────────────────────────────────────

export async function seedKazakhstanData() {
  const db = await getDb();
  if (!db) return { success: false };

  const existing = await db.select().from(regions).limit(1);
  if (existing.length > 0) return { success: true, message: "Already seeded" };

  const regionData = [
    { code: "ALM_CITY", nameRu: "Алматы (город)", nameKz: "Алматы қаласы", nameEn: "Almaty City", lat: 43.238, lng: 76.945 },
    { code: "AST_CITY", nameRu: "Астана (город)", nameKz: "Астана қаласы", nameEn: "Astana City", lat: 51.18, lng: 71.446 },
    { code: "SHY_CITY", nameRu: "Шымкент (город)", nameKz: "Шымкент қаласы", nameEn: "Shymkent City", lat: 42.317, lng: 69.596 },
    { code: "AKM", nameRu: "Акмолинская область", nameKz: "Ақмола облысы", nameEn: "Akmola Region", lat: 51.18, lng: 71.45 },
    { code: "AKT", nameRu: "Актюбинская область", nameKz: "Ақтөбе облысы", nameEn: "Aktobe Region", lat: 50.28, lng: 57.21 },
    { code: "ALM_REG", nameRu: "Алматинская область", nameKz: "Алматы облысы", nameEn: "Almaty Region", lat: 44.0, lng: 77.0 },
    { code: "ATY", nameRu: "Атырауская область", nameKz: "Атырау облысы", nameEn: "Atyrau Region", lat: 47.11, lng: 51.92 },
    { code: "VKO", nameRu: "Восточно-Казахстанская область", nameKz: "Шығыс Қазақстан облысы", nameEn: "East Kazakhstan Region", lat: 49.95, lng: 82.61 },
    { code: "ZHM", nameRu: "Жамбылская область", nameKz: "Жамбыл облысы", nameEn: "Zhambyl Region", lat: 42.9, lng: 71.37 },
    { code: "ZKO", nameRu: "Западно-Казахстанская область", nameKz: "Батыс Қазақстан облысы", nameEn: "West Kazakhstan Region", lat: 51.23, lng: 51.37 },
    { code: "KAR", nameRu: "Карагандинская область", nameKz: "Қарағанды облысы", nameEn: "Karaganda Region", lat: 49.8, lng: 73.1 },
    { code: "KST", nameRu: "Костанайская область", nameKz: "Қостанай облысы", nameEn: "Kostanay Region", lat: 53.21, lng: 63.62 },
    { code: "KZO", nameRu: "Кызылординская область", nameKz: "Қызылорда облысы", nameEn: "Kyzylorda Region", lat: 44.85, lng: 65.51 },
    { code: "MAN", nameRu: "Мангистауская область", nameKz: "Маңғыстау облысы", nameEn: "Mangystau Region", lat: 43.65, lng: 51.17 },
    { code: "PAV", nameRu: "Павлодарская область", nameKz: "Павлодар облысы", nameEn: "Pavlodar Region", lat: 52.3, lng: 76.95 },
    { code: "SKO", nameRu: "Северо-Казахстанская область", nameKz: "Солтүстік Қазақстан облысы", nameEn: "North Kazakhstan Region", lat: 54.87, lng: 69.15 },
    { code: "TUR", nameRu: "Туркестанская область", nameKz: "Түркістан облысы", nameEn: "Turkestan Region", lat: 43.3, lng: 68.27 },
    { code: "ABY", nameRu: "Абайская область", nameKz: "Абай облысы", nameEn: "Abai Region", lat: 50.41, lng: 80.23 },
    { code: "ZHT", nameRu: "Жетысуская область", nameKz: "Жетісу облысы", nameEn: "Zhetysu Region", lat: 45.0, lng: 78.4 },
    { code: "ULY", nameRu: "Улытауская область", nameKz: "Ұлытау облысы", nameEn: "Ulytau Region", lat: 48.0, lng: 67.0 },
  ];

  await db.insert(regions).values(regionData);
  const insertedRegions = await db.select().from(regions);
  const regionMap = new Map(insertedRegions.map((r) => [r.code, r.id]));

  const cityData = [
    { regionCode: "ALM_CITY", nameRu: "Алматы", nameKz: "Алматы", nameEn: "Almaty", lat: 43.238, lng: 76.945, isCapital: false },
    { regionCode: "AST_CITY", nameRu: "Астана", nameKz: "Астана", nameEn: "Astana", lat: 51.18, lng: 71.446, isCapital: true },
    { regionCode: "SHY_CITY", nameRu: "Шымкент", nameKz: "Шымкент", nameEn: "Shymkent", lat: 42.317, lng: 69.596, isCapital: false },
    { regionCode: "AKM", nameRu: "Кокшетау", nameKz: "Көкшетау", nameEn: "Kokshetau", lat: 53.28, lng: 69.39, isCapital: false },
    { regionCode: "AKT", nameRu: "Актобе", nameKz: "Ақтөбе", nameEn: "Aktobe", lat: 50.28, lng: 57.21, isCapital: false },
    { regionCode: "ALM_REG", nameRu: "Талдыкорган", nameKz: "Талдықорған", nameEn: "Taldykorgan", lat: 45.0, lng: 78.4, isCapital: false },
    { regionCode: "ATY", nameRu: "Атырау", nameKz: "Атырау", nameEn: "Atyrau", lat: 47.11, lng: 51.92, isCapital: false },
    { regionCode: "VKO", nameRu: "Усть-Каменогорск", nameKz: "Өскемен", nameEn: "Ust-Kamenogorsk", lat: 49.95, lng: 82.61, isCapital: false },
    { regionCode: "VKO", nameRu: "Семей", nameKz: "Семей", nameEn: "Semey", lat: 50.41, lng: 80.23, isCapital: false },
    { regionCode: "ZHM", nameRu: "Тараз", nameKz: "Тараз", nameEn: "Taraz", lat: 42.9, lng: 71.37, isCapital: false },
    { regionCode: "ZKO", nameRu: "Уральск", nameKz: "Орал", nameEn: "Uralsk", lat: 51.23, lng: 51.37, isCapital: false },
    { regionCode: "KAR", nameRu: "Караганда", nameKz: "Қарағанды", nameEn: "Karaganda", lat: 49.8, lng: 73.1, isCapital: false },
    { regionCode: "KAR", nameRu: "Темиртау", nameKz: "Теміртау", nameEn: "Temirtau", lat: 50.06, lng: 72.96, isCapital: false },
    { regionCode: "KST", nameRu: "Костанай", nameKz: "Қостанай", nameEn: "Kostanay", lat: 53.21, lng: 63.62, isCapital: false },
    { regionCode: "KZO", nameRu: "Кызылорда", nameKz: "Қызылорда", nameEn: "Kyzylorda", lat: 44.85, lng: 65.51, isCapital: false },
    { regionCode: "MAN", nameRu: "Актау", nameKz: "Ақтау", nameEn: "Aktau", lat: 43.65, lng: 51.17, isCapital: false },
    { regionCode: "PAV", nameRu: "Павлодар", nameKz: "Павлодар", nameEn: "Pavlodar", lat: 52.3, lng: 76.95, isCapital: false },
    { regionCode: "SKO", nameRu: "Петропавловск", nameKz: "Петропавл", nameEn: "Petropavlovsk", lat: 54.87, lng: 69.15, isCapital: false },
    { regionCode: "TUR", nameRu: "Туркестан", nameKz: "Түркістан", nameEn: "Turkestan", lat: 43.3, lng: 68.27, isCapital: false },
    { regionCode: "ABY", nameRu: "Семей", nameKz: "Семей", nameEn: "Semey", lat: 50.41, lng: 80.23, isCapital: false },
    { regionCode: "ZHT", nameRu: "Талдыкорган", nameKz: "Талдықорған", nameEn: "Taldykorgan", lat: 45.0, lng: 78.4, isCapital: false },
  ];

  const citiesToInsert = cityData
    .filter((c) => regionMap.has(c.regionCode))
    .map((c) => ({
      regionId: regionMap.get(c.regionCode)!,
      nameRu: c.nameRu,
      nameKz: c.nameKz,
      nameEn: c.nameEn,
      lat: c.lat,
      lng: c.lng,
      isCapital: c.isCapital,
    }));

  await db.insert(cities).values(citiesToInsert);

  const almatyCity = await db.select().from(cities).where(eq(cities.nameRu, "Алматы")).limit(1);
  if (almatyCity[0]) {
    await db.insert(districts).values([
      { cityId: almatyCity[0].id, nameRu: "Алатауский район", nameKz: "Алатау ауданы", lat: 43.31, lng: 76.83 },
      { cityId: almatyCity[0].id, nameRu: "Алмалинский район", nameKz: "Алмалы ауданы", lat: 43.26, lng: 76.94 },
      { cityId: almatyCity[0].id, nameRu: "Ауэзовский район", nameKz: "Әуезов ауданы", lat: 43.22, lng: 76.87 },
      { cityId: almatyCity[0].id, nameRu: "Бостандыкский район", nameKz: "Бостандық ауданы", lat: 43.25, lng: 76.92 },
      { cityId: almatyCity[0].id, nameRu: "Жетысуский район", nameKz: "Жетісу ауданы", lat: 43.29, lng: 77.01 },
      { cityId: almatyCity[0].id, nameRu: "Медеуский район", nameKz: "Медеу ауданы", lat: 43.22, lng: 76.97 },
      { cityId: almatyCity[0].id, nameRu: "Наурызбайский район", nameKz: "Наурызбай ауданы", lat: 43.17, lng: 76.78 },
      { cityId: almatyCity[0].id, nameRu: "Турксибский район", nameKz: "Түрксіб ауданы", lat: 43.32, lng: 77.04 },
    ]);
  }

  const astanaCity = await db.select().from(cities).where(eq(cities.nameRu, "Астана")).limit(1);
  if (astanaCity[0]) {
    await db.insert(districts).values([
      { cityId: astanaCity[0].id, nameRu: "Алматинский район", nameKz: "Алматы ауданы", lat: 51.15, lng: 71.43 },
      { cityId: astanaCity[0].id, nameRu: "Байконурский район", nameKz: "Байқоңыр ауданы", lat: 51.17, lng: 71.41 },
      { cityId: astanaCity[0].id, nameRu: "Есильский район", nameKz: "Есіл ауданы", lat: 51.19, lng: 71.47 },
      { cityId: astanaCity[0].id, nameRu: "Нура район", nameKz: "Нұра ауданы", lat: 51.21, lng: 71.5 },
      { cityId: astanaCity[0].id, nameRu: "Сарыарка район", nameKz: "Сарыарқа ауданы", lat: 51.16, lng: 71.45 },
    ]);
  }

  // Seed sample traffic incidents for Almaty and Astana
  if (almatyCity[0]) {
    await db.insert(trafficIncidents).values([
      { cityId: almatyCity[0].id, title: "Пробка на пр. Аль-Фараби", lat: 43.235, lng: 76.93, severity: "high", congestionIndex: 8.2, address: "пр. Аль-Фараби, Алматы" },
      { cityId: almatyCity[0].id, title: "Затор на ул. Абая", lat: 43.25, lng: 76.92, severity: "medium", congestionIndex: 5.5, address: "ул. Абая, Алматы" },
      { cityId: almatyCity[0].id, title: "Авария на пр. Достык", lat: 43.24, lng: 76.96, severity: "critical", congestionIndex: 9.1, address: "пр. Достык, Алматы" },
    ]);
  }
  if (astanaCity[0]) {
    await db.insert(trafficIncidents).values([
      { cityId: astanaCity[0].id, title: "Пробка на пр. Нурсултан", lat: 51.18, lng: 71.45, severity: "medium", congestionIndex: 6.3, address: "пр. Нурсултан, Астана" },
      { cityId: astanaCity[0].id, title: "Затор у ТРЦ Хан Шатыр", lat: 51.13, lng: 71.41, severity: "high", congestionIndex: 7.8, address: "пр. Туран, Астана" },
    ]);
  }

  return { success: true };
}
