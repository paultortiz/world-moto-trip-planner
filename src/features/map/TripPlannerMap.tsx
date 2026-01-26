'use client';

import { useCallback } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = { lat: 39.7392, lng: -104.9903 }; // Example default center (Denver)

export type WaypointPosition = { lat: number; lng: number };

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

      {waypoints.map((position, index) => (
        <Marker
          key={index}
          position={position}
          onClick={() => {
            if (onMarkerClick) onMarkerClick(index);
          }}
        />
      ))}
    </GoogleMap>
  );
}
