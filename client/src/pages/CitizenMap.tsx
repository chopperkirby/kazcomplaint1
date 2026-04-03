import { useState, useMemo } from "react";
import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Map2GIS from "@/components/Map2GIS";
import { Link } from "wouter";
import { MapPin, TrendingUp, Eye, AlertTriangle, Info } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_ICONS, getPriorityLevel } from "@/lib/utils";

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
  cityId?: number | null;
};

function clusterComplaints(complaints: MapComplaint[], gridSize: number) {
  const grid: Map<string, MapComplaint[]> = new Map();
  for (const c of complaints) {
    if (!c.lat || !c.lng) continue;
    const gx = Math.floor(c.lat / gridSize);
    const gy = Math.floor(c.lng / gridSize);
    const key = `${gx}_${gy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(c);
  }
  const clusters: Array<{
    coords: [number, number];
    count: number;
    criticalityColor: string;
    label: string;
  }> = [];
  for (const [, items] of Array.from(grid.entries())) {
    const avgLat = items.reduce((s: number, c: MapComplaint) => s + (c.lat ?? 0), 0) / items.length;
    const avgLng = items.reduce((s: number, c: MapComplaint) => s + (c.lng ?? 0), 0) / items.length;
    const maxPriority = Math.max(...items.map((c: MapComplaint) => c.priority ?? 0));
    const criticalityColor =
      maxPriority > 200 ? "#ef4444" :
      maxPriority > 100 ? "#f97316" :
      maxPriority > 50  ? "#f59e0b" : "#3b82f6";
    clusters.push({
      coords: [avgLat, avgLng],
      count: items.length,
      criticalityColor,
      label: `Макс. приоритет: ${maxPriority.toFixed(0)}`,
    });
  }
  return clusters;
}

const CRITICALITY_LEGEND = [
  { color: "#ef4444", label: "Критический (>200)" },
  { color: "#f97316", label: "Высокий (>100)" },
  { color: "#f59e0b", label: "Средний (>50)" },
  { color: "#3b82f6", label: "Низкий" },
];

export default function CitizenMap() {
  const [regionId, setRegionId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();
  const [selectedComplaint, setSelectedComplaint] = useState<MapComplaint | null>(null);
  const [viewMode, setViewMode] = useState<"cluster" | "individual">("cluster");

  const regionsQuery = trpc.location.regions.useQuery();
  const citiesQuery = trpc.location.cities.useQuery({ regionId: regionId! }, { enabled: !!regionId });
  const mapDataQuery = trpc.complaints.mapData.useQuery({ regionId, cityId });
  const complaints = (mapDataQuery.data ?? []) as MapComplaint[];
  const withCoords = complaints.filter((c) => c.lat && c.lng);

  const clusters = useMemo(() => clusterComplaints(withCoords, 0.15), [withCoords]);

  const individualMarkers = withCoords.map((c) => {
    const priority = c.priority ?? 0;
    const color = priority > 200 ? "#ef4444" : priority > 100 ? "#f97316" : priority > 50 ? "#f59e0b" : "#3b82f6";
    return {
      coords: [Number(c.lat!), Number(c.lng!)] as [number, number],
      title: c.title,
      description: c.address || "Без адреса",
      count: c.supportCount,
      color,
      id: c.id,
    };
  });

  const defaultCenter: [number, number] = [51.1694, 71.4491];

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container py-8">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Карта проблем</h1>
            <p className="text-sm text-muted-foreground mt-1">{withCoords.length} жалоб на карте 2GIS</p>
          </div>
          <div className="flex gap-2">
            {(["cluster", "individual"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === mode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {mode === "cluster" ? "Кластеры" : "Отдельно"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          <Select value={regionId?.toString() ?? "all"} onValueChange={(v) => { setRegionId(v === "all" ? undefined : Number(v)); setCityId(undefined); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Все регионы" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все регионы</SelectItem>
              {regionsQuery.data?.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.nameRu}</SelectItem>)}
            </SelectContent>
          </Select>
          {regionId && (
            <Select value={cityId?.toString() ?? "all"} onValueChange={(v) => setCityId(v === "all" ? undefined : Number(v))}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Все города" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все города</SelectItem>
                {citiesQuery.data?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.nameRu}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Map2GIS
              center={defaultCenter}
              zoom={5}
              markers={viewMode === "individual" ? individualMarkers : []}
              clusters={viewMode === "cluster" ? clusters : []}
              height="h-[560px]"
              onMarkerClick={(id) => { const c = complaints.find((x) => x.id === id); if (c) setSelectedComplaint(c); }}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              {CRITICALITY_LEGEND.map(({ color, label }) => (
                <div key={color} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-4 h-4 rounded-full border-2 border-white/80 shadow-sm" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Статистика</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Всего на карте", value: withCoords.length, color: "text-foreground" },
                  { label: "Критических", value: withCoords.filter((c) => (c.priority ?? 0) > 200).length, color: "text-red-500" },
                  { label: "Высокий приоритет", value: withCoords.filter((c) => (c.priority ?? 0) > 100 && (c.priority ?? 0) <= 200).length, color: "text-orange-500" },
                  { label: "Средний", value: withCoords.filter((c) => (c.priority ?? 0) > 50 && (c.priority ?? 0) <= 100).length, color: "text-amber-500" },
                  { label: "Низкий", value: withCoords.filter((c) => (c.priority ?? 0) <= 50).length, color: "text-blue-500" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-semibold ${color}`}>{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {selectedComplaint && (
              <Card className="border-primary/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Info className="h-4 w-4 text-primary" />Выбранная жалоба</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium text-sm">{selectedComplaint.title}</p>
                  {selectedComplaint.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedComplaint.address}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{(CATEGORY_ICONS as any)[selectedComplaint.category] ?? "📋"} {selectedComplaint.category}</Badge>
                    <Badge className="text-xs" style={{ background: (STATUS_COLORS as any)[selectedComplaint.status] ?? "#94a3b8", color: "white" }}>
                      {(STATUS_LABELS as any)[selectedComplaint.status] ?? selectedComplaint.status}
                    </Badge>
                  </div>
                  <Link href={`/complaints/${selectedComplaint.id}`}>
                    <button className="text-xs text-primary hover:underline flex items-center gap-1"><Eye className="h-3 w-3" />Подробнее</button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />Топ по приоритету</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {withCoords.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)).slice(0, 10).map((c) => {
                    const priority = c.priority ?? 0;
                    const color = priority > 200 ? "#ef4444" : priority > 100 ? "#f97316" : priority > 50 ? "#f59e0b" : "#3b82f6";
                    return (
                      <div key={c.id} className="flex items-start gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors" onClick={() => setSelectedComplaint(c)}>
                        <div className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ background: color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{(CATEGORY_ICONS as any)[c.category] ?? "📋"} · {c.supportCount ?? 0} поддержек</p>
                        </div>
                      </div>
                    );
                  })}
                  {withCoords.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Нет жалоб с геолокацией</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
