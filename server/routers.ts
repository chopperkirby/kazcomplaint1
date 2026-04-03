import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS } from "@shared/const";
import {
  addComment,
  createComplaint,
  createTrafficIncident,
  createUserWithPassword,
  getActiveProblems,
  getAnalytics,
  getCitiesByRegion,
  getAllCities,
  getCityRankings,
  getComplaints,
  getComplaintById,
  getDistrictsByCity,
  getMapData,
  getRegions,
  getTrafficIncidents,
  getUserByEmail,
  getUserVotes,
  resolveTrafficIncident,
  seedKazakhstanData,
  updateComplaintAiSuggestion,
  updateComplaintStatus,
  updateComplaintVideoAnalysis,
  updateTrafficAiSolution,
  voteComplaint,
} from "./db";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";

// ─── Staff guard ──────────────────────────────────────────────────────────────
const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "staff" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff only" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Email/password registration
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(2).max(100),
          email: z.string().email(),
          password: z.string().min(6).max(128),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Пользователь с таким email уже существует",
          });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        const { openId } = await createUserWithPassword({
          name: input.name,
          email: input.email,
          passwordHash,
        });
        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.name,
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true };
      }),

    // Email/password login
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Неверный email или пароль",
          });
        }
        if (!user.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Этот аккаунт использует другой способ входа",
          });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Неверный пароль",
          });
        }
        // Update last sign in
        const db = await getDb();
        if (db) {
          await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
        }
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true };
      }),
  }),

  // ─── Location ─────────────────────────────────────────────────────────────
  location: router({
    regions: publicProcedure.query(() => getRegions()),
    cities: publicProcedure
      .input(z.object({ regionId: z.number() }))
      .query(({ input }) => getCitiesByRegion(input.regionId)),
    allCities: publicProcedure.query(() => getAllCities()),
    districts: publicProcedure
      .input(z.object({ cityId: z.number() }))
      .query(({ input }) => getDistrictsByCity(input.cityId)),
    seed: publicProcedure.mutation(() => seedKazakhstanData()),
  }),

  // ─── Complaints ───────────────────────────────────────────────────────────
  complaints: router({
    list: publicProcedure
      .input(
        z.object({
          search: z.string().optional(),
          status: z.string().optional(),
          category: z.string().optional(),
          department: z.string().optional(),
          regionId: z.number().optional(),
          cityId: z.number().optional(),
          districtId: z.number().optional(),
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
          sortBy: z.enum(["priority", "date", "support"]).default("date"),
        })
      )
      .query(async ({ input, ctx }) => {
        const result = await getComplaints(input);
        let votedIds: number[] = [];
        if (ctx.user) {
          votedIds = await getUserVotes(
            ctx.user.id,
            result.items.map((c) => c.id)
          );
        }
        return { ...result, votedIds };
      }),

    myComplaints: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(({ input, ctx }) =>
        getComplaints({ userId: ctx.user.id, limit: input.limit, offset: input.offset })
      ),

    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const complaint = await getComplaintById(input.id);
        if (!complaint) throw new TRPCError({ code: "NOT_FOUND" });
        let hasVoted = false;
        if (ctx.user) {
          const votes = await getUserVotes(ctx.user.id, [input.id]);
          hasVoted = votes.includes(input.id);
        }
        return { ...complaint, hasVoted };
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(5).max(256),
          description: z.string().min(10),
          category: z.enum([
            "roads", "utilities", "housing", "public_transport",
            "parks", "lighting", "waste", "safety", "noise",
            "water", "heating", "traffic", "other",
          ]),
          department: z.enum(["akimat", "city_management", "gov_services"]),
          regionId: z.number().optional(),
          cityId: z.number().optional(),
          districtId: z.number().optional(),
          address: z.string().optional(),
          lat: z.number().optional(),
          lng: z.number().optional(),
          photoUrls: z.array(z.string()).default([]),
          videoUrls: z.array(z.string()).default([]),
        })
      )
      .mutation(({ input, ctx }) =>
        createComplaint({ ...input, userId: ctx.user.id })
      ),

    vote: protectedProcedure
      .input(z.object({ complaintId: z.number() }))
      .mutation(({ input, ctx }) => voteComplaint(input.complaintId, ctx.user.id)),

    updateStatus: staffProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["new", "pending_approval", "in_progress", "completed", "rejected"]),
          staffNote: z.string().optional(),
        })
      )
      .mutation(({ input, ctx }) =>
        updateComplaintStatus(input.id, input.status, input.staffNote, ctx.user.id)
      ),

    uploadPhoto: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          contentType: z.string(),
          base64: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const ext = input.fileName.split(".").pop() ?? "jpg";
        const key = `complaints/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const buffer = Buffer.from(input.base64, "base64");
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url };
      }),

    uploadVideo: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          contentType: z.string(),
          base64: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const ext = input.fileName.split(".").pop() ?? "mp4";
        const key = `complaints/videos/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const buffer = Buffer.from(input.base64, "base64");
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url };
      }),

    analyzeVideo: staffProcedure
      .input(z.object({ id: z.number(), videoUrl: z.string() }))
      .mutation(async ({ input }) => {
        const complaint = await getComplaintById(input.id);
        if (!complaint) throw new TRPCError({ code: "NOT_FOUND" });
        const prompt = `Ты — эксперт по городскому управлению Казахстана. Проанализируй видеозапись жалобы гражданина.
Жалоба: "${complaint.title}"
Описание: "${complaint.description}"
Категория: ${complaint.category}
URL видео: ${input.videoUrl}

Дай:
1. Краткое описание проблемы, видимой на видео (2-3 предложения)
2. Оценку серьёзности проблемы (1-10)
3. Рекомендации по устранению (3-5 шагов)
4. Ответственный отдел
Отвечай на русском языке.`;
        const response = await invokeLLM({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "file_url",
                  file_url: { url: input.videoUrl, mime_type: "video/mp4" },
                },
              ],
            },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const analysis = typeof rawContent === "string" ? rawContent : "Не удалось проанализировать видео.";
        await updateComplaintVideoAnalysis(input.id, analysis);
        return { analysis };
      }),

    getAiSuggestion: staffProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const complaint = await getComplaintById(input.id);
        if (!complaint) throw new TRPCError({ code: "NOT_FOUND" });
        const prompt = `Ты — советник акимата Казахстана. Проанализируй следующую жалобу гражданина и дай конкретные рекомендации по её решению.
Жалоба: "${complaint.title}"
Описание: "${complaint.description}"
Категория: ${complaint.category}
Отдел: ${complaint.department}
Количество поддержок: ${complaint.supportCount}
Приоритет: ${complaint.priority}
Дай:
1. Краткий анализ проблемы (2-3 предложения)
2. Конкретные шаги по решению (3-5 шагов)
3. Рекомендуемые сроки
4. Какой отдел должен заниматься этим
Отвечай на русском языке, кратко и по делу.`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Ты — эксперт по городскому управлению и решению проблем ЖКХ в Казахстане." },
            { role: "user", content: prompt },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const suggestion = typeof rawContent === "string" ? rawContent : "Не удалось получить рекомендацию.";
        await updateComplaintAiSuggestion(input.id, suggestion);
        return { suggestion };
      }),

    mapData: publicProcedure
      .input(z.object({ regionId: z.number().optional(), cityId: z.number().optional() }))
      .query(({ input }) => getMapData(input.cityId)),
  }),

  // ─── Comments ─────────────────────────────────────────────────────────────
  comments: router({
    list: publicProcedure
      .input(z.object({ complaintId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { complaintComments, users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        return db
          .select({
            id: complaintComments.id,
            content: complaintComments.content,
            isStaffReply: complaintComments.isStaffReply,
            createdAt: complaintComments.createdAt,
            userId: complaintComments.userId,
            userName: users.name,
            userRole: users.role,
          })
          .from(complaintComments)
          .leftJoin(users, eq(complaintComments.userId, users.id))
          .where(eq(complaintComments.complaintId, input.complaintId))
          .orderBy(complaintComments.createdAt);
      }),

    add: protectedProcedure
      .input(z.object({ complaintId: z.number(), content: z.string().min(1).max(1000) }))
      .mutation(({ input, ctx }) =>
        addComment({
          complaintId: input.complaintId,
          userId: ctx.user.id,
          content: input.content,
          isStaffReply: ctx.user.role === "staff" || ctx.user.role === "admin",
        })
      ),
  }),

  // ─── Map & Analytics ──────────────────────────────────────────────────────
  map: router({
    data: publicProcedure
      .input(z.object({ cityId: z.number().optional() }))
      .query(({ input }) => getMapData(input.cityId)),
  }),

  analytics: router({
    overview: staffProcedure
      .input(z.object({ regionId: z.number().optional(), cityId: z.number().optional() }))
      .query(({ input }) => getAnalytics(input)),
  }),

  // ─── Staff management ─────────────────────────────────────────────────────
  staff: router({
    updateProfile: protectedProcedure
      .input(
        z.object({
          department: z.enum(["akimat", "city_management", "gov_services"]).optional(),
          regionId: z.number().optional(),
          cityId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(users).set(input as any).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),

    cityRankings: staffProcedure.query(() => getCityRankings()),

    activeProblems: staffProcedure
      .input(z.object({ cityId: z.number().optional(), regionId: z.number().optional() }))
      .query(({ input }) => getActiveProblems(input)),
  }),

  // ─── Traffic ──────────────────────────────────────────────────────────────
  traffic: router({
    list: publicProcedure
      .input(z.object({ cityId: z.number().optional(), regionId: z.number().optional() }))
      .query(({ input }) => getTrafficIncidents(input)),

    create: staffProcedure
      .input(
        z.object({
          cityId: z.number().optional(),
          regionId: z.number().optional(),
          title: z.string().min(3).max(256),
          description: z.string().optional(),
          lat: z.number(),
          lng: z.number(),
          severity: z.enum(["low", "medium", "high", "critical"]),
          congestionIndex: z.number().min(0).max(10).optional(),
          address: z.string().optional(),
        })
      )
      .mutation(({ input }) => createTrafficIncident(input)),

    resolve: staffProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => resolveTrafficIncident(input.id)),

    getAiSolution: staffProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const incidents = await getTrafficIncidents({});
        const incident = incidents.find((i) => i.id === input.id);
        if (!incident) throw new TRPCError({ code: "NOT_FOUND" });
        const prompt = `Ты — эксперт по дорожному движению Казахстана. Проанализируй дорожную ситуацию:
Место: ${incident.address || `${incident.lat}, ${incident.lng}`}
Описание: ${incident.title}
${incident.description ? `Детали: ${incident.description}` : ""}
Индекс загруженности: ${incident.congestionIndex}/10
Критичность: ${incident.severity}

Дай:
1. Анализ причин пробки (2-3 предложения)
2. Немедленные меры (2-3 шага)
3. Долгосрочные решения (2-3 шага)
4. Рекомендуемый объезд
Отвечай на русском языке.`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Ты — эксперт по дорожному движению и городской инфраструктуре Казахстана." },
            { role: "user", content: prompt },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const solution = typeof rawContent === "string" ? rawContent : "Не удалось получить решение.";
        await updateTrafficAiSolution(input.id, solution);
        return { solution };
      }),
  }),
});

export type AppRouter = typeof appRouter;
