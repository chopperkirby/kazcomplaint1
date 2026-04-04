import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, LogIn, UserPlus, Building2, ShieldCheck } from "lucide-react";

// Baiterek monument image
const BAITEREK_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Baiterek_tower.jpg/800px-Baiterek_tower.jpg";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPwd, setLoginShowPwd] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regShowPwd, setRegShowPwd] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Добро пожаловать!");
      window.location.href = "/";
    },
    onError: (err) => {
      toast.error(err.message || "Ошибка входа");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Аккаунт создан! Добро пожаловать!");
      window.location.href = "/";
    },
    onError: (err) => {
      toast.error(err.message || "Ошибка регистрации");
    },
  });

  if (isAuthenticated) {
    window.location.href = "/";
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Заполните все поля");
      return;
    }
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      toast.error("Заполните все поля");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Пароль должен содержать минимум 6 символов");
      return;
    }
    registerMutation.mutate({ name: regName, email: regEmail, password: regPassword });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Baiterek background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${BAITEREK_URL})` }}
      />
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-slate-900/65 to-blue-800/70" />
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.3)_100%)]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white drop-shadow-lg">KazComplaint</div>
              <div className="text-sm text-white/80">Платформа гражданских обращений</div>
            </div>
          </Link>
        </div>

        <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-center text-xl">
              {tab === "login" ? "Вход в систему" : "Регистрация"}
            </CardTitle>
            <CardDescription className="text-white/70 text-center text-sm">
              {tab === "login"
                ? "Войдите чтобы подать жалобу"
                : "Создайте аккаунт для подачи обращений"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
              <TabsList className="w-full bg-white/10 border border-white/20 mb-4">
                <TabsTrigger
                  value="login"
                  className="flex-1 text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white"
                >
                  <LogIn className="h-4 w-4 mr-1.5" />
                  Войти
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="flex-1 text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Регистрация
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/90 text-sm">Email</Label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:bg-white/15"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/90 text-sm">Пароль</Label>
                    <div className="relative">
                      <Input
                        type={loginShowPwd ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:bg-white/15 pr-10"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setLoginShowPwd(!loginShowPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                      >
                        {loginShowPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error display */}
                  {loginMutation.error && (
                    <div className="bg-red-500/20 border border-red-400/40 rounded-lg px-3 py-2 text-red-200 text-sm">
                      {loginMutation.error.message}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Вход..." : "Войти"}
                  </Button>
                </form>

                <div className="mt-4 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-transparent px-2 text-white/50">или</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  Войти через Manus
                </Button>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <Button
                    variant="ghost"
                    className="w-full text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center gap-2"
                    onClick={() => (window.location.href = "/staff")}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Перейти на аккаунт сотрудника
                  </Button>
                </div>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/90 text-sm">Имя</Label>
                    <Input
                      type="text"
                      placeholder="Иван Иванов"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:bg-white/15"
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/90 text-sm">Email</Label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:bg-white/15"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/90 text-sm">Пароль</Label>
                    <div className="relative">
                      <Input
                        type={regShowPwd ? "text" : "password"}
                        placeholder="Минимум 6 символов"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:bg-white/15 pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setRegShowPwd(!regShowPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                      >
                        {regShowPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error display */}
                  {registerMutation.error && (
                    <div className="bg-red-500/20 border border-red-400/40 rounded-lg px-3 py-2 text-red-200 text-sm">
                      {registerMutation.error.message}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Создание аккаунта..." : "Зарегистрироваться"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-center text-white/50 text-xs mt-4">
              Платформа гражданских обращений Республики Казахстан
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
