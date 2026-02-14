'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { GoogleMap, Marker, Polyline, useJsApiLoader, MarkerClusterer, StandaloneSearchBox } from "@react-google-maps/api";

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "400px",
  touchAction: "none", // Prevent page scroll/pan when interacting with map on mobile
};

const defaultCenter = { lat: 39.7392, lng: -104.9903 }; // Example default center (Denver)

// Optional "type" is used to visually distinguish waypoints such as FUEL, LODGING, and POI.
// "name" and "googlePlaceId" are used when a waypoint is created from a Places search.
// "isOvernightStop" marks day boundaries for multi-day trips.
export type WaypointPosition = {
  lat: number;
  lng: number;
  type?: string | null;
  name?: string | null;
  googlePlaceId?: string | null;
  isOvernightStop?: boolean;
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

// SVG icons for nearby places markers
// Fuel icon (gas pump) - green
const fuelIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#16a34a" stroke="#fff" stroke-width="1"><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7h1a2 2 0 0 1 2 2v4a1 1 0 0 0 2 0v-7l-2-2V7a1 1 0 0 1 2 0v2l2 2v8a3 3 0 0 1-6 0v-4h-1v7H3z"/><rect x="6" y="8" width="6" height="4" rx="1" fill="#fff"/></svg>`;
const fuelIconSvgHighlight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#22c55e" stroke="#fff" stroke-width="2"><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7h1a2 2 0 0 1 2 2v4a1 1 0 0 0 2 0v-7l-2-2V7a1 1 0 0 1 2 0v2l2 2v8a3 3 0 0 1-6 0v-4h-1v7H3z"/><rect x="6" y="8" width="6" height="4" rx="1" fill="#fff"/></svg>`;

// Lodging icon (hotel building) - blue
const lodgingIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563eb" stroke="#fff" stroke-width="1"><path d="M6 2h12v20H6z"/><rect x="9" y="6" width="2" height="2" fill="#fff"/><rect x="13" y="6" width="2" height="2" fill="#fff"/><rect x="9" y="11" width="2" height="2" fill="#fff"/><rect x="13" y="11" width="2" height="2" fill="#fff"/><path d="M10 22v-5h4v5" fill="#fff"/></svg>`;
const lodgingIconSvgHighlight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" stroke="#fff" stroke-width="2"><path d="M6 2h12v20H6z"/><rect x="9" y="6" width="2" height="2" fill="#fff"/><rect x="13" y="6" width="2" height="2" fill="#fff"/><rect x="9" y="11" width="2" height="2" fill="#fff"/><rect x="13" y="11" width="2" height="2" fill="#fff"/><path d="M10 22v-5h4v5" fill="#fff"/></svg>`;

// Campground icon (tent) - teal
const campgroundIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0d9488" stroke="#fff" stroke-width="1"><path d="M12 3L2 20h20L12 3z"/><path d="M12 14l-3 6h6l-3-6z" fill="#fff"/></svg>`;
const campgroundIconSvgHighlight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#14b8a6" stroke="#fff" stroke-width="2"><path d="M12 3L2 20h20L12 3z"/><path d="M12 14l-3 6h6l-3-6z" fill="#fff"/></svg>`;

// Dining icon (diner building) - rose/pink  
const diningIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#e11d48" stroke="#fff" stroke-width="1"><path d="M8 3h8l2 5H6l2-5z"/><path d="M5 8h14v2H5z"/><path d="M6 10h12v10H6z"/><rect x="9" y="13" width="6" height="4" fill="#fff"/></svg>`;
const diningIconSvgHighlight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f43f5e" stroke="#fff" stroke-width="2"><path d="M8 3h8l2 5H6l2-5z"/><path d="M5 8h14v2H5z"/><path d="M6 10h12v10H6z"/><rect x="9" y="13" width="6" height="4" fill="#fff"/></svg>`;

// POI icon (star/landmark) - amber
const poiIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#d97706" stroke="#fff" stroke-width="1"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/></svg>`;
const poiIconSvgHighlight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59e0b" stroke="#fff" stroke-width="2"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/></svg>`;

// Helper to create icon URL from SVG using base64 encoding
const svgToIconUrl = (svg: string) => {
  if (typeof window !== 'undefined') {
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

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
  /**
   * Index of the focused waypoint - map will pan/zoom to this waypoint when set.
   */
  focusedWaypointIndex?: number | null;
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
  focusedWaypointIndex,
}: TripPlannerMapProps) {
  const t = useTranslations("map");
  const mapRef = useRef<google.maps.Map | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-maps-trip-planner",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: ["places", "geometry"],
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

  // Distance measurement state
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [measureRoadLoading, setMeasureRoadLoading] = useState(false);
  const [measureRoutes, setMeasureRoutes] = useState<{
    distanceKm: number;
    durationMins: number;
    summary: string;
    path: { lat: number; lng: number }[];
  }[]>([]);

  // Zoom level tracking for day labels
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);

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

  // Pan/zoom to focused waypoint when it changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || focusedWaypointIndex === null || focusedWaypointIndex === undefined) return;
    
    const wp = waypoints[focusedWaypointIndex];
    if (!wp) return;
    
    // Pan to the waypoint and zoom in if currently zoomed out
    map.panTo({ lat: wp.lat, lng: wp.lng });
    const currentZoom = map.getZoom() ?? 10;
    if (currentZoom < 12) {
      map.setZoom(12);
    }
  }, [focusedWaypointIndex, waypoints]);

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
      if (!event.latLng) return;
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      // If in measure mode, handle measurement clicks
      if (measureMode) {
        handleMeasurePoint({ lat, lng });
        return;
      }

      // Normal click-to-add waypoint behavior
      if (!onAddWaypoint) return;
      if (!enableClickToAdd) return;
      onAddWaypoint({ lat, lng });
    },
    [onAddWaypoint, enableClickToAdd, measureMode],
  );

  // Handle adding a measurement point (from map click or waypoint click)
  const handleMeasurePoint = useCallback(
    (point: { lat: number; lng: number }) => {
      // If measurement is complete (routes displayed), ignore new clicks - user must Clear first
      if (measureRoutes.length > 0) return;

      setMeasurePoints((prev) => {
        if (prev.length === 0) {
          // First point
          return [point];
        } else if (prev.length === 1) {
          // Second point - fetch road distances with alternatives
          const p1 = prev[0];
          const p2 = point;

          setMeasureRoadLoading(true);
          const directionsService = new google.maps.DirectionsService();
          directionsService.route(
            {
              origin: p1,
              destination: p2,
              travelMode: google.maps.TravelMode.DRIVING,
              provideRouteAlternatives: true,
            },
            (result, status) => {
              setMeasureRoadLoading(false);
              if (status === google.maps.DirectionsStatus.OK && result) {
                const routes = result.routes.map((route) => {
                  const leg = route.legs[0];
                  // Decode the polyline path
                  const path = google.maps.geometry?.encoding?.decodePath(
                    route.overview_polyline
                  ) ?? [];
                  return {
                    distanceKm: (leg?.distance?.value ?? 0) / 1000,
                    durationMins: Math.round((leg?.duration?.value ?? 0) / 60),
                    summary: route.summary || "Route",
                    path: path.map((p) => ({ lat: p.lat(), lng: p.lng() })),
                  };
                });
                // Sort by distance
                routes.sort((a, b) => a.distanceKm - b.distanceKm);
                setMeasureRoutes(routes);
              }
            }
          );

          return [p1, p2];
        } else {
          // Should not reach here since we check measureRoutes.length above
          return prev;
        }
      });
    },
    [measureRoutes.length]
  );

  // Toggle measure mode - auto-start from last waypoint when entering
  const handleMeasureToggle = useCallback(() => {
    setMeasureMode((prev) => {
      if (prev) {
        // Exiting measure mode - clear everything
        setMeasurePoints([]);
        setMeasureRoutes([]);
      } else {
        // Entering measure mode - auto-set start to last waypoint if available
        if (waypoints.length > 0) {
          const lastWp = waypoints[waypoints.length - 1];
          setMeasurePoints([{ lat: lastWp.lat, lng: lastWp.lng }]);
          // Zoom to last waypoint at ~300km scale (zoom level 7)
          const map = mapRef.current;
          if (map) {
            map.panTo({ lat: lastWp.lat, lng: lastWp.lng });
            map.setZoom(7);
          }
        }
      }
      return !prev;
    });
  }, [waypoints]);

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

  // Track zoom and bounds changes for day labels visibility
  const handleZoomChanged = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const zoom = map.getZoom() ?? 10;
    setCurrentZoom(zoom);
    const bounds = map.getBounds();
    if (bounds) setMapBounds(bounds);
  }, []);

  const handleMapIdle = useCallback(() => {
    if (!mapRef.current) return;

    // Also update zoom and bounds on idle as backup
    const zoom = mapRef.current.getZoom() ?? 10;
    setCurrentZoom(zoom);
    const bounds = mapRef.current.getBounds();
    if (bounds) setMapBounds(bounds);

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

  // Compute day segments based on overnight stops
  const daySegments = useMemo(() => {
    if (waypoints.length < 2) return [];

    const segments: { day: number; waypoints: WaypointPosition[] }[] = [];
    let currentDay = 1;
    let currentSegment: WaypointPosition[] = [];

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      currentSegment.push(wp);
      
      const isLastWaypoint = i === waypoints.length - 1;
      const isOvernightStop = wp.isOvernightStop === true;

      // End of a day segment: either overnight stop or last waypoint
      if (isOvernightStop || isLastWaypoint) {
        segments.push({ day: currentDay, waypoints: [...currentSegment] });
        
        // Start next day after overnight stop (overnight wp is shared)
        if (isOvernightStop && !isLastWaypoint) {
          currentDay++;
          currentSegment = [wp]; // Next day starts from the overnight stop
        }
      }
    }

    return segments;
  }, [waypoints]);

  // Route colors for alternating days (high contrast)
  const DAY_COLORS = {
    odd: "#0d9488",   // teal-600
    even: "#d97706",  // amber-600
  };

  // Split routePath into day segments for colored rendering
  const dayRoutePaths = useMemo(() => {
    if (!routePath || routePath.length === 0 || daySegments.length === 0) return [];

    // Helper to find closest index in routePath to a waypoint
    const findClosestRouteIndex = (wp: { lat: number; lng: number }, startFrom: number = 0): number => {
      let closestIndex = startFrom;
      let closestDist = Infinity;
      for (let i = startFrom; i < routePath.length; i++) {
        const rp = routePath[i];
        const dist = Math.pow(rp.lat - wp.lat, 2) + Math.pow(rp.lng - wp.lng, 2);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
        // Optimization: if we're getting farther away, we've likely passed the closest point
        if (dist > closestDist * 4 && i > closestIndex + 10) break;
      }
      return closestIndex;
    };

    const paths: { day: number; path: { lat: number; lng: number }[]; color: string }[] = [];
    let lastRouteIndex = 0;

    for (const segment of daySegments) {
      if (segment.waypoints.length < 2) continue;

      const startWp = segment.waypoints[0];
      const endWp = segment.waypoints[segment.waypoints.length - 1];

      const startIndex = findClosestRouteIndex(startWp, lastRouteIndex);
      const endIndex = findClosestRouteIndex(endWp, startIndex);

      if (endIndex > startIndex) {
        const segmentPath = routePath.slice(startIndex, endIndex + 1);
        const color = segment.day % 2 === 1 ? DAY_COLORS.odd : DAY_COLORS.even;
        paths.push({ day: segment.day, path: segmentPath, color });
        lastRouteIndex = endIndex;
      }
    }

    return paths;
  }, [routePath, daySegments]);

  // Compute visible day labels within current viewport
  const visibleDayLabels = useMemo(() => {
    if (!mapBounds || daySegments.length === 0 || dayRoutePaths.length === 0) return [];

    const labels: { day: number; lat: number; lng: number; text: string }[] = [];

    for (const segment of daySegments) {
      // Find the corresponding route path for this day
      const dayPath = dayRoutePaths.find(p => p.day === segment.day);
      if (!dayPath || dayPath.path.length < 2) continue;

      // Find route points within the viewport
      const visibleRoutePoints = dayPath.path.filter(pt => 
        mapBounds.contains({ lat: pt.lat, lng: pt.lng })
      );

      if (visibleRoutePoints.length > 0) {
        // Place label at the midpoint of visible route segment
        const midIndex = Math.floor(visibleRoutePoints.length / 2);
        const midPoint = visibleRoutePoints[midIndex];
        
        // Calculate offset to move label away from route line and waypoints
        // Use a northward offset (positive lat) to position above the route
        // The offset scales inversely with zoom - smaller offset at higher zoom
        const zoomFactor = Math.max(1, 12 - (currentZoom ?? 8));
        const latOffset = 0.008 * zoomFactor; // ~800m at zoom 8, less at higher zoom
        
        // Check distance to nearest waypoint and increase offset if too close
        let finalLat = midPoint.lat + latOffset;
        const finalLng = midPoint.lng;
        
        // Find minimum distance to any waypoint in this segment
        const minWpDistSq = segment.waypoints.reduce((min, wp) => {
          const distSq = Math.pow(midPoint.lat - wp.lat, 2) + Math.pow(midPoint.lng - wp.lng, 2);
          return Math.min(min, distSq);
        }, Infinity);
        
        // If very close to a waypoint, shift the label further
        const minDistThreshold = 0.0001 * zoomFactor; // threshold in degrees squared
        if (minWpDistSq < minDistThreshold) {
          finalLat += latOffset * 0.5; // Additional offset
        }
        
        labels.push({
          day: segment.day,
          lat: finalLat,
          lng: finalLng,
          text: t("dayLabel", { day: segment.day }),
        });
      }
    }

    return labels;
  }, [mapBounds, daySegments, dayRoutePaths, currentZoom, t]);

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
      onZoomChanged={handleZoomChanged}
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
            className="pointer-events-auto rounded border-2 border-amber-400 bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg"
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
              placeholder={t("searchPlaceholder")}
              className="w-64 rounded border border-adv-border bg-slate-950/90 px-2 py-1 text-[11px] text-slate-100 shadow-adv-glow placeholder:text-slate-500"
            />
          </StandaloneSearchBox>
        </div>
      )}

      {/* Fit route and measure controls */}
      <div
        className="pointer-events-auto flex gap-1"
        style={{ position: "absolute", right: 8, top: 8, zIndex: 30 }}
      >
        <button
          type="button"
          onClick={handleMeasureToggle}
          className={`rounded border px-2 py-1 text-[10px] shadow-adv-glow ${
            measureMode
              ? "border-amber-400 bg-amber-500/20 text-amber-200"
              : "border-adv-border bg-slate-950/80 text-slate-200 hover:bg-slate-900"
          }`}
          title={t("measureTooltip")}
        >
          📏 {t("measure")}
        </button>
        <button
          type="button"
          onClick={fitToRoute}
          className="rounded border border-adv-border bg-slate-950/80 px-2 py-1 text-[10px] text-slate-200 shadow-adv-glow hover:bg-slate-900"
        >
          {t("fitRoute")}
        </button>
      </div>

      {/* Measure mode instruction banner */}
      {measureMode && measurePoints.length === 0 && (
        <div
          className="pointer-events-none flex justify-center"
          style={{ position: "absolute", left: 0, right: 0, top: 40, zIndex: 40 }}
        >
          <div
            className="pointer-events-auto rounded border-2 border-amber-400 bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg"
            role="status"
          >
            {t("clickStartPoint")}
          </div>
        </div>
      )}

      {measureMode && measurePoints.length === 1 && !measureRoadLoading && measureRoutes.length === 0 && (
        <div
          className="pointer-events-none flex justify-center"
          style={{ position: "absolute", left: 0, right: 0, top: 40, zIndex: 40 }}
        >
          <div
            className="pointer-events-auto rounded border-2 border-amber-400 bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg"
            role="status"
          >
            {t("clickDestination")}
          </div>
        </div>
      )}

      {/* Measurement result overlay */}
      {measureMode && measurePoints.length === 2 && (
        <div
          className="pointer-events-none flex justify-center"
          style={{ position: "absolute", left: 0, right: 0, top: 40, zIndex: 40 }}
        >
          <div
            className="pointer-events-auto rounded border border-adv-border bg-slate-950/95 px-4 py-2 text-[11px] text-slate-100 shadow-adv-glow"
            role="status"
          >
            {measureRoadLoading ? (
              <div className="text-slate-400">{t("calculatingRoutes")}</div>
            ) : measureRoutes.length > 0 ? (
              <div className="space-y-1.5">
                {measureRoutes.map((route, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {idx === 0 ? (
                      <span className="text-[9px] font-semibold text-adv-accent">{t("fastest")}</span>
                    ) : (
                      <span className="text-[9px] text-slate-500">{t("alt")} {idx}</span>
                    )}
                    <span className="font-semibold text-slate-100">
                      {route.distanceKm.toFixed(1)} km
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-300">
                      {route.durationMins >= 60
                        ? `${Math.floor(route.durationMins / 60)}h ${route.durationMins % 60}m`
                        : `${route.durationMins}m`}
                    </span>
                    <span className="text-[10px] text-slate-300">{t("via")} {route.summary}</span>
                  </div>
                ))}
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMeasurePoints([]);
                      setMeasureRoutes([]);
                    }}
                    className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                  >
                    {t("clear")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-slate-500">{t("noRouteFound")}</div>
            )}
          </div>
        </div>
      )}

      {/* Measurement markers */}
      <Marker
        key="measure-start"
        position={measurePoints[0] ?? { lat: 0, lng: 0 }}
        visible={measureMode && measurePoints.length >= 1}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#f59e0b",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        }}
        zIndex={100}
      />
      <Marker
        key="measure-end"
        position={measurePoints[1] ?? { lat: 0, lng: 0 }}
        visible={measureMode && measurePoints.length === 2}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#f59e0b",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        }}
        zIndex={100}
      />

      {/* Measurement route polylines - always rendered, visibility controlled */}
      <Polyline
        key="measure-route-0"
        path={measureRoutes[0]?.path ?? []}
        visible={measureMode && measureRoutes.length >= 1}
        options={{
          strokeColor: "#f59e0b",
          strokeOpacity: 0.9,
          strokeWeight: 5,
          zIndex: 50,
        }}
      />
      <Polyline
        key="measure-route-1"
        path={measureRoutes[1]?.path ?? []}
        visible={measureMode && measureRoutes.length >= 2}
        options={{
          strokeColor: "#94a3b8",
          strokeOpacity: 0.5,
          strokeWeight: 3,
          zIndex: 40,
        }}
      />
      <Polyline
        key="measure-route-2"
        path={measureRoutes[2]?.path ?? []}
        visible={measureMode && measureRoutes.length >= 3}
        options={{
          strokeColor: "#94a3b8",
          strokeOpacity: 0.5,
          strokeWeight: 3,
          zIndex: 40,
        }}
      />

      {/* Route polylines - colored by day (alternating green/cyan) */}
      {dayRoutePaths.length > 0 ? (
        dayRoutePaths.map((segment) => (
          <Polyline
            key={`route-day-${segment.day}`}
            path={segment.path}
            options={{
              strokeColor: segment.color,
              strokeOpacity: 0.85,
              strokeWeight: 4,
            }}
          />
        ))
      ) : (
        // Fallback: single color if no day segments computed
        routePath && routePath.length > 0 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: "#22c55e",
              strokeOpacity: 0.9,
              strokeWeight: 4,
            }}
          />
        )
      )}

      {/* Day labels - sundial style with dark high-contrast colors */}
      {currentZoom >= 6 && visibleDayLabels.map((label) => {
        // Dark colors: deep teal-900 for odd days, dark amber-900 for even days
        const colors = label.day % 2 === 1 
          ? { fill: "19,78,74", stroke: "17,94,89", text: "15,63,58" }      // teal-900/800
          : { fill: "120,53,15", stroke: "146,64,14", text: "92,45,13" };   // amber-900/800
        
        const svgSundial = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60">
          <!-- Drop shadow -->
          <path d="M 6,34 A 18,18 0 0,1 42,34" fill="rgba(0,0,0,0.2)" transform="translate(1,1)"/>
          <!-- Sundial base arc -->
          <path d="M 6,34 A 18,18 0 0,1 42,34" fill="rgb(255,255,255)" stroke="rgb(${colors.stroke})" stroke-width="2"/>
          <!-- Hour lines -->
          <line x1="24" y1="34" x2="24" y2="18" stroke="rgb(${colors.fill})" stroke-width="1.5" opacity="0.5"/>
          <line x1="24" y1="34" x2="14" y2="20" stroke="rgb(${colors.fill})" stroke-width="1" opacity="0.4"/>
          <line x1="24" y1="34" x2="34" y2="20" stroke="rgb(${colors.fill})" stroke-width="1" opacity="0.4"/>
          <line x1="24" y1="34" x2="8" y2="28" stroke="rgb(${colors.fill})" stroke-width="1" opacity="0.3"/>
          <line x1="24" y1="34" x2="40" y2="28" stroke="rgb(${colors.fill})" stroke-width="1" opacity="0.3"/>
          <!-- Gnomon -->
          <polygon points="24,34 21,17 27,17" fill="rgb(${colors.fill})"/>
          <!-- Day text -->
          <text x="24" y="43" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-style="italic" font-weight="500" fill="rgb(${colors.text})">${label.text}</text>
        </svg>`;

        return (
          <Marker
            key={`day-label-${label.day}`}
            position={{ lat: label.lat, lng: label.lng }}
            icon={{
              url: `data:image/svg+xml;base64,${btoa(svgSundial)}`,
              scaledSize: new google.maps.Size(48, 60),
              anchor: new google.maps.Point(24, 60), // Anchor at bottom with 16px padding below text
            }}
            zIndex={200}
            clickable={false}
          />
        );
      })}

      {waypoints.map((position, index) => {
        const wpType = position.type ?? null;

        let icon: google.maps.Icon | google.maps.Symbol | undefined;
        let zIndex: number | undefined;

        // Rider-defined waypoints use SVG icons for better visual recognition
        if (wpType === "FUEL") {
          icon = {
            url: svgToIconUrl(fuelIconSvg),
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14),
          };
          zIndex = 10;
        } else if (wpType === "LODGING") {
          icon = {
            url: svgToIconUrl(lodgingIconSvg),
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14),
          };
          zIndex = 9;
        } else if (wpType === "CAMPGROUND") {
          icon = {
            url: svgToIconUrl(campgroundIconSvg),
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14),
          };
          zIndex = 9;
        } else if (wpType === "DINING") {
          icon = {
            url: svgToIconUrl(diningIconSvg),
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14),
          };
          zIndex = 9;
        } else if (wpType === "POI") {
          icon = {
            url: svgToIconUrl(poiIconSvg),
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14),
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
              // In measure mode, use waypoint as measurement point
              if (measureMode) {
                handleMeasurePoint({ lat: position.lat, lng: position.lng });
                return;
              }
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

              const icon = {
                url: svgToIconUrl(isHighlighted ? fuelIconSvgHighlight : fuelIconSvg),
                scaledSize: new google.maps.Size(isHighlighted ? 32 : 24, isHighlighted ? 32 : 24),
                anchor: new google.maps.Point(isHighlighted ? 16 : 12, isHighlighted ? 16 : 12),
              };

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

              const icon = {
                url: svgToIconUrl(isHighlighted ? lodgingIconSvgHighlight : lodgingIconSvg),
                scaledSize: new google.maps.Size(isHighlighted ? 32 : 24, isHighlighted ? 32 : 24),
                anchor: new google.maps.Point(isHighlighted ? 16 : 12, isHighlighted ? 16 : 12),
              };

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

              const icon = {
                url: svgToIconUrl(isHighlighted ? campgroundIconSvgHighlight : campgroundIconSvg),
                scaledSize: new google.maps.Size(isHighlighted ? 32 : 24, isHighlighted ? 32 : 24),
                anchor: new google.maps.Point(isHighlighted ? 16 : 12, isHighlighted ? 16 : 12),
              };

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

              const icon = {
                url: svgToIconUrl(isHighlighted ? diningIconSvgHighlight : diningIconSvg),
                scaledSize: new google.maps.Size(isHighlighted ? 32 : 24, isHighlighted ? 32 : 24),
                anchor: new google.maps.Point(isHighlighted ? 16 : 12, isHighlighted ? 16 : 12),
              };

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

              const icon = {
                url: svgToIconUrl(isHighlighted ? poiIconSvgHighlight : poiIconSvg),
                scaledSize: new google.maps.Size(isHighlighted ? 32 : 24, isHighlighted ? 32 : 24),
                anchor: new google.maps.Point(isHighlighted ? 16 : 12, isHighlighted ? 16 : 12),
              };

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
          style={{ position: "absolute", right: 8, bottom: 8, maxWidth: 280, maxHeight: 200, overflowY: "auto" }}
        >
          <p className="mb-1 font-semibold text-[11px] text-slate-100">Nearby places</p>
          <ul className="space-y-1">
            {panelItems.map((p, idx) => {
              // Color-coded dot matching marker colors
              const categoryColors: Record<string, string> = {
                fuel: "bg-green-500",
                lodging: "bg-blue-500",
                campground: "bg-teal-500",
                dining: "bg-rose-500",
                poi: "bg-amber-500",
              };
              const dotColor = categoryColors[p.category] || "bg-slate-400";
              
              return (
                <li key={`${p.category}-${idx}`}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2 rounded px-1 text-left hover:bg-slate-800/60"
                    onClick={() => handlePanelItemClick(p)}
                  >
                    <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotColor}`} />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="flex-shrink-0 text-slate-400">
                      {p.rating != null ? `${p.rating.toFixed(1)}★ · ` : ""}
                      {p.distanceKm.toFixed(0)} km
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </GoogleMap>
  );
}
