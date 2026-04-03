import { useState, useMemo } from "react";
import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, MapPin, ThumbsUp, MessageSquare, Clock, Filter, Plus, SlidersHorizontal
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, CATEGORY_ICONS,
  DEPARTMENT_LABELS, DEPARTMENT_COLORS, getPriorityLevel, formatRelativeDate, getDaysSince
} from "@/lib/utils";
import { toast } from "sonner";

const SORT_OPTIONS = [
  { value: "date", label: "По дате" },
  { value: "priority", label: "По приоритету" },
  { value: "support", label: "По поддержкам" },
];

export default function ComplaintList() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [department, setDepartment] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"priority" | "date" | "support">("date");
  const [regionId, setRegionId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();
  const [offset, setOffset] = useState(0);
  const LIMIT = 12;

  const regionsQuery = trpc.location.regions.useQuery();
  const citiesQuery = trpc.location.cities.useQuery(
    { regionId: regionId! },
    { enabled: !!regionId }
  );

  const queryInput = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: status !== "all" ? status : undefined,
    category: category !== "all" ? category : undefined,
    department: department !== "all" ? department : undefined,
    regionId,
    cityId,
    sortBy,
    limit: LIMIT,
    offset,
  }), [debouncedSearch, status, category, department, regionId, cityId, sortBy, offset]);

  const { data, isLoading, refetch } = trpc.complaints.list.useQuery(queryInput);

  const voteMutation = trpc.complaints.vote.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Не удалось проголосовать"),
  });

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any)._searchTimer);
    (window as any)._searchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setOffset(0);
    }, 400);
  };

  const handleVote = (id: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    voteMutation.mutate({ complaintId: id });
  };

  const hasVoted = (id: number) => data?.votedIds?.includes(id) ?? false;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Жалобы граждан</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {data?.total ?? 0} обращений
            </p>
          </div>
          <Link href="/complaints/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Подать жалобу
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-border">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск жалоб..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filter row */}
              <div className="flex flex-wrap gap-2">
                <Select value={status} onValueChange={v => { setStatus(v); setOffset(0); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={category} onValueChange={v => { setCategory(v); setOffset(0); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Категория" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{CATEGORY_ICONS[k]} {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={department} onValueChange={v => { setDepartment(v); setOffset(0); }}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Ведомство" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все ведомства</SelectItem>
                    {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={regionId?.toString() ?? "all"}
                  onValueChange={v => {
                    setRegionId(v === "all" ? undefined : Number(v));
                    setCityId(undefined);
                    setOffset(0);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Регион" />
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
                    onValueChange={v => {
                      setCityId(v === "all" ? undefined : Number(v));
                      setOffset(0);
                    }}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Город" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все города</SelectItem>
                      {citiesQuery.data?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.nameRu}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
                  <SelectTrigger className="w-44">
                    <SlidersHorizontal className="h-4 w-4 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complaint cards */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <div className="text-center py-16">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Жалоб не найдено</h3>
            <p className="text-muted-foreground mb-6">Попробуйте изменить фильтры</p>
            <Link href="/complaints/new">
              <Button>Подать первую жалобу</Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.items.map(complaint => {
              const priority = getPriorityLevel(complaint.priority);
              const days = getDaysSince(complaint.createdAt);
              const voted = hasVoted(complaint.id);

              return (
                <Card
                  key={complaint.id}
                  className="group hover:shadow-md transition-all duration-200 cursor-pointer border-border"
                >
                  <CardContent className="p-5">
                    {/* Badges row */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge className={`text-xs ${STATUS_COLORS[complaint.status]}`}>
                        {STATUS_LABELS[complaint.status]}
                      </Badge>
                      <Badge className={`text-xs ${DEPARTMENT_COLORS[complaint.department]}`}>
                        {DEPARTMENT_LABELS[complaint.department]}
                      </Badge>
                      <Badge className={`text-xs ${priority.color}`}>
                        {priority.label}
                      </Badge>
                    </div>

                    {/* Title */}
                    <Link href={`/complaints/${complaint.id}`}>
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {CATEGORY_ICONS[complaint.category]} {complaint.title}
                      </h3>
                    </Link>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {complaint.description}
                    </p>

                    {/* Location */}
                    {complaint.address && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{complaint.address}</span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleVote(complaint.id)}
                          className={`flex items-center gap-1 text-sm transition-colors ${
                            voted
                              ? "text-primary font-semibold"
                              : "text-muted-foreground hover:text-primary"
                          }`}
                        >
                          <ThumbsUp className={`h-4 w-4 ${voted ? "fill-current" : ""}`} />
                          {complaint.supportCount}
                        </button>
                        <Link
                          href={`/complaints/${complaint.id}`}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Комментарии
                        </Link>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {days === 0 ? "Сегодня" : `${days} дн.`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {data && data.total > LIMIT && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            >
              Назад
            </Button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">
              {Math.floor(offset / LIMIT) + 1} / {Math.ceil(data.total / LIMIT)}
            </span>
            <Button
              variant="outline"
              disabled={offset + LIMIT >= data.total}
              onClick={() => setOffset(offset + LIMIT)}
            >
              Вперёд
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
