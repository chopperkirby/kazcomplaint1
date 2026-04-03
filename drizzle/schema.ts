import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 256 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "staff"]).default("user").notNull(),
  department: mysqlEnum("department", ["akimat", "city_management", "gov_services"]),
  regionId: int("regionId"),
  cityId: int("cityId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const regions = mysqlTable("regions", {
  id: int("id").autoincrement().primaryKey(),
  nameRu: varchar("nameRu", { length: 128 }).notNull(),
  nameKz: varchar("nameKz", { length: 128 }),
  nameEn: varchar("nameEn", { length: 128 }),
  code: varchar("code", { length: 32 }).notNull().unique(),
  lat: float("lat"),
  lng: float("lng"),
});

export const cities = mysqlTable("cities", {
  id: int("id").autoincrement().primaryKey(),
  regionId: int("regionId").notNull(),
  nameRu: varchar("nameRu", { length: 128 }).notNull(),
  nameKz: varchar("nameKz", { length: 128 }),
  nameEn: varchar("nameEn", { length: 128 }),
  lat: float("lat"),
  lng: float("lng"),
  isCapital: boolean("isCapital").default(false),
});

export const districts = mysqlTable("districts", {
  id: int("id").autoincrement().primaryKey(),
  cityId: int("cityId").notNull(),
  nameRu: varchar("nameRu", { length: 128 }).notNull(),
  nameKz: varchar("nameKz", { length: 128 }),
  lat: float("lat"),
  lng: float("lng"),
});

export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", [
    "roads",
    "utilities",
    "housing",
    "public_transport",
    "parks",
    "lighting",
    "waste",
    "safety",
    "noise",
    "water",
    "heating",
    "traffic",
    "other",
  ]).notNull(),
  department: mysqlEnum("department", [
    "akimat",
    "city_management",
    "gov_services",
  ]).notNull(),
  status: mysqlEnum("status", [
    "new",
    "pending_approval",
    "in_progress",
    "completed",
    "rejected",
  ])
    .default("new")
    .notNull(),
  priority: float("priority").default(0).notNull(),
  supportCount: int("supportCount").default(0).notNull(),
  regionId: int("regionId"),
  cityId: int("cityId"),
  districtId: int("districtId"),
  address: text("address"),
  lat: float("lat"),
  lng: float("lng"),
  photoUrls: json("photoUrls").$type<string[]>().default([]),
  videoUrls: json("videoUrls").$type<string[]>().default([]),
  assignedStaffId: int("assignedStaffId"),
  staffNote: text("staffNote"),
  aiSuggestion: text("aiSuggestion"),
  videoAiAnalysis: text("videoAiAnalysis"),
  isPublic: boolean("isPublic").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = typeof complaints.$inferInsert;

export const complaintVotes = mysqlTable("complaint_votes", {
  id: int("id").autoincrement().primaryKey(),
  complaintId: int("complaintId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const complaintComments = mysqlTable("complaint_comments", {
  id: int("id").autoincrement().primaryKey(),
  complaintId: int("complaintId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  isStaffReply: boolean("isStaffReply").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ComplaintComment = typeof complaintComments.$inferSelect;

export const trafficIncidents = mysqlTable("traffic_incidents", {
  id: int("id").autoincrement().primaryKey(),
  cityId: int("cityId"),
  regionId: int("regionId"),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  lat: float("lat").notNull(),
  lng: float("lng").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  congestionIndex: float("congestionIndex").default(0),
  status: mysqlEnum("status", ["active", "resolved"]).default("active").notNull(),
  aiSolution: text("aiSolution"),
  address: text("address"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type TrafficIncident = typeof trafficIncidents.$inferSelect;
