import { useState } from "react";
import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  FileText, CheckCircle, Clock, AlertCircle, TrendingUp,
  Map, Shield, Sparkles, ChevronRight, Trophy, Activity, Car, MapPin, Loader2
} from "lucide-react";
import {
  STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, CATEGORY_ICONS,
  DEPARTMENT_LABELS, getPriorityLevel, formatRelativeDate
} from "@/lib/utils";
import { toast } from "sonner";

const SEVERITY_COLORS: Record<string, string> = { low: "#22c55e", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
const SEVERITY_LABELS: Record<string, string> = { low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический" };

const STATUS_CHART_COLORS = {
  new: "#3b82f6",
  pending_approval: "#f59e0b",
  in_progress: "#06b6d4",
  completed: "#22c55e",
  rejected: "#ef4444",
};

const CATEGORY_COLORS = [
  "#3b82f6", "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#84cc16",
];

export default function StaffDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [regionId, setRegionId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState("overview");

  const isStaff = true; // user?.role === "staff" || user?.role === "admin";

  const regionsQuery = trpc.location.regions.useQuery();
  const citiesQuery = trpc.location.cities.useQuery(
    { regionId: regionId! },
    { enabled: !!regionId }
  );

  const analyticsQuery = trpc.analytics.overview.useQuery(
    { regionId, cityId },
    { enabled: isStaff }
  );

  const cityRankingsQuery = trpc.staff.cityRankings.useQuery(undefined, { enabled: isStaff });
  const activeProblemsQuery = trpc.staff.activeProblems.useQuery({ cityId, regionId }, { enabled: isStaff });
  const trafficQuery = trpc.traffic.list.useQuery({ cityId, regionId }, { enabled: isStaff });

  const recentQuery = trpc.complaints.list.useQuery(
    { limit: 5, offset: 0, sortBy: "date" },
    { enabled: isStaff }
  );

  const getAiSolutionMutation = trpc.traffic.getAiSolution.useMutation({
    onSuccess: () => { toast.success("AI решение получено"); trafficQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const resolveTrafficMutation = trpc.traffic.resolve.useMutation({
    onSuccess: () => { toast.success("Инцидент закрыт"); trafficQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const updateStatusMutation = trpc.complaints.updateStatus.useMutation({
    onSuccess: () => { toast.success("Статус обновлён"); activeProblemsQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  // if (!isAuthenticated) {
  //   return (
  //     <div className="min-h-screen bg-background">
  //       <NavBar />
  //       <div className="container py-16 text-center">
  //         <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
  //         <Button onClick={() => (window.location.href = getLoginUrl())}>Войти</Button>
  //       </div>
  //     </div>
  //   );
  // }

  // if (!isStaff) {
  //   return (
  //     <div className="min-h-screen bg-background">
  //       <NavBar />
  //       <div className="container py-16 text-center">
  //         <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
  //         <h2 className="text-xl font-semibold mb-2">Доступ запрещён</h2>
  //         <p className="text-muted-foreground">Эта страница доступна только сотрудникам акимата</p>
  //       </div>
  //     </div>
  //   );
  // }

  const analytics = analyticsQuery.data;
  const totalComplaints = analytics?.byStatus.reduce((sum, s) => sum + Number(s.count), 0) ?? 0;

  const statusData = analytics?.byStatus.map(s => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: Number(s.count),
    color: STATUS_CHART_COLORS[s.status as keyof typeof STATUS_CHART_COLORS] ?? "#94a3b8",
  })) ?? [];

  const categoryData = analytics?.byCategory.map((c, i) => ({
    name: `${CATEGORY_ICONS[c.category] ?? "📋"} ${CATEGORY_LABELS[c.category] ?? c.category}`,
    count: Number(c.count),
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  })) ?? [];

  const deptData = analytics?.byDepartment.map(d => ({
    name: DEPARTMENT_LABELS[d.department] ?? d.department,
    count: Number(d.count),
  })) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Панель сотрудника</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {user?.name} · {user?.role === "admin" ? "Администратор" : "Сотрудник"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/staff/map">
              <Button variant="outline" size="sm" className="gap-2">
                <Map className="h-4 w-4" />
                Карта
              </Button>
            </Link>
            <Link href="/staff/complaints">
              <Button size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Управление
              </Button>
            </Link>
          </div>
        </div>

        {/* Region/City filter */}
        <div className="flex gap-3 mb-6">
          <Select
            value={regionId?.toString() ?? "all"}
            onValueChange={v => {
              setRegionId(v === "all" ? undefined : Number(v));
              setCityId(undefined);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Все регионы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все регионы</SelectItem>
              {regionsQuery.data?.map(r => (
                <SelectItem key={r.id} value={r.id.toString()}>{r.nameRu}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {regionId && (
            <Select
              value={cityId?.toString() ?? "all"}
              onValueChange={v => setCityId(v === "all" ? undefined : Number(v))}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Все города" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все города</SelectItem>
                {citiesQuery.data?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.nameRu}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {analyticsQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            [
              { label: "Всего жалоб", value: totalComplaints, icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
              { label: "Новые", value: analytics?.byStatus.find(s => s.status === "new")?.count ?? 0, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
              { label: "В работе", value: analytics?.byStatus.find(s => s.status === "in_progress")?.count ?? 0, icon: Clock, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
              { label: "Решено", value: analytics?.byStatus.find(s => s.status === "completed")?.count ?? 0, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{Number(value)}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Status pie chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Статусы жалоб</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : statusData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Нет данных
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={70}>
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [val, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {statusData.map(s => (
                      <div key={s.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-xs text-muted-foreground">{s.name}</span>
                        <span className="text-xs font-semibold text-foreground ml-auto">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">По категориям</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : categoryData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Нет данных
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Department breakdown */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">По ведомствам</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analyticsQuery.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : deptData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет данных</p>
              ) : (
                deptData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-primary rounded-full" style={{ width: `${Math.max(20, (d.count / totalComplaints) * 100)}px` }} />
                      <span className="text-sm font-semibold text-foreground w-8 text-right">{d.count}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent complaints */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Последние жалобы</CardTitle>
              <Link href="/staff/complaints">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Все <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))
              ) : (
                recentQuery.data?.items.map(c => {
                  const priority = getPriorityLevel(c.priority);
                  return (
                    <Link key={c.id} href={`/complaints/${c.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                        <span className="text-xl">{CATEGORY_ICONS[c.category]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{formatRelativeDate(c.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>
                            {STATUS_LABELS[c.status]}
                          </Badge>
                          <Badge className={`text-xs ${priority.color}`}>
                            {priority.label}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* City Rankings */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Рейтинг городов по решению проблем
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cityRankingsQuery.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
            ) : !cityRankingsQuery.data?.length ? (
              <p className="text-center text-muted-foreground py-6">Нет данных. Подайте несколько жалоб для отображения рейтинга.</p>
            ) : (
              <div className="space-y-3">
                {cityRankingsQuery.data.map((city, idx) => (
                  <div key={city.cityId} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      idx === 0 ? "bg-amber-100 text-amber-700" :
                      idx === 1 ? "bg-slate-100 text-slate-600" :
                      idx === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{city.cityName}</p>
                      <p className="text-xs text-muted-foreground">{city.total} жалоб · {city.inProgress} в работе · {city.completed} решено</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${city.resolutionRate}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-green-600">{city.resolutionRate}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">решено</p>
                    </div>
                    {idx === 0 && <Trophy className="h-5 w-5 text-amber-500 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Problems */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Активные проблемы (в работе и новые)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeProblemsQuery.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
            ) : !activeProblemsQuery.data?.length ? (
              <p className="text-center text-muted-foreground py-6">Нет активных проблем</p>
            ) : (
              <div className="space-y-3">
                {activeProblemsQuery.data.map((complaint: any) => {
                  const { label: priorityLabel, color: priorityColor } = getPriorityLevel(complaint.priority ?? 0);
                  return (
                    <div key={complaint.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-foreground truncate">{complaint.title}</p>
                          <Badge variant="outline" className="text-xs shrink-0">{(CATEGORY_ICONS as any)[complaint.category] ?? "📋"}</Badge>
                        </div>
                        {complaint.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{complaint.address}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium ${priorityColor}`}>{priorityLabel}</span>
                          <span className="text-xs text-muted-foreground">· {complaint.supportCount ?? 0} поддержек</span>
                          <span className="text-xs text-muted-foreground">· {formatRelativeDate(complaint.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Select value={complaint.status} onValueChange={(v) => updateStatusMutation.mutate({ id: complaint.id, status: v as any })}>
                          <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["new","pending_approval","in_progress","completed","rejected"].map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s as keyof typeof STATUS_LABELS] ?? s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Link href={`/complaints/${complaint.id}`}>
                          <button className="text-xs text-primary hover:underline flex items-center gap-0.5"><ChevronRight className="h-3 w-3" />Открыть</button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traffic Incidents */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-orange-500" />
              Дорожные инциденты и пробки
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trafficQuery.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded" />)}</div>
            ) : !trafficQuery.data?.length ? (
              <p className="text-center text-muted-foreground py-6">Нет активных дорожных инцидентов</p>
            ) : (
              <div className="space-y-3">
                {trafficQuery.data.map((incident: any) => (
                  <div key={incident.id} className="p-4 rounded-lg border border-border space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-foreground">{incident.title}</p>
                          <Badge className="text-xs" style={{ background: SEVERITY_COLORS[incident.severity] ?? "#94a3b8", color: "white" }}>
                            {SEVERITY_LABELS[incident.severity] ?? incident.severity}
                          </Badge>
                        </div>
                        {incident.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{incident.address}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">Индекс загруженности:</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{
                                width: `${Math.min((Number(incident.congestionIndex) / 10) * 100, 100)}%`,
                                background: Number(incident.congestionIndex) > 7 ? "#ef4444" : Number(incident.congestionIndex) > 5 ? "#f97316" : "#f59e0b"
                              }} />
                            </div>
                            <span className="text-xs font-semibold">{Number(incident.congestionIndex ?? 0).toFixed(1)}/10</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => getAiSolutionMutation.mutate({ id: incident.id })}
                          disabled={getAiSolutionMutation.isPending}>
                          {getAiSolutionMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                          AI решение
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 hover:text-green-700"
                          onClick={() => resolveTrafficMutation.mutate({ id: incident.id })}
                          disabled={resolveTrafficMutation.isPending}>
                          <CheckCircle className="h-3 w-3 mr-1" />Закрыть
                        </Button>
                      </div>
                    </div>
                    {incident.aiSolution && (
                      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                        <p className="font-medium text-foreground mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" />AI рекомендация:</p>
                        {incident.aiSolution}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI tip */}
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">ИИ-аналитика</p>
                <p className="text-sm text-muted-foreground">
                  Для получения ИИ-рекомендаций по конкретной жалобе откройте её и нажмите "Получить совет ИИ".
                  Система проанализирует проблему и предложит конкретные шаги по решению.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
