'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader, MarkerClusterer, StandaloneSearchBox } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = { lat: 39.7392, lng: -104.9903 }; // Example default center (Denver)

// Optional "type" is used to visually distinguish waypoints such as FUEL, LODGING, and POI.
export type WaypointPosition = { lat: number; lng: number; type?: string | null };

type PlaceMarker = {
  lat: number;
  lng: number;
  name?: string | null;
  rating?: number | null;
  openNow?: boolean | null;
  category: "fuel" | "lodging" | "dining" | "poi";
};

const MAX_PLACES_RESULTS = 25;

interface TripPlannerMapProps {
  waypoints: WaypointPosition[];
  onAddWaypoint?: (wp: WaypointPosition) => void;
  onMarkerClick?: (index: number) => void;
  centerOverride?: WaypointPosition;
  routePath?: WaypointPosition[];
  showFuelPlaces?: boolean;
  showLodgingPlaces?: boolean;
  showDiningPlaces?: boolean;
  showPoiPlaces?: boolean;
  minPlaceRating?: number | null;
  onlyOpenNow?: boolean;
}

export default function TripPlannerMap({
  waypoints,
  onAddWaypoint,
  onMarkerClick,
  centerOverride,
  routePath,
  showFuelPlaces,
  showLodgingPlaces,
  showDiningPlaces,
  showPoiPlaces,
  minPlaceRating,
  onlyOpenNow,
}: TripPlannerMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-maps-trip-planner",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: ["places"],
  });

  const [fuelPlaces, setFuelPlaces] = useState<PlaceMarker[]>([]);
  const [lodgingPlaces, setLodgingPlaces] = useState<PlaceMarker[]>([]);
  const [diningPlaces, setDiningPlaces] = useState<PlaceMarker[]>([]);
  const [poiPlaces, setPoiPlaces] = useState<PlaceMarker[]>([]);
  const [placesCenter, setPlacesCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [highlightedPlace, setHighlightedPlace] = useState<{
    lat: number;
    lng: number;
    category: "fuel" | "lodging" | "dining" | "poi";
  } | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

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
      mapRef.current = map;
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

  const handleSearchPlacesChanged = useCallback(() => {
    if (!onAddWaypoint || !searchBoxRef.current) return;
    const places = searchBoxRef.current.getPlaces();
    if (!places || places.length === 0) return;
    const place = places[0];
    if (!place.geometry || !place.geometry.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    const types = place.types ?? [];
    let inferredType: string | null = null;

    if (types.includes("gas_station")) {
      inferredType = "FUEL";
    } else if (types.includes("lodging")) {
      inferredType = "LODGING";
    } else if (types.includes("restaurant") || types.includes("cafe") || types.includes("bar")) {
      inferredType = "DINING";
    } else if (types.includes("tourist_attraction") || types.includes("point_of_interest")) {
      inferredType = "POI";
    }

    onAddWaypoint({ lat, lng, type: inferredType });

    const map = mapRef.current;
    if (map) {
      map.panTo({ lat, lng });
      const zoom = map.getZoom() ?? 0;
      if (zoom < 12) {
        map.setZoom(12);
      }
    }
  }, [onAddWaypoint]);

  const handleMapIdle = useCallback(() => {
    if (!mapRef.current) return;

    // Debounce Places calls so we only query after the map has been idle
    // for a short period, instead of on every tiny pan/zoom.
    if (idleTimeoutRef.current !== null) {
      window.clearTimeout(idleTimeoutRef.current);
    }
    idleTimeoutRef.current = window.setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;

      const bounds = map.getBounds();
      if (!bounds) return;

      const center = map.getCenter();
      if (center) {
        setPlacesCenter({ lat: center.lat(), lng: center.lng() });
      }

      const zoom = map.getZoom() ?? 0;
      // Avoid hammering Places API at world zoom levels; only query when zoomed in a bit.
      if (zoom < 7) {
        setFuelPlaces([]);
        setLodgingPlaces([]);
        setDiningPlaces([]);
        setPoiPlaces([]);
        return;
      }

      if (!(google.maps as any).places) return;

      const service = new google.maps.places.PlacesService(map);

      if (showFuelPlaces) {
        service.nearbySearch(
          {
            bounds,
            type: "gas_station",
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const filtered = results.filter((r) => {
                const ratingOk =
                  !minPlaceRating ||
                  (typeof r.rating === "number" && r.rating >= minPlaceRating);
                const openOk =
                  !onlyOpenNow || r.opening_hours?.open_now === true;
                return ratingOk && openOk;
              });
              const limited = filtered.slice(0, MAX_PLACES_RESULTS);
              setFuelPlaces(
                limited.map((r) => ({
                  lat: r.geometry?.location?.lat() ?? 0,
                  lng: r.geometry?.location?.lng() ?? 0,
                  name: r.name ?? null,
                  rating: typeof r.rating === "number" ? r.rating : null,
                  openNow: r.opening_hours?.open_now ?? null,
                  category: "fuel",
                })),
              );
            }
          },
        );
      } else {
        setFuelPlaces([]);
      }

      if (showLodgingPlaces) {
        service.nearbySearch(
          {
            bounds,
            type: "lodging",
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const filtered = results.filter((r) => {
                const ratingOk =
                  !minPlaceRating ||
                  (typeof r.rating === "number" && r.rating >= minPlaceRating);
                const openOk =
                  !onlyOpenNow || r.opening_hours?.open_now === true;
                return ratingOk && openOk;
              });
              const limited = filtered.slice(0, MAX_PLACES_RESULTS);
              setLodgingPlaces(
                limited.map((r) => ({
                  lat: r.geometry?.location?.lat() ?? 0,
                  lng: r.geometry?.location?.lng() ?? 0,
                  name: r.name ?? null,
                  rating: typeof r.rating === "number" ? r.rating : null,
                  openNow: r.opening_hours?.open_now ?? null,
                  category: "lodging",
                })),
              );
            }
          },
        );
      } else {
        setLodgingPlaces([]);
      }

      if (showDiningPlaces) {
        service.nearbySearch(
          {
            bounds,
            type: "restaurant",
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const filtered = results.filter((r) => {
                const ratingOk =
                  !minPlaceRating ||
                  (typeof r.rating === "number" && r.rating >= minPlaceRating);
                const openOk =
                  !onlyOpenNow || r.opening_hours?.open_now === true;
                return ratingOk && openOk;
              });
              const limited = filtered.slice(0, MAX_PLACES_RESULTS);
              setDiningPlaces(
                limited.map((r) => ({
                  lat: r.geometry?.location?.lat() ?? 0,
                  lng: r.geometry?.location?.lng() ?? 0,
                  name: r.name ?? null,
                  rating: typeof r.rating === "number" ? r.rating : null,
                  openNow: r.opening_hours?.open_now ?? null,
                  category: "dining",
                })),
              );
            }
          },
        );
      } else {
        setDiningPlaces([]);
      }

      if (showPoiPlaces) {
        service.nearbySearch(
          {
            bounds,
            type: "tourist_attraction",
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const filtered = results.filter((r) => {
                const ratingOk =
                  !minPlaceRating ||
                  (typeof r.rating === "number" && r.rating >= minPlaceRating);
                const openOk =
                  !onlyOpenNow || r.opening_hours?.open_now === true;
                return ratingOk && openOk;
              });
              const limited = filtered.slice(0, MAX_PLACES_RESULTS);
              setPoiPlaces(
                limited.map((r) => ({
                  lat: r.geometry?.location?.lat() ?? 0,
                  lng: r.geometry?.location?.lng() ?? 0,
                  name: r.name ?? null,
                  rating: typeof r.rating === "number" ? r.rating : null,
                  openNow: r.opening_hours?.open_now ?? null,
                  category: "poi",
                })),
              );
            }
          },
        );
      } else {
        setPoiPlaces([]);
      }
    }, 500);
  }, [showFuelPlaces, showLodgingPlaces, showDiningPlaces, showPoiPlaces, minPlaceRating, onlyOpenNow]);

  function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  }

  const panelItems = useMemo(() => {
    if (!placesCenter)
      return [] as {
        name: string;
        category: "fuel" | "lodging" | "dining" | "poi";
        distanceKm: number;
        rating?: number | null;
        lat: number;
        lng: number;
      }[];

    const all: PlaceMarker[] = [];
    if (showFuelPlaces) all.push(...fuelPlaces);
    if (showLodgingPlaces) all.push(...lodgingPlaces);
    if (showDiningPlaces) all.push(...diningPlaces);
    if (showPoiPlaces) all.push(...poiPlaces);

    const withDistance = all.map((p) => ({
      name: p.name ?? "Unnamed",
      category: p.category,
      rating: p.rating,
      distanceKm: haversineKm(placesCenter, { lat: p.lat, lng: p.lng }),
      lat: p.lat,
      lng: p.lng,
    }));

    withDistance.sort((a, b) => {
      const ra = a.rating ?? 0;
      const rb = b.rating ?? 0;
      if (rb !== ra) return rb - ra;
      return a.distanceKm - b.distanceKm;
    });

    return withDistance.slice(0, 10);
  }, [placesCenter, showFuelPlaces, showLodgingPlaces, showPoiPlaces, fuelPlaces, lodgingPlaces, poiPlaces]);

  const handlePanelItemClick = useCallback(
    (item: { lat: number; lng: number; category: "fuel" | "lodging" | "dining" | "poi" }) => {
      const map = mapRef.current;
      if (map) {
        map.panTo({ lat: item.lat, lng: item.lng });
        const zoom = map.getZoom() ?? 0;
        if (zoom < 13) {
          map.setZoom(13);
        }
      }

      setHighlightedPlace({ lat: item.lat, lng: item.lng, category: item.category });

      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedPlace(null);
        highlightTimeoutRef.current = null;
      }, 2000);
    },
    [],
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
      onLoad={handleMapLoad}
      onIdle={handleMapIdle}
      onClick={handleMapClick}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
      }}
    >
      {onAddWaypoint && (
        <div
          className="pointer-events-auto"
          style={{ position: "absolute", left: 8, top: 8, zIndex: 30 }}
        >
          <StandaloneSearchBox
            onLoad={(ref: google.maps.places.SearchBox) => {
              searchBoxRef.current = ref;
            }}
            onPlacesChanged={handleSearchPlacesChanged}
          >
            <input
              type="text"
              placeholder="Search address or place..."
              className="w-64 rounded border border-adv-border bg-slate-950/90 px-2 py-1 text-[11px] text-slate-100 shadow-adv-glow placeholder:text-slate-500"
            />
          </StandaloneSearchBox>
        </div>
      )}

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

        // Rider-defined waypoints use solid markers.
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
        } else if (wpType === "DINING") {
          icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#fb7185", // rose/red for dining
            fillOpacity: 0.95,
            strokeColor: "#be123c",
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

      {/* Google Places overlays (secondary markers) */}
      {showFuelPlaces && fuelPlaces.length > 0 && (
        <MarkerClusterer>
          {(clusterer) => (
            <>
              {fuelPlaces.map((p, idx) => {
              const isHighlighted =
                highlightedPlace &&
                highlightedPlace.category === "fuel" &&
                highlightedPlace.lat === p.lat &&
                highlightedPlace.lng === p.lng;

              const baseIcon: google.maps.Symbol = {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                fillColor: "#22c55e",
                fillOpacity: 0.4,
                strokeColor: "#22c55e",
                strokeOpacity: 0.8,
                strokeWeight: 1,
              };

              const icon = isHighlighted
                ? { ...baseIcon, scale: 6, fillOpacity: 0.9, strokeWeight: 2 }
                : baseIcon;

              return (
                <Marker
                  key={`fuel-place-${idx}`}
                  position={{ lat: p.lat, lng: p.lng }}
                  title={p.name ?? undefined}
                  clusterer={clusterer}
                  icon={icon}
                  zIndex={isHighlighted ? 20 : 5}
                />
              );
            })}
            </>
          )}
        </MarkerClusterer>
      )}

      {showLodgingPlaces && lodgingPlaces.length > 0 && (
        <MarkerClusterer>
          {(clusterer) => (
            <>
              {lodgingPlaces.map((p, idx) => {
              const isHighlighted =
                highlightedPlace &&
                highlightedPlace.category === "lodging" &&
                highlightedPlace.lat === p.lat &&
                highlightedPlace.lng === p.lng;

              const baseIcon: google.maps.Symbol = {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                fillColor: "#60a5fa",
                fillOpacity: 0.4,
                strokeColor: "#60a5fa",
                strokeOpacity: 0.8,
                strokeWeight: 1,
              };

              const icon = isHighlighted
                ? { ...baseIcon, scale: 6, fillOpacity: 0.9, strokeWeight: 2 }
                : baseIcon;

              return (
                <Marker
                  key={`lodging-place-${idx}`}
                  position={{ lat: p.lat, lng: p.lng }}
                  title={p.name ?? undefined}
                  clusterer={clusterer}
                  icon={icon}
                  zIndex={isHighlighted ? 20 : 4}
                />
              );
            })}
            </>
          )}
        </MarkerClusterer>
      )}

      {showDiningPlaces && diningPlaces.length > 0 && (
        <MarkerClusterer>
          {(clusterer) => (
            <>
              {diningPlaces.map((p, idx) => {
              const isHighlighted =
                highlightedPlace &&
                highlightedPlace.category === "dining" &&
                highlightedPlace.lat === p.lat &&
                highlightedPlace.lng === p.lng;

              const baseIcon: google.maps.Symbol = {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                fillColor: "#fb7185",
                fillOpacity: 0.4,
                strokeColor: "#fb7185",
                strokeOpacity: 0.8,
                strokeWeight: 1,
              };

              const icon = isHighlighted
                ? { ...baseIcon, scale: 6, fillOpacity: 0.9, strokeWeight: 2 }
                : baseIcon;

              return (
                <Marker
                  key={`dining-place-${idx}`}
                  position={{ lat: p.lat, lng: p.lng }}
                  title={p.name ?? undefined}
                  clusterer={clusterer}
                  icon={icon}
                  zIndex={isHighlighted ? 20 : 4}
                />
              );
            })}
            </>
          )}
        </MarkerClusterer>
      )}

      {showPoiPlaces && poiPlaces.length > 0 && (
        <MarkerClusterer>
          {(clusterer) => (
            <>
              {poiPlaces.map((p, idx) => {
              const isHighlighted =
                highlightedPlace &&
                highlightedPlace.category === "poi" &&
                highlightedPlace.lat === p.lat &&
                highlightedPlace.lng === p.lng;

              const baseIcon: google.maps.Symbol = {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                fillColor: "#eab308",
                fillOpacity: 0.4,
                strokeColor: "#eab308",
                strokeOpacity: 0.8,
                strokeWeight: 1,
              };

              const icon = isHighlighted
                ? { ...baseIcon, scale: 6, fillOpacity: 0.9, strokeWeight: 2 }
                : baseIcon;

              return (
                <Marker
                  key={`poi-place-${idx}`}
                  position={{ lat: p.lat, lng: p.lng }}
                  title={p.name ?? undefined}
                  clusterer={clusterer}
                  icon={icon}
                  zIndex={isHighlighted ? 20 : 3}
                />
              );
            })}
            </>
          )}
        </MarkerClusterer>
      )}

      {panelItems.length > 0 && (
        <div
          className="pointer-events-auto rounded border border-adv-border bg-slate-900/90 p-2 text-[11px] text-slate-200 shadow-adv-glow"
          style={{ position: "absolute", right: 8, bottom: 8, maxWidth: 260, maxHeight: 180, overflowY: "auto" }}
        >
          <p className="mb-1 font-semibold text-[11px] text-slate-100">Nearby places</p>
          <ul className="space-y-1">
            {panelItems.map((p, idx) => (
              <li
                key={`${p.category}-${idx}`}
                className="flex cursor-pointer items-center justify-between gap-2 rounded px-1 hover:bg-slate-800/60"
                onClick={() => handlePanelItemClick(p)}
              >
                <span className="truncate">{p.name}</span>
                <span className="text-slate-400">
                  {p.rating != null ? `${p.rating.toFixed(1)}★ · ` : ""}
                  {p.distanceKm.toFixed(0)} km
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </GoogleMap>
  );
}
