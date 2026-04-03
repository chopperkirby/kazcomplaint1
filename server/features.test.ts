import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Context helpers ──────────────────────────────────────────────────────────
function createGuestContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "test-user-openid",
      email: "user@test.kz",
      name: "Test User",
      loginMethod: "email",
      role: "user",
      passwordHash: null,
      department: null,
      regionId: null,
      cityId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return createUserContext({ id: 1, role: "admin", openId: "admin-openid" });
}

function createStaffContext(): TrpcContext {
  return createUserContext({ id: 3, role: "staff", openId: "staff-openid" });
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user data for authenticated users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("user@test.kz");
    expect(result?.role).toBe("user");
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      expect.objectContaining({ maxAge: -1, httpOnly: true })
    );
  });
});

// ─── Location tests ───────────────────────────────────────────────────────────
describe("location.regions", () => {
  it("returns regions list (public endpoint)", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const regions = await caller.location.regions();
    // Should return an array (may be empty if DB not seeded in test env)
    expect(Array.isArray(regions)).toBe(true);
  });
});

// ─── Complaints access control tests ─────────────────────────────────────────
describe("complaints.updateStatus", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.complaints.updateStatus({ id: 1, status: "in_progress" })
    ).rejects.toThrow();
  });

  it("throws FORBIDDEN for regular users (not staff/admin)", async () => {
    const ctx = createUserContext({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.complaints.updateStatus({ id: 1, status: "in_progress" })
    ).rejects.toThrow();
  });
});

// ─── Staff endpoints access control ──────────────────────────────────────────
describe("staff.cityRankings", () => {
  it("throws for unauthenticated users", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.cityRankings()).rejects.toThrow();
  });

  it("throws FORBIDDEN for regular users", async () => {
    const ctx = createUserContext({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.cityRankings()).rejects.toThrow();
  });

  it("resolves for staff users", async () => {
    const ctx = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.cityRankings();
    expect(Array.isArray(result)).toBe(true);
  });

  it("resolves for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.cityRankings();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("staff.activeProblems", () => {
  it("throws for unauthenticated users", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.activeProblems({})).rejects.toThrow();
  });

  it("resolves for staff users", async () => {
    const ctx = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.activeProblems({});
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Traffic endpoints ────────────────────────────────────────────────────────
describe("traffic.list", () => {
  it("is publicly accessible", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.traffic.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("traffic.create", () => {
  it("throws FORBIDDEN for regular users", async () => {
    const ctx = createUserContext({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.traffic.create({
        title: "Test jam",
        lat: 51.18,
        lng: 71.45,
        severity: "medium",
      })
    ).rejects.toThrow();
  });
});

describe("traffic.resolve", () => {
  it("throws for unauthenticated users", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.traffic.resolve({ id: 999 })).rejects.toThrow();
  });
});

// ─── Analytics ────────────────────────────────────────────────────────────────
describe("analytics.overview", () => {
  it("throws for unauthenticated users", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.analytics.overview({})).rejects.toThrow();
  });

  it("resolves for staff users and returns expected shape", async () => {
    const ctx = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analytics.overview({});
    expect(result).toHaveProperty("byStatus");
    expect(result).toHaveProperty("byCategory");
    expect(result).toHaveProperty("byDepartment");
    expect(Array.isArray(result.byStatus)).toBe(true);
    expect(Array.isArray(result.byCategory)).toBe(true);
  });
});
