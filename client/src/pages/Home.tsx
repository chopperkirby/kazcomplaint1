import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NavBar from "@/components/NavBar";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  MapPin,
  FileText,
  TrendingUp,
  Shield,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Building2,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";

// Kazakhstan-specific hero images - real urban problems and city views
const HERO_IMAGES = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663511774827/UzWWTJ8rjS2n4j9RpH6CkH/astana-city_a31e3477.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663511774827/UzWWTJ8rjS2n4j9RpH6CkH/almaty-hero_40d2d8bf.jpg",
  "https://images.unsplash.com/photo-1606890737066-511b1b27c5dd?w=1400&q=80",
  "https://images.unsplash.com/photo-1577720643272-265f434b4b0f?w=1400&q=80",
  "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1400&q=80",
];

const FEATURES = [
  {
    icon: MapPin,
    title: "Интерактивная карта",
    desc: "Видите все проблемы вашего района на карте в реальном времени",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    icon: TrendingUp,
    title: "Приоритизация",
    desc: "Математический алгоритм — чем больше поддержек, тем выше приоритет",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    icon: Shield,
    title: "Прозрачность",
    desc: "Отслеживайте статус жалобы от подачи до решения",
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
  {
    icon: Zap,
    title: "ИИ-аналитика",
    desc: "Искусственный интеллект помогает сотрудникам акимата находить решения",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Зарегистрируйтесь", desc: "Войдите через безопасную систему авторизации" },
  { step: "02", title: "Опишите проблему", desc: "Укажите место, категорию и прикрепите фото" },
  { step: "03", title: "Поддержите жалобы", desc: "Голосуйте за важные проблемы вашего района" },
  { step: "04", title: "Следите за решением", desc: "Получайте обновления статуса в реальном времени" },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const seedMutation = trpc.location.seed.useMutation();
  const [heroImage, setHeroImage] = useState(HERO_IMAGES[0]);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    seedMutation.mutate();
  }, []);

  // Rotate hero images every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndex(prev => (prev + 1) % HERO_IMAGES.length);
      setHeroImage(HERO_IMAGES[(imageIndex + 1) % HERO_IMAGES.length]);
    }, 8000);
    return () => clearInterval(interval);
  }, [imageIndex]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      {/* Hero Section with Dynamic Images */}
      <section className="relative overflow-hidden h-screen flex items-center">
        {/* Background image with blur and darken */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
        
        {/* Blur effect */}
        <div className="absolute inset-0 backdrop-blur-sm" />
        
        {/* Lightened overlay for better visibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/45 to-black/30" />

        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.25)_100%)]" />

        {/* Content */}
        <div className="relative container py-24 md:py-32 z-10">
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-amber-500/20 text-amber-300 border-amber-500/30 text-sm animate-pulse">
              🇰🇿 Официальная платформа Казахстана
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
              Ваш голос —<br />
              <span className="text-amber-400">сила перемен</span>
            </h1>
            <p className="text-lg text-white/90 mb-8 leading-relaxed drop-shadow-md">
              Прозрачная платформа для подачи жалоб и обращений в акимат.
              Сообщайте о проблемах вашего города, поддерживайте важные обращения
              и следите за их решением.
            </p>
            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link href="/complaints/new">
                  <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2 shadow-lg">
                    <FileText className="h-5 w-5" />
                    Подать жалобу
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2 shadow-lg"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  <Users className="h-5 w-5" />
                  Начать
                </Button>
              )}
              <Link href="/complaints">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/50 text-white hover:bg-white/20 gap-2 shadow-lg"
                >
                  Смотреть жалобы
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Image indicator dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setImageIndex(i);
                setHeroImage(HERO_IMAGES[i]);
              }}
              className={`h-2 rounded-full transition-all ${
                i === imageIndex ? "bg-amber-400 w-8" : "bg-white/40 w-2 hover:bg-white/60"
              }`}
              aria-label={`Image ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: FileText, value: "20 регионов", label: "Казахстана" },
              { icon: Building2, value: "3 ведомства", label: "Акимат, Управление, Госуслуги" },
              { icon: CheckCircle, value: "Открытость", label: "Прозрачный статус" },
              { icon: Clock, value: "24/7", label: "Доступность" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon className="h-5 w-5 opacity-70 mb-1" />
                <span className="text-xl font-bold">{value}</span>
                <span className="text-sm opacity-70">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Почему KazComplaint?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Полнофункциональная платформа для прозрачного взаимодействия граждан и органов власти
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <Card key={title} className="border-border hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Как это работает</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Четыре простых шага для решения проблем вашего города
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc }, idx) => (
              <div key={step} className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                      {step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-6 -right-3 w-6 h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Готовы начать?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Присоединяйтесь к тысячам граждан, которые уже используют KazComplaint
            для улучшения своих городов
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {isAuthenticated ? (
              <Link href="/complaints/new">
                <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2">
                  <FileText className="h-5 w-5" />
                  Подать жалобу
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 gap-2"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                <Users className="h-5 w-5" />
                Зарегистрироваться
              </Button>
            )}
            <Link href="/complaints">
              <Button size="lg" variant="outline" className="gap-2">
                Смотреть жалобы
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-foreground mb-3">KazComplaint</h3>
              <p className="text-sm text-muted-foreground">
                Прозрачная платформа для подачи жалоб граждан Казахстана
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">Ссылки</h3>
              <ul className="space-y-1 text-sm">
                <li><Link href="/complaints" className="text-muted-foreground hover:text-foreground">Жалобы</Link></li>
                <li><Link href="/map" className="text-muted-foreground hover:text-foreground">Карта</Link></li>
                {isAuthenticated && <li><Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Мой профиль</Link></li>}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">Контакты</h3>
              <p className="text-sm text-muted-foreground">
                support@kazcomplaint.kz<br />
                +7 (7) 2XX-XX-XX
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 KazComplaint. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
