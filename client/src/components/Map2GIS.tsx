import { useEffect, useRef } from "react";

type ClusterMarker = {
  coords: [number, number];
  count: number;
  criticalityColor: string;
  label?: string;
};

interface Map2GISProps {
  center?: [number, number]; // [latitude, longitude]
  zoom?: number;
  markers?: Array<{
    coords: [number, number];
    title: string;
    description?: string;
    count?: number;
    color?: string;
    id?: number;
  }>;
  clusters?: ClusterMarker[];
  onMapReady?: (map: any) => void;
  onMarkerClick?: (id: number) => void;
  height?: string;
  className?: string;
}

/**
 * 2GIS Map Component for Kazakhstan
 * Uses 2GIS API for accurate mapping of complaints by location
 * 
 * Note: 2GIS API requires loading from CDN
 * The DG global object will be available after the script loads
 */
export default function Map2GIS({
  center = [51.1694, 71.4491],
  zoom = 11,
  markers = [],
  clusters = [],
  onMapReady,
  onMarkerClick,
  height = "h-96",
  className = "",
}: Map2GISProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Load 2GIS API from CDN
    if (!window.DG) {
      const script = document.createElement("script");
      script.src = "https://maps.api.2gis.ru/2.0/loader.js?pkg=full";
      script.async = true;
      script.onload = () => {
        initializeMap();
      };
      document.head.appendChild(script);
    } else {
      initializeMap();
    }

    return () => {
      // Cleanup markers
      markersRef.current.forEach((marker) => {
        if (marker && marker.remove) {
          marker.remove();
        }
      });
    };
  }, []);

  const initializeMap = () => {
    if (!mapContainer.current || mapInstance.current) return;

    (window as any).DG.then(() => {
      const map = (window as any).DG.map(mapContainer.current, {
        center,
        zoom,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstance.current = map;

      // Add markers
      addMarkers(map);

      if (onMapReady) {
        onMapReady(map);
      }
    });
  };

  const addMarkers = (map: any) => {
    markersRef.current.forEach((m) => { try { m.remove(); } catch {} });
    markersRef.current = [];
    const DG = (window as any).DG;

    // Render cluster circles
    clusters.forEach(({ coords, count, criticalityColor, label }) => {
      const size = Math.min(28 + count * 2, 56);
      const html = `<div style="
        width:${size}px;height:${size}px;
        background:${criticalityColor};
        border:3px solid rgba(255,255,255,0.85);
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:bold;font-size:${size > 40 ? 14 : 12}px;
        box-shadow:0 2px 12px rgba(0,0,0,0.35);
        cursor:pointer;
      ">${count > 99 ? "99+" : count}</div>`;
      const icon = DG.divIcon
        ? DG.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size/2, size/2] })
        : DG.icon({ iconUrl: "", iconSize: [size, size] });
      const m = DG.marker(coords, { icon })
        .addTo(map)
        .bindPopup(`<div style="padding:8px"><b>${count} проблем</b>${label ? `<br/>${label}` : ""}</div>`);
      markersRef.current.push(m);
    });

    // Render individual markers
    markers.forEach(({ coords, title, description, count, color, id }) => {
      const markerColor = color || "#3b82f6";
      const sz = count ? 36 : 24;
      const html = `<div style="
        width:${sz}px;height:${sz}px;
        background:${markerColor};
        border:2px solid rgba(255,255,255,0.9);
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:bold;font-size:11px;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        cursor:pointer;
      ">${count ? (count > 99 ? "99+" : count) : ""}</div>`;
      const icon = DG.divIcon
        ? DG.divIcon({ html, className: "", iconSize: [sz, sz], iconAnchor: [sz/2, sz/2] })
        : DG.icon({ iconUrl: "", iconSize: [sz, sz] });
      const m = DG.marker(coords, { icon })
        .addTo(map)
        .bindPopup(`<div style="padding:8px;min-width:200px">
          <h3 style="margin:0 0 4px;font-weight:bold;font-size:13px">${title}</h3>
          ${description ? `<p style="margin:4px 0;font-size:12px;color:#555">${description}</p>` : ""}
          ${count ? `<p style="margin:4px 0;font-size:12px;color:#888">Поддержек: ${count}</p>` : ""}
        </div>`);
      if (onMarkerClick && id !== undefined) m.on("click", () => onMarkerClick(id));
      markersRef.current.push(m);
    });
  };

  // Update markers when they change
  useEffect(() => {
    if (mapInstance.current && (window as any).DG) {
      addMarkers(mapInstance.current);
    }
  }, [markers, clusters]);

  return (
    <div
      ref={mapContainer}
      className={`${height} w-full rounded-lg overflow-hidden border border-border shadow-sm ${className}`}
      style={{ minHeight: "400px" }}
    />
  );
}

// Extend window type for 2GIS API
declare global {
  interface Window {
    DG?: any;
  }
}
