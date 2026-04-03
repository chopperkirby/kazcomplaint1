import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  Plus, FileText, CheckCircle, Clock, AlertCircle,
  ThumbsUp, MapPin, Calendar
} from "lucide-react";
import {
  STATUS_LABELS, STATUS_COLORS, CATEGORY_ICONS, CATEGORY_LABELS,
  DEPARTMENT_LABELS, DEPARTMENT_COLORS, getPriorityLevel,
  formatDate, getDaysSince
} from "@/lib/utils";

export default function CitizenDashboard() {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading } = trpc.complaints.myComplaints.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="container py-16 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Требуется авторизация</h2>
          <Button onClick={() => (window.location.href = getLoginUrl())}>Войти</Button>
        </div>
      </div>
    );
  }

  const complaints = data?.items ?? [];
  const stats = {
    total: complaints.length,
    new: complaints.filter(c => c.status === "new").length,
    inProgress: complaints.filter(c => c.status === "in_progress").length,
    completed: complaints.filter(c => c.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Мои жалобы
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Добро пожаловать, {user?.name ?? "Гражданин"}
            </p>
          </div>
          <Link href="/complaints/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Новая жалоба
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Всего", value: stats.total, icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Новые", value: stats.new, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "В работе", value: stats.inProgress, icon: Clock, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
            { label: "Решено", value: stats.completed, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Complaints list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">История обращений</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : complaints.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Жалоб пока нет</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Подайте первую жалобу, чтобы сделать ваш город лучше
                </p>
                <Link href="/complaints/new">
                  <Button size="sm">Подать жалобу</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.map(complaint => {
                  const priority = getPriorityLevel(complaint.priority);
                  const days = getDaysSince(complaint.createdAt);

                  return (
                    <Link key={complaint.id} href={`/complaints/${complaint.id}`}>
                      <div className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="text-2xl shrink-0">
                          {CATEGORY_ICONS[complaint.category]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            <Badge className={`text-xs ${STATUS_COLORS[complaint.status]}`}>
                              {STATUS_LABELS[complaint.status]}
                            </Badge>
                            <Badge className={`text-xs ${DEPARTMENT_COLORS[complaint.department]}`}>
                              {DEPARTMENT_LABELS[complaint.department]}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-foreground truncate">{complaint.title}</h3>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(complaint.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {days} дн.
                            </span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              {complaint.supportCount}
                            </span>
                          </div>
                        </div>
                        <Badge className={`text-xs shrink-0 ${priority.color}`}>
                          {priority.label}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
