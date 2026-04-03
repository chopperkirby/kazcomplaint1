import { useState } from "react";
import { useRoute } from "wouter";
import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ThumbsUp, MapPin, Clock, Calendar, MessageSquare,
  ChevronLeft, Shield, Sparkles, AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, CATEGORY_ICONS,
  DEPARTMENT_LABELS, DEPARTMENT_COLORS, getPriorityLevel,
  formatDate, formatRelativeDate, getDaysSince
} from "@/lib/utils";
import { toast } from "sonner";

export default function ComplaintDetail() {
  const [, params] = useRoute("/complaints/:id");
  const id = Number(params?.id);
  const { user, isAuthenticated } = useAuth();
  const [comment, setComment] = useState("");

  const utils = trpc.useUtils();

  const { data: complaint, isLoading } = trpc.complaints.byId.useQuery(
    { id },
    { enabled: !!id }
  );

  const { data: comments, refetch: refetchComments } = trpc.comments.list.useQuery(
    { complaintId: id },
    { enabled: !!id }
  );

  const voteMutation = trpc.complaints.vote.useMutation({
    onSuccess: () => utils.complaints.byId.invalidate({ id }),
    onError: () => toast.error("Ошибка при голосовании"),
  });

  const commentMutation = trpc.comments.add.useMutation({
    onSuccess: () => {
      setComment("");
      refetchComments();
      toast.success("Комментарий добавлен");
    },
    onError: () => toast.error("Не удалось добавить комментарий"),
  });

  const aiMutation = trpc.complaints.getAiSuggestion.useMutation({
    onSuccess: () => {
      utils.complaints.byId.invalidate({ id });
      toast.success("ИИ-рекомендация получена");
    },
    onError: () => toast.error("Не удалось получить рекомендацию"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="container py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="container py-16 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Жалоба не найдена</h2>
          <Link href="/complaints">
            <Button className="mt-4">Вернуться к списку</Button>
          </Link>
        </div>
      </div>
    );
  }

  const priority = getPriorityLevel(complaint.priority);
  const days = getDaysSince(complaint.createdAt);
  const isStaff = user?.role === "staff" || user?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="container py-8 max-w-4xl">
        {/* Back */}
        <Link href="/complaints" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Все жалобы
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title card */}
            <Card>
              <CardContent className="p-6">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={`${STATUS_COLORS[complaint.status]}`}>
                    {STATUS_LABELS[complaint.status]}
                  </Badge>
                  <Badge className={`${DEPARTMENT_COLORS[complaint.department]}`}>
                    {DEPARTMENT_LABELS[complaint.department]}
                  </Badge>
                  <Badge className={priority.color}>
                    {priority.label} приоритет
                  </Badge>
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-3">
                  {CATEGORY_ICONS[complaint.category]} {complaint.title}
                </h1>

                <p className="text-muted-foreground leading-relaxed mb-4">
                  {complaint.description}
                </p>

                {/* Location */}
                {complaint.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{complaint.address}</span>
                  </div>
                )}

                {/* Photos */}
                {complaint.photoUrls && Array.isArray(complaint.photoUrls) && complaint.photoUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {(complaint.photoUrls as string[]).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Фото ${i + 1}`}
                        className="rounded-lg w-full h-40 object-cover"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Staff note */}
            {complaint.staffNote && (
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      Ответ сотрудника акимата
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{complaint.staffNote}</p>
                </CardContent>
              </Card>
            )}

            {/* AI Suggestion */}
            {complaint.aiSuggestion && (
              <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      ИИ-рекомендация по решению
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-line">{complaint.aiSuggestion}</p>
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Комментарии ({comments?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments?.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={`text-xs ${c.isStaffReply ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-muted text-muted-foreground"}`}>
                        {c.isStaffReply ? "🏛️" : (c.userName?.charAt(0) ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {c.isStaffReply ? "Сотрудник акимата" : (c.userName ?? "Гражданин")}
                        </span>
                        {c.isStaffReply && (
                          <Badge variant="secondary" className="text-xs">Официально</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{c.content}</p>
                    </div>
                  </div>
                ))}

                {comments?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Пока нет комментариев
                  </p>
                )}

                <Separator />

                {/* Add comment */}
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Написать комментарий..."
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={() => commentMutation.mutate({ complaintId: id, content: comment })}
                      disabled={!comment.trim() || commentMutation.isPending}
                    >
                      {commentMutation.isPending ? "Отправка..." : "Отправить"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (window.location.href = getLoginUrl())}
                  >
                    Войдите, чтобы комментировать
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Vote */}
            <Card>
              <CardContent className="p-5 text-center">
                <div className="text-4xl font-bold text-foreground mb-1">
                  {complaint.supportCount}
                </div>
                <p className="text-sm text-muted-foreground mb-4">поддержок</p>
                <Button
                  className={`w-full gap-2 ${complaint.hasVoted ? "bg-primary/20 text-primary hover:bg-primary/30" : ""}`}
                  variant={complaint.hasVoted ? "secondary" : "default"}
                  onClick={() => {
                    if (!isAuthenticated) {
                      window.location.href = getLoginUrl();
                      return;
                    }
                    voteMutation.mutate({ complaintId: id });
                  }}
                  disabled={voteMutation.isPending}
                >
                  <ThumbsUp className={`h-4 w-4 ${complaint.hasVoted ? "fill-current" : ""}`} />
                  {complaint.hasVoted ? "Вы поддержали" : "Поддержать"}
                </Button>

                {/* Priority bar */}
                <div className="mt-4 text-left">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Приоритет</span>
                    <span>{complaint.priority.toFixed(0)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, (complaint.priority / 500) * 100)}%` }}
                    />
                  </div>
                  {complaint.supportCount >= 50 && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      🔥 Критический уровень поддержки!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Подана</p>
                    <p className="font-medium text-foreground">{formatDate(complaint.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Дней с подачи</p>
                    <p className="font-medium text-foreground">{days} {days === 1 ? "день" : days < 5 ? "дня" : "дней"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Категория</p>
                    <p className="font-medium text-foreground">
                      {CATEGORY_ICONS[complaint.category]} {CATEGORY_LABELS[complaint.category]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Staff actions */}
            {isStaff && (
              <Card className="border-purple-200 dark:border-purple-800">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    ИИ-рекомендация
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => aiMutation.mutate({ id })}
                    disabled={aiMutation.isPending}
                  >
                    {aiMutation.isPending ? "Анализирую..." : "Получить совет ИИ"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
