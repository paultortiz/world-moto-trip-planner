'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader, MarkerClusterer, StandaloneSearchBox } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = { lat: 39.7392, lng: -104.9903 }; // Example default center (Denver)

// Optional "type" is used to visually distinguish waypoints such as FUEL, LODGING, and POI.
// "name" and "googlePlaceId" are used when a waypoint is created from a Places search.
export type WaypointPosition = {
  lat: number;
  lng: number;
  type?: string | null;
  name?: string | null;
  googlePlaceId?: string | null;
};

type PlaceMarker = {
  lat: number;
  lng: number;
  name?: string | null;
  rating?: number | null;
  openNow?: boolean | null;
  category: "fuel" | "lodging" | "campground" | "dining" | "poi";
};

type PanelPlaceItem = {
  name: string;
  category: "fuel" | "lodging" | "campground" | "dining" | "poi";
  distanceKm: number;
  rating?: number | null;
  lat: number;
  lng: number;
};

const MAX_PLACES_RESULTS = 25;

interface TripPlannerMapProps {
  waypoints: WaypointPosition[];
  onAddWaypoint?: (wp: WaypointPosition) => void;
  onMarkerClick?: (index: number) => void;
  centerOverride?: WaypointPosition;
  routePath?: WaypointPosition[];
  /**
   * When true, plain map clicks will call onAddWaypoint.
   * When false or omitted, clicks are ignored so the rider can pan without
   * accidentally creating waypoints.
   */
  enableClickToAdd?: boolean;
  showFuelPlaces?: boolean;
  showLodgingPlaces?: boolean;
  showCampgroundPlaces?: boolean;
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
  enableClickToAdd,
  showFuelPlaces,
  showLodgingPlaces,
  showCampgroundPlaces,
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
  const [campgroundPlaces, setCampgroundPlaces] = useState<PlaceMarker[]>([]);
  const [diningPlaces, setDiningPlaces] = useState<PlaceMarker[]>([]);
  const [poiPlaces, setPoiPlaces] = useState<PlaceMarker[]>([]);
  const [placesCenter, setPlacesCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [highlightedPlace, setHighlightedPlace] = useState<{
    lat: number;
    lng: number;
    category: "fuel" | "lodging" | "campground" | "dining" | "poi";
  } | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  const [recentWaypointName, setRecentWaypointName] = useState<string | null>(null);
  const waypointToastTimeoutRef = useRef<number | null>(null);

  const [pendingPlace, setPendingPlace] = useState<PanelPlaceItem | null>(null);
  const [zoomHint, setZoomHint] = useState<string | null>(null);
  const zoomHintTimeoutRef = useRef<number | null>(null);

  // Track previous values of show* props to detect when they change from false to true
  const prevShowFuel = useRef(showFuelPlaces);
  const prevShowLodging = useRef(showLodgingPlaces);
  const prevShowCampground = useRef(showCampgroundPlaces);
  const prevShowDining = useRef(showDiningPlaces);
  const prevShowPoi = useRef(showPoiPlaces);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      if (waypointToastTimeoutRef.current !== null) {
        window.clearTimeout(waypointToastTimeoutRef.current);
      }
      if (zoomHintTimeoutRef.current !== null) {
        window.clearTimeout(zoomHintTimeoutRef.current);
      }
    };
  }, []);

  // Trigger places fetch immediately when a checkbox is enabled
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Detect if any show* prop just changed from false to true
    const fuelJustEnabled = showFuelPlaces && !prevShowFuel.current;
    const lodgingJustEnabled = showLodgingPlaces && !prevShowLodging.current;
    const campgroundJustEnabled = showCampgroundPlaces && !prevShowCampground.current;
    const diningJustEnabled = showDiningPlaces && !prevShowDining.current;
    const poiJustEnabled = showPoiPlaces && !prevShowPoi.current;

    // Update refs for next render
    prevShowFuel.current = showFuelPlaces;
    prevShowLodging.current = showLodgingPlaces;
    prevShowCampground.current = showCampgroundPlaces;
    prevShowDining.current = showDiningPlaces;
    prevShowPoi.current = showPoiPlaces;

    const anyJustEnabled =
      fuelJustEnabled ||
      lodgingJustEnabled ||
      campgroundJustEnabled ||
      diningJustEnabled ||
      poiJustEnabled;

    if (!anyJustEnabled) return;

    const zoom = map.getZoom() ?? 0;

    if (zoom < 7) {
      // Show hint to zoom in
      setZoomHint("Zoom in to see nearby places");
      if (zoomHintTimeoutRef.current !== null) {
        window.clearTimeout(zoomHintTimeoutRef.current);
      }
      zoomHintTimeoutRef.current = window.setTimeout(() => {
        setZoomHint(null);
        zoomHintTimeoutRef.current = null;
      }, 3000);
    } else {
      // Trigger fetch immediately by manually calling the idle logic
      const bounds = map.getBounds();
      if (!bounds) return;

      const center = map.getCenter();
      if (center) {
        setPlacesCenter({ lat: center.lat(), lng: center.lng() });
      }

      if (!(google.maps as any).places) return;
      const service = new google.maps.places.PlacesService(map);

      // Only fetch for the categories that were just enabled (to avoid redundant calls)
      if (fuelJustEnabled) {
        service.nearbySearch(
          { bounds, type: "gas_station" },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const filtered = results.filter((r) => {
                const ratingOk = !minPlaceRating || (typeof r.rating === "number" && r.rating >= minPlaceRating);
                const openOk = !onlyOpenNow || r.opening_hours?.open_now === true;
                return ratingOk && openOk;
              });
              setFuelPlaces(
                filtered.slice(0, MAX_PLACES_RESULTS).map((r) => ({
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
      }

      if (lodgingJustEnabled) {
        service.nearbySearch(
          { bounds, type: "lodging" },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const filtered = results.filter((r) => {
                const ratingOk = !minPlaceRating || (typeof r.rating === "number" && r.rating >= minPlaceRating);
                const openOk = !onlyOpenNow || r.opening_hours?.open_now === true;
                return ratingOk && openOk;
              });
              setLodgingPlaces(
                filtered.slice(0, MAX_PLACES_RESULTS).map((r) => ({
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
      }

      if (campgroundJustEnabled) {
        service.nearbySearch(
          { bounds, type: "campground" },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const filtered = results.filter((r) => {
                const ratingOk = !minPlaceRating || (typeof r.rating === "number" && r.rating >= minPlaceRating);
                const openOk = !onlyOpenNow || r.opening_hours?.open_now === true;
                return ratingOk && openOk;
              });
              setCampgroundPlaces(
                filtered.slice(0, MAX_PLACES_RESULTS).map((r) => ({
                  lat: r.geometry?.location?.lat() ?? 0,
                  lng: r.geometry?.location?.lng() ?? 0,
                  name: r.name ?? null,
                  rating: typeof r.rating === "number" ? r.rating : null,
                  openNow: r.opening_hours?.open_now ?? null,
                  category: "campground",
                })),
              );
            }
          },
        );
      }

      if (diningJustEnabled) {
        service.nearbySearch(
          { bounds, type: "restaurant" },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const filtered = results.filter((r) => {
                const ratingOk = !minPlaceRating || (typeof r.rating === "number" && r.rating >= minPlaceRating);
                const openOk = !onlyOpenNow || r.opening_hours?.open_now === true;
                return ratingOk && openOk;
              });
              setDiningPlaces(
                filtered.slice(0, MAX_PLACES_RESULTS).map((r) => ({
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
      }

      if (poiJustEnabled) {
        service.nearbySearch(
          { bounds, type: "tourist_attraction" },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const filtered = results.filter((r) => {
                const ratingOk = !minPlaceRating || (typeof r.rating === "number" && r.rating >= minPlaceRating);
                const openOk = !onlyOpenNow || r.opening_hours?.open_now === true;
                return ratingOk && openOk;
              });
              setPoiPlaces(
                filtered.slice(0, MAX_PLACES_RESULTS).map((r) => ({
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
      }
    }
  }, [showFuelPlaces, showLodgingPlaces, showCampgroundPlaces, showDiningPlaces, showPoiPlaces, minPlaceRating, onlyOpenNow]);

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!onAddWaypoint) return;
      if (!enableClickToAdd) return;
      if (!event.latLng) return;
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      onAddWaypoint({ lat, lng });
    },
    [onAddWaypoint, enableClickToAdd],
  );

  const fitToRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Prefer fitting the full route path if available; otherwise fit all waypoints.
    const points = (routePath && routePath.length > 1 ? routePath : waypoints) ?? [];

    if (!points || points.length === 0) {
      // New-trip workflow or trips without stored waypoints: seed a sensible
      // initial view so the rider doesn't see an empty gray map.
      const initialCenter = (centerOverride as google.maps.LatLngLiteral | undefined) ?? defaultCenter;
      map.setCenter(initialCenter);
      map.setZoom(4);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const p of points) {
      bounds.extend(p as google.maps.LatLngLiteral);
    }

    // Guard against degenerate bounds (all points identical).
    if (bounds.isEmpty()) return;
    map.fitBounds(bounds);
  }, [routePath, waypoints, centerOverride]);

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      fitToRoute();
    },
    [fitToRoute],
  );

  const handleSearchPlacesChanged = useCallback(() => {
    if (!searchBoxRef.current) return;
    const places = searchBoxRef.current.getPlaces();
    if (!places || places.length === 0) return;
    const place = places[0];
    if (!place.geometry || !place.geometry.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    const types = place.types ?? [];
    let category: PanelPlaceItem["category"] = "poi";

    if (types.includes("gas_station")) {
      category = "fuel";
    } else if (types.includes("lodging")) {
      category = "lodging";
    } else if (types.includes("campground")) {
      category = "campground";
    } else if (types.includes("restaurant") || types.includes("cafe") || types.includes("bar")) {
      category = "dining";
    } else if (types.includes("tourist_attraction") || types.includes("point_of_interest")) {
      category = "poi";
    }

    const map = mapRef.current;
    if (map) {
      map.panTo({ lat, lng });
      const zoom = map.getZoom() ?? 0;
      if (zoom < 12) {
        map.setZoom(12);
      }
    }

    // Approximate distance from current map center if available.
    let distanceKm = 0;
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      if (center) {
        distanceKm = haversineKm(
          { lat: center.lat(), lng: center.lng() },
          { lat, lng },
        );
      }
    }

    if (onAddWaypoint) {
      setPendingPlace({
        name: (place.name as string | undefined) ?? "Unnamed",
        category,
        distanceKm,
        rating: typeof place.rating === "number" ? place.rating : null,
        lat,
        lng,
      });
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
        setCampgroundPlaces([]);
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

      if (showCampgroundPlaces) {
        service.nearbySearch(
          {
            bounds,
            type: "campground",
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
              setCampgroundPlaces(
                limited.map((r) => ({
                  lat: r.geometry?.location?.lat() ?? 0,
                  lng: r.geometry?.location?.lng() ?? 0,
                  name: r.name ?? null,
                  rating: typeof r.rating === "number" ? r.rating : null,
                  openNow: r.opening_hours?.open_now ?? null,
                  category: "campground",
                })),
              );
            }
          },
        );
      } else {
        setCampgroundPlaces([]);
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
  }, [showFuelPlaces, showLodgingPlaces, showCampgroundPlaces, showDiningPlaces, showPoiPlaces, minPlaceRating, onlyOpenNow]);

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

  const panelItems: PanelPlaceItem[] = useMemo(() => {
    if (!placesCenter) return [];

    const all: PlaceMarker[] = [];
    if (showFuelPlaces) all.push(...fuelPlaces);
    if (showLodgingPlaces) all.push(...lodgingPlaces);
    if (showCampgroundPlaces) all.push(...campgroundPlaces);
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
  }, [
    placesCenter,
    showFuelPlaces,
    showLodgingPlaces,
    showCampgroundPlaces,
    showDiningPlaces,
    showPoiPlaces,
    fuelPlaces,
    lodgingPlaces,
    campgroundPlaces,
    diningPlaces,
    poiPlaces,
  ]);

  const handlePanelItemClick = useCallback(
    (item: PanelPlaceItem) => {
      const map = mapRef.current;
      if (map) {
        map.panTo({ lat: item.lat, lng: item.lng });
        const zoom = map.getZoom() ?? 0;
        if (zoom < 13) {
          map.setZoom(13);
        }
      }

      // If the parent provides an onAddWaypoint handler (trip detail editor),
      // treat clicking a nearby place row as intent, but confirm with the
      // rider before actually creating the waypoint. This is especially
      // helpful on small screens where new markers may be partially off-view.
      if (onAddWaypoint) {
        setPendingPlace(item);
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
    [onAddWaypoint],
  );

  // Keep a stable logical center; actual viewport is managed imperatively in
  // handleMapLoad (fitBounds / default seed) and by user interactions.
  const center = centerOverride ?? defaultCenter;

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
        zoomControlOptions: {
          position: google.maps.ControlPosition.LEFT_CENTER,
        },
      }}
      aria-label="Trip overview map showing your route and waypoints; use the lists and controls outside the map to review and edit details."
    >
      {recentWaypointName && (
        <div
          className="pointer-events-none flex justify-center"
          style={{ position: "absolute", left: 0, right: 0, top: 40, zIndex: 40 }}
        >
          <div
            className="pointer-events-auto rounded border border-adv-border bg-slate-950/90 px-3 py-1.5 text-[11px] text-slate-100 shadow-adv-glow"
            role="status"
            aria-live="polite"
          >
            Waypoint added: <span className="font-semibold">{recentWaypointName}</span>
          </div>
        </div>
      )}

      {zoomHint && (
        <div
          className="pointer-events-none flex justify-center"
          style={{ position: "absolute", left: 0, right: 0, top: 40, zIndex: 40 }}
        >
          <div
            className="pointer-events-auto rounded border border-amber-500/60 bg-amber-500/20 px-3 py-1.5 text-[11px] text-amber-100 shadow-adv-glow"
            role="status"
            aria-live="polite"
          >
            {zoomHint}
          </div>
        </div>
      )}

      {pendingPlace && onAddWaypoint && (
        <div
          className="pointer-events-none flex justify-center"
          style={{ position: "absolute", left: 0, right: 0, bottom: 24, zIndex: 40 }}
        >
          <div
            className="pointer-events-auto w-[min(280px,90%)] rounded border border-adv-border bg-slate-950/95 px-3 py-2 text-[11px] text-slate-100 shadow-adv-glow"
            role="dialog"
            aria-modal="false"
            aria-label="Add nearby place as waypoint"
          >
            <p className="font-semibold text-slate-100">Add this place as a waypoint?</p>
            <p className="mt-1 truncate text-slate-200">{pendingPlace.name}</p>
            {pendingPlace.distanceKm > 0 || pendingPlace.rating != null ? (
              <p className="mt-0.5 text-[10px] text-slate-400">
                {pendingPlace.distanceKm > 0 ? `${pendingPlace.distanceKm.toFixed(0)} km away` : ""}
                {pendingPlace.rating != null ? ` · ${pendingPlace.rating.toFixed(1)}★` : ""}
              </p>
            ) : null}
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
                onClick={() => setPendingPlace(null)}
              >
                No thanks
              </button>
              <button
                type="button"
                className="rounded bg-adv-accent px-2 py-1 text-[10px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted"
                onClick={() => {
                  const item = pendingPlace;
                  setPendingPlace(null);
                  if (!item || !onAddWaypoint) return;

                  let inferredType: string | null = null;
                  if (item.category === "fuel") inferredType = "FUEL";
                  else if (item.category === "lodging") inferredType = "LODGING";
                  else if (item.category === "campground") inferredType = "CAMPGROUND";
                  else if (item.category === "dining") inferredType = "DINING";
                  else if (item.category === "poi") inferredType = "POI";

                  onAddWaypoint({
                    lat: item.lat,
                    lng: item.lng,
                    type: inferredType,
                    name: item.name,
                  });

                  setRecentWaypointName(item.name || "Waypoint");
                  if (waypointToastTimeoutRef.current !== null) {
                    window.clearTimeout(waypointToastTimeoutRef.current);
                  }
                  waypointToastTimeoutRef.current = window.setTimeout(() => {
                    setRecentWaypointName(null);
                    waypointToastTimeoutRef.current = null;
                  }, 1800);
                }}
              >
                Add waypoint
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Fit route control */}
      <div
        className="pointer-events-auto"
        style={{ position: "absolute", right: 8, top: 8, zIndex: 30 }}
      >
        <button
          type="button"
          onClick={fitToRoute}
          className="rounded border border-adv-border bg-slate-950/80 px-2 py-1 text-[10px] text-slate-200 shadow-adv-glow hover:bg-slate-900"
        >
          Fit route
        </button>
      </div>

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
        } else if (wpType === "CAMPGROUND") {
          icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#14b8a6", // teal for campgrounds
            fillOpacity: 0.95,
            strokeColor: "#0f766e",
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

      {showCampgroundPlaces && campgroundPlaces.length > 0 && (
        <MarkerClusterer>
          {(clusterer) => (
            <>
              {campgroundPlaces.map((p, idx) => {
              const isHighlighted =
                highlightedPlace &&
                highlightedPlace.category === "campground" &&
                highlightedPlace.lat === p.lat &&
                highlightedPlace.lng === p.lng;

              const baseIcon: google.maps.Symbol = {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                fillColor: "#14b8a6",
                fillOpacity: 0.4,
                strokeColor: "#14b8a6",
                strokeOpacity: 0.8,
                strokeWeight: 1,
              };

              const icon = isHighlighted
                ? { ...baseIcon, scale: 6, fillOpacity: 0.9, strokeWeight: 2 }
                : baseIcon;

              return (
                <Marker
                  key={`campground-place-${idx}`}
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
              <li key={`${p.category}-${idx}`}>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded px-1 text-left hover:bg-slate-800/60"
                  onClick={() => handlePanelItemClick(p)}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-slate-400">
                    {p.rating != null ? `${p.rating.toFixed(1)}★ · ` : ""}
                    {p.distanceKm.toFixed(0)} km
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </GoogleMap>
  );
}
