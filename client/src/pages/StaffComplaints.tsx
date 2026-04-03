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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Search, ThumbsUp, Clock, Calendar, Shield, Sparkles,
  ChevronLeft, SlidersHorizontal, MapPin
} from "lucide-react";
import {
  STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, CATEGORY_ICONS,
  DEPARTMENT_LABELS, DEPARTMENT_COLORS, getPriorityLevel,
  formatDate, getDaysSince
} from "@/lib/utils";

const STATUSES = Object.entries(STATUS_LABELS);

export default function StaffComplaints() {
  const { user, isAuthenticated } = useAuth();
  const isStaff = user?.role === "staff" || user?.role === "admin";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [department, setDepartment] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"priority" | "date" | "support">("priority");
  const [offset, setOffset] = useState(0);
  const LIMIT = 15;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  const queryInput = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: status !== "all" ? status : undefined,
    department: department !== "all" ? department : undefined,
    sortBy,
    limit: LIMIT,
    offset,
  }), [debouncedSearch, status, department, sortBy, offset]);

  const { data, isLoading, refetch } = trpc.complaints.list.useQuery(queryInput);

  const updateStatusMutation = trpc.complaints.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Статус обновлён");
      setDialogOpen(false);
      refetch();
    },
    onError: (e: any) => toast.error(e.message || "Ошибка обновления"),
  });

  const aiMutation = trpc.complaints.getAiSuggestion.useMutation({
    onSuccess: (data) => {
      toast.success("ИИ-рекомендация получена");
      refetch();
    },
    onError: () => toast.error("Не удалось получить рекомендацию"),
  });

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any)._searchTimer2);
    (window as any)._searchTimer2 = setTimeout(() => {
      setDebouncedSearch(val);
      setOffset(0);
    }, 400);
  };

  const openStatusDialog = (id: number, currentStatus: string) => {
    setSelectedId(id);
    setNewStatus(currentStatus);
    setStaffNote("");
    setDialogOpen(true);
  };

  if (!isAuthenticated || !isStaff) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="container py-16 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Доступ запрещён</h2>
          <p className="text-muted-foreground">Только для сотрудников акимата</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/staff" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Управление жалобами</h1>
            <p className="text-sm text-muted-foreground">{data?.total ?? 0} обращений</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск жалоб..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={status} onValueChange={v => { setStatus(v); setOffset(0); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {STATUSES.map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={department} onValueChange={v => { setDepartment(v); setOffset(0); }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Ведомство" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все ведомства</SelectItem>
                  {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
                <SelectTrigger className="w-44">
                  <SlidersHorizontal className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">По приоритету</SelectItem>
                  <SelectItem value="date">По дате</SelectItem>
                  <SelectItem value="support">По поддержкам</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table-like list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Жалоб не найдено
          </div>
        ) : (
          <div className="space-y-3">
            {data?.items.map(complaint => {
              const priority = getPriorityLevel(complaint.priority);
              const days = getDaysSince(complaint.createdAt);

              return (
                <Card key={complaint.id} className="border-border hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <span className="text-2xl shrink-0 mt-1">{CATEGORY_ICONS[complaint.category]}</span>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          <Badge className={`text-xs ${STATUS_COLORS[complaint.status]}`}>
                            {STATUS_LABELS[complaint.status]}
                          </Badge>
                          <Badge className={`text-xs ${DEPARTMENT_COLORS[complaint.department]}`}>
                            {DEPARTMENT_LABELS[complaint.department]}
                          </Badge>
                          <Badge className={`text-xs ${priority.color}`}>
                            🔥 {priority.label} · {complaint.priority.toFixed(0)}
                          </Badge>
                        </div>

                        <Link href={`/complaints/${complaint.id}`}>
                          <h3 className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer mb-1">
                            #{complaint.id} — {complaint.title}
                          </h3>
                        </Link>

                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {complaint.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(complaint.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {days} дн. назад
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {complaint.supportCount} поддержек
                          </span>
                          {complaint.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{complaint.address}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openStatusDialog(complaint.id, complaint.status)}
                        >
                          Изменить статус
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          onClick={() => aiMutation.mutate({ id: complaint.id })}
                          disabled={aiMutation.isPending}
                        >
                          <Sparkles className="h-3 w-3" />
                          {aiMutation.isPending ? "..." : "ИИ-совет"}
                        </Button>
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
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
              Назад
            </Button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">
              {Math.floor(offset / LIMIT) + 1} / {Math.ceil(data.total / LIMIT)}
            </span>
            <Button variant="outline" disabled={offset + LIMIT >= data.total} onClick={() => setOffset(offset + LIMIT)}>
              Вперёд
            </Button>
          </div>
        )}
      </div>

      {/* Status update dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить статус жалобы #{selectedId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Новый статус</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Комментарий сотрудника (необязательно)</Label>
              <Textarea
                placeholder="Опишите принятые меры или причину изменения статуса..."
                value={staffNote}
                onChange={e => setStaffNote(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={() => {
                if (selectedId && newStatus) {
                  updateStatusMutation.mutate({
                    id: selectedId,
                    status: newStatus as any,
                    staffNote: staffNote || undefined,
                  });
                }
              }}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
