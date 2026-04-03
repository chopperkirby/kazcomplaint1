import { useState, useRef } from "react";
import NavBar from "@/components/NavBar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  MapPin, Camera, X, Loader2, Navigation, ChevronLeft,
  FileText, Building2, Tag, AlertCircle, Video
} from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_ICONS, DEPARTMENT_LABELS } from "@/lib/utils";
import { MapView } from "@/components/Map";

const CATEGORIES = Object.entries(CATEGORY_LABELS);
const DEPARTMENTS = Object.entries(DEPARTMENT_LABELS);

const DEPT_DESCRIPTIONS: Record<string, string> = {
  akimat: "Общие городские проблемы, благоустройство, ЖКХ",
  city_management: "Дороги, транспорт, инфраструктура",
  gov_services: "Государственные услуги, документы, социальная помощь",
};

// Auto-detect department based on category
function autoDepartment(category: string): string {
  if (["roads", "public_transport", "lighting"].includes(category)) return "city_management";
  if (["gov_services"].includes(category)) return "gov_services";
  return "akimat";
}

export default function SubmitComplaint() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState("");
  const [regionId, setRegionId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();
  const [districtId, setDistrictId] = useState<number | undefined>();
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [videoUploading, setVideoUploading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const regionsQuery = trpc.location.regions.useQuery();
  const citiesQuery = trpc.location.cities.useQuery(
    { regionId: regionId! },
    { enabled: !!regionId }
  );
  const districtsQuery = trpc.location.districts.useQuery(
    { cityId: cityId! },
    { enabled: !!cityId }
  );

  const uploadPhotoMutation = trpc.complaints.uploadPhoto.useMutation();
  const uploadVideoMutation = trpc.complaints.uploadVideo.useMutation();

  const handleVideoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setVideoUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name}: файл слишком большой (макс. 50MB)`);
        continue;
      }
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => { const result = reader.result as string; resolve(result.split(',')[1]); };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const { url } = await uploadVideoMutation.mutateAsync({
          fileName: file.name,
          contentType: file.type || 'video/mp4',
          base64,
        });
        newUrls.push(url);
      } catch {
        toast.error(`Не удалось загрузить ${file.name}`);
      }
    }
    setVideoUrls(prev => [...prev, ...newUrls]);
    setVideoUploading(false);
    if (newUrls.length > 0) toast.success(`${newUrls.length} видео загружено`);
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: файл слишком большой (макс. 10MB)`);
        continue;
      }
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const { url } = await uploadPhotoMutation.mutateAsync({
          fileName: file.name,
          contentType: file.type || 'image/jpeg',
          base64,
        });
        newUrls.push(url);
      } catch {
        toast.error(`Не удалось загрузить ${file.name}`);
      }
    }
    setPhotoUrls(prev => [...prev, ...newUrls]);
    setPhotoUploading(false);
    if (newUrls.length > 0) toast.success(`${newUrls.length} фото загружено`);
  };

  const createMutation = trpc.complaints.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Жалоба успешно подана!");
      navigate("/complaints");
    },
    onError: (err: any) => toast.error(err.message || "Ошибка при подаче жалобы"),
  });

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast.error("Геолокация не поддерживается браузером");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);

        // Reverse geocode
        if (geocoderRef.current) {
          geocoderRef.current.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              if (status === "OK" && results?.[0]) {
                setAddress(results[0].formatted_address);
              }
            }
          );
        }
        setGeoLoading(false);
        toast.success("Геолокация определена");
      },
      () => {
        setGeoLoading(false);
        toast.error("Не удалось определить геолокацию");
      }
    );
  };

  const handleMapReady = (map: google.maps.Map) => {
    geocoderRef.current = new google.maps.Geocoder();
    setMapReady(true);

    // Click on map to set location
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        setLat(newLat);
        setLng(newLng);

        geocoderRef.current?.geocode(
          { location: { lat: newLat, lng: newLng } },
          (results, status) => {
            if (status === "OK" && results?.[0]) {
              setAddress(results[0].formatted_address);
            }
          }
        );
      }
    });
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    if (!department) {
      setDepartment(autoDepartment(val));
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || title.length < 5) {
      toast.error("Заголовок должен содержать минимум 5 символов");
      return;
    }
    if (!description.trim() || description.length < 10) {
      toast.error("Описание должно содержать минимум 10 символов");
      return;
    }
    if (!category) {
      toast.error("Выберите категорию");
      return;
    }
    if (!department) {
      toast.error("Выберите ведомство");
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category: category as any,
      department: department as any,
      regionId,
      cityId,
      districtId,
      address: address || undefined,
      lat,
      lng,
      photoUrls,
      videoUrls,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="container py-16 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Требуется авторизация</h2>
          <p className="text-muted-foreground mb-6">
            Для подачи жалобы необходимо войти в систему
          </p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>
            Войти
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="container py-8 max-w-3xl">
        {/* Back */}
        <button
          onClick={() => navigate("/complaints")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Назад
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-6">Подать жалобу</h1>

        <div className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Описание проблемы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Заголовок *</Label>
                <Input
                  id="title"
                  placeholder="Кратко опишите проблему..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="mt-1"
                  maxLength={256}
                />
                <p className="text-xs text-muted-foreground mt-1">{title.length}/256</p>
              </div>

              <div>
                <Label htmlFor="description">Подробное описание *</Label>
                <Textarea
                  id="description"
                  placeholder="Опишите проблему подробно: что произошло, когда, как давно существует..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Category & Department */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Категория и ведомство
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Категория *</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                  {CATEGORIES.map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => handleCategoryChange(k)}
                      className={`p-2 rounded-lg border text-xs text-center transition-all ${
                        category === k
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="text-lg mb-1">{CATEGORY_ICONS[k]}</div>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Ведомство *</Label>
                <div className="grid gap-2 mt-2">
                  {DEPARTMENTS.map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setDepartment(k)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        department === k
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium text-sm ${department === k ? "text-primary" : "text-foreground"}`}>
                          {v}
                        </span>
                        {department === k && (
                          <Badge variant="secondary" className="text-xs">Выбрано</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {DEPT_DESCRIPTIONS[k]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Местоположение
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Region / City / District */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label>Регион</Label>
                  <Select
                    value={regionId?.toString() ?? ""}
                    onValueChange={v => {
                      setRegionId(Number(v));
                      setCityId(undefined);
                      setDistrictId(undefined);
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Выберите регион" />
                    </SelectTrigger>
                    <SelectContent>
                      {regionsQuery.data?.map(r => (
                        <SelectItem key={r.id} value={r.id.toString()}>{r.nameRu}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {regionId && (
                  <div>
                    <Label>Город</Label>
                    <Select
                      value={cityId?.toString() ?? ""}
                      onValueChange={v => {
                        setCityId(Number(v));
                        setDistrictId(undefined);
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Выберите город" />
                      </SelectTrigger>
                      <SelectContent>
                        {citiesQuery.data?.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.nameRu}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {cityId && (
                  <div>
                    <Label>Район</Label>
                    <Select
                      value={districtId?.toString() ?? ""}
                      onValueChange={v => setDistrictId(Number(v))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Выберите район" />
                      </SelectTrigger>
                      <SelectContent>
                        {districtsQuery.data?.map(d => (
                          <SelectItem key={d.id} value={d.id.toString()}>{d.nameRu}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Адрес</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="address"
                    placeholder="ул. Абая, 10, Алматы"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGeolocate}
                    disabled={geoLoading}
                    title="Определить геолокацию"
                  >
                    {geoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {lat && lng && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {lat.toFixed(5)}, {lng.toFixed(5)}
                  </p>
                )}
              </div>

              {/* Map */}
              <div className="h-64 rounded-lg overflow-hidden border border-border">
                <MapView
                  onMapReady={handleMapReady}
                  initialCenter={
                    lat && lng
                      ? { lat, lng }
                      : { lat: 43.238, lng: 76.945 }
                  }
                  initialZoom={12}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Нажмите на карту, чтобы указать точное место проблемы
              </p>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Фотографии
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handlePhotoUpload(e.target.files)}
              />
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-muted-foreground">Загрузка...</p>
                  </>
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground mb-1">Нажмите для загрузки фото</p>
                    <p className="text-xs text-muted-foreground">JPEG, PNG, WebP — до 10MB каждый</p>
                  </>
                )}
              </div>
              {photoUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Фото ${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-border" />
                      <button
                        onClick={() => setPhotoUrls(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Videos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="h-4 w-4" />
                Видеозапись
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={e => handleVideoUpload(e.target.files)}
              />
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                onClick={() => videoInputRef.current?.click()}
              >
                {videoUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-muted-foreground">Загрузка видео...</p>
                  </>
                ) : (
                  <>
                    <Video className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground mb-1">Нажмите для загрузки видео</p>
                    <p className="text-xs text-muted-foreground">MP4, MOV, AVI — до 50MB каждый</p>
                  </>
                )}
              </div>
              {videoUrls.length > 0 && (
                <div className="space-y-2">
                  {videoUrls.map((url, i) => (
                    <div key={i} className="relative group flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                      <Video className="h-5 w-5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1 truncate">Видео {i + 1}</span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Просмотр</a>
                      <button
                        onClick={() => setVideoUrls(prev => prev.filter((_, j) => j !== i))}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              size="lg"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                "Подать жалобу"
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/complaints")}
            >
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
