'use client';

import { useCallback } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = { lat: 39.7392, lng: -104.9903 }; // Example default center (Denver)

// Optional "type" is used to visually distinguish waypoints such as FUEL, LODGING, and POI.
export type WaypointPosition = { lat: number; lng: number; type?: string | null };

interface TripPlannerMapProps {
  waypoints: WaypointPosition[];
  onAddWaypoint?: (wp: WaypointPosition) => void;
  onMarkerClick?: (index: number) => void;
  centerOverride?: WaypointPosition;
  routePath?: WaypointPosition[];
}

export default function TripPlannerMap({
  waypoints,
  onAddWaypoint,
  onMarkerClick,
  centerOverride,
  routePath,
}: TripPlannerMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-maps-trip-planner",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!onAddWaypoint) return;
      if (!event.latLng) return;
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      onAddWaypoint({ lat, lng });
    },
    [onAddWaypoint],
  );

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      // Prefer fitting the full route path if available; otherwise fit all waypoints.
      const points = (routePath && routePath.length > 1 ? routePath : waypoints) ?? [];
      if (!points || points.length === 0) return;

      const bounds = new google.maps.LatLngBounds();
      for (const p of points) {
        bounds.extend(p as google.maps.LatLngLiteral);
      }

      // Guard against degenerate bounds (all points identical).
      if (bounds.isEmpty()) return;
      map.fitBounds(bounds);
    },
    [routePath, waypoints],
  );

  const center =
    centerOverride ?? (waypoints[0] as WaypointPosition | undefined) ?? defaultCenter;

  if (loadError) {
    return (
      <div className="rounded border border-red-700 bg-red-950 p-3 text-sm">
        Failed to load Google Maps. Check your API key.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="text-sm text-slate-400">Loading map...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={4}
      onLoad={handleMapLoad}
      onClick={handleMapClick}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
      }}
    >
      {routePath && routePath.length > 0 && (
        <Polyline
          path={routePath}
          options={{
            strokeColor: "#22c55e",
            strokeOpacity: 0.9,
            strokeWeight: 4,
          }}
        />
      )}

      {waypoints.map((position, index) => {
        const wpType = position.type ?? null;

        let icon: google.maps.Symbol | undefined;
        let zIndex: number | undefined;

        if (wpType === "FUEL") {
          icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#22c55e", // green for fuel
            fillOpacity: 0.95,
            strokeColor: "#15803d",
            strokeWeight: 1,
          };
          zIndex = 10;
        } else if (wpType === "LODGING") {
          icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#60a5fa", // blue for lodging
            fillOpacity: 0.95,
            strokeColor: "#1d4ed8",
            strokeWeight: 1,
          };
          zIndex = 9;
        } else if (wpType === "POI") {
          icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#eab308", // amber/yellow for POI
            fillOpacity: 0.95,
            strokeColor: "#a16207",
            strokeWeight: 1,
          };
          zIndex = 8;
        }

        return (
          <Marker
            key={index}
            position={position}
            icon={icon}
            zIndex={zIndex}
            onClick={() => {
              if (onMarkerClick) onMarkerClick(index);
            }}
          />
        );
      })}
    </GoogleMap>
  );
}
