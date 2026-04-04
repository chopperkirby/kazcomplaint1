import { useState } from "react";
import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Shield, ChevronLeft, MapPin, TrendingUp } from "lucide-react";
import Map2GIS from "@/components/Map2GIS";
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_ICONS } from "@/lib/utils";

type MapComplaint = {
  id: number;
  title: string;
  lat?: number | null;
  lng?: number | null;
  priority?: number | null;
  status: string;
  category: string;
  address?: string | null;
  supportCount?: number;
};

export default function StaffMap() {
  const { user } = useAuth();
  const isStaff = true; // user?.role === "staff" || user?.role === "admin";
  const [regionId, setRegionId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();
  const [selectedComplaint, setSelectedComplaint] = useState<MapComplaint | null>(null);

  const regionsQuery = trpc.location.regions.useQuery();
  const citiesQuery = trpc.location.cities.useQuery(
    { regionId: regionId! },
    { enabled: !!regionId }
  );

  const mapDataQuery = trpc.complaints.mapData.useQuery(
    { regionId, cityId },
    { enabled: isStaff }
  );

  // if (!isStaff) {
  //   return (
  //     <div className="min-h-screen bg-background">
  //       <NavBar />
  //       <div className="container py-8">
  //         <div className="text-center">
  //           <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
  //           <h1 className="text-2xl font-bold text-foreground mb-2">Доступ запрещён</h1>
  //           <p className="text-muted-foreground">Эта страница доступна только для сотрудников</p>
  //           <Link href="/">
  //             <span className="text-primary hover:underline mt-4 inline-block">Вернуться на главную</span>
  //           </Link>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  const complaints = (mapDataQuery.data ?? []) as MapComplaint[];
  const withCoords = complaints.filter(c => c.lat && c.lng);

  // Convert complaints to 2GIS markers format
  const markers = withCoords.map((c) => {
    const priority = c.priority ?? 0;
    const color =
      priority > 200 ? "#ef4444" :
      priority > 100 ? "#f97316" :
      priority > 50 ? "#f59e0b" : "#3b82f6";

    return {
      coords: [Number(c.lat!), Number(c.lng!)] as [number, number],
      title: c.title,
      description: c.address || "Без адреса",
      count: c.supportCount,
      color,
    };
  });

  // Default center: Kazakhstan center (Astana area)
  const defaultCenter: [number, number] = [51.1694, 71.4491];

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="container py-8">
        <div className="mb-6 flex items-center gap-2">
          <Link href="/staff/dashboard">
            <ChevronLeft className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Карта проблем (Сотрудник)</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {withCoords.length} жалоб отображено на карте 2GIS
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="rounded-xl overflow-hidden border border-border shadow-sm">
              <Map2GIS
                center={defaultCenter}
                zoom={5}
                markers={markers}
                height="h-[550px]"
              />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3">
              {[
                { color: "bg-red-500", label: "Критический (>200)" },
                { color: "bg-orange-500", label: "Высокий (>100)" },
                { color: "bg-amber-500", label: "Средний (>50)" },
                { color: "bg-blue-500", label: "Низкий" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected complaint info */}
            {selectedComplaint && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Выбранная жалоба
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium text-sm text-foreground">
                    {CATEGORY_ICONS[selectedComplaint.category]} {selectedComplaint.title}
                  </p>
                  <Badge className={`text-xs ${STATUS_COLORS[selectedComplaint.status]}`}>
                    {STATUS_LABELS[selectedComplaint.status]}
                  </Badge>
                  {selectedComplaint.address && (
                    <p className="text-xs text-muted-foreground">{selectedComplaint.address}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-orange-500" />
                      {selectedComplaint.priority?.toFixed(0)} приоритет
                    </span>
                    <span className="text-muted-foreground">
                      👍 {selectedComplaint.supportCount ?? 0}
                    </span>
                  </div>
                  <Link href={`/staff/complaints/${selectedComplaint.id}`}>
                    <span className="text-xs text-primary hover:underline cursor-pointer">
                      Управлять жалобой →
                    </span>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Top by priority */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Топ жалоб по приоритету</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {complaints
                  .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
                  .slice(0, 10)
                  .map(c => {
                    const priority = c.priority ?? 0;
                    const priorityColor =
                      priority > 200 ? "bg-red-100 text-red-700" :
                      priority > 100 ? "bg-orange-100 text-orange-700" :
                      priority > 50 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";

                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedComplaint(c)}
                        className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-base shrink-0">{CATEGORY_ICONS[c.category]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{c.title}</p>
                          <p className="text-xs text-muted-foreground">
                            👍 {c.supportCount ?? 0} поддержек
                          </p>
                        </div>
                        <Badge className={`text-xs shrink-0 ${priorityColor}`}>
                          {(c.priority ?? 0).toFixed(0)}
                        </Badge>
                      </button>
                    );
                  })}
                {complaints.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Нет жалоб с геолокацией
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
