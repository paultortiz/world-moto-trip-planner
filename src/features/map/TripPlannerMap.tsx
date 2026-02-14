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
  /**
   * Optional React node containing nearby places controls to show in fullscreen mode.
   */
  nearbyPlacesControls?: React.ReactNode;
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
  nearbyPlacesControls,
}: TripPlannerMapProps) {
  const t = useTranslations("map");
  const mapRef = useRef<google.maps.Map | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
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

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Track fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
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

  const toggleFullscreen = useCallback(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request failed:", err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

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

  // Dynamic container style for fullscreen
  const dynamicContainerStyle: React.CSSProperties = isFullscreen
    ? { width: "100%", height: "100vh", touchAction: "none" }
    : containerStyle;

  return (
    <div ref={mapContainerRef} className="relative">
    <GoogleMap
      mapContainerStyle={dynamicContainerStyle}
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

      {/* Fit route, measure, and fullscreen controls */}
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
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded border border-adv-border bg-slate-950/80 px-2 py-1 text-[10px] text-slate-200 shadow-adv-glow hover:bg-slate-900"
          title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
        >
          {isFullscreen ? "⛶" : "⛶"}
        </button>
      </div>

      {/* Nearby places controls panel - shown in fullscreen mode */}
      {isFullscreen && nearbyPlacesControls && (
        <div
          className="pointer-events-auto"
          style={{ position: "absolute", left: 8, bottom: 8, zIndex: 30, maxWidth: "calc(100% - 300px)" }}
        >
          <div className="rounded border border-adv-border bg-slate-950/95 p-2 text-[11px] text-slate-200 shadow-adv-glow">
            {nearbyPlacesControls}
          </div>
        </div>
      )}

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

      {/* Day labels - motorcycle icon with day badge */}
      {currentZoom >= 6 && visibleDayLabels.map((label) => {
        // Colors: teal for odd days, amber for even days (matching route colors)
        const colors = label.day % 2 === 1 
          ? { fill: "#0d9488", stroke: "#115e59", badge: "#134e4a", text: "#ffffff" }  // teal
          : { fill: "#d97706", stroke: "#92400e", badge: "#78350f", text: "#ffffff" }; // amber
        
        // Motorcycle path traced from Freepik icon
        const motoPath = "M 81.5,414.5226 C 26.008986,404.24168 -1.8687761,339.73769 28.889986,292.79274 52.62658,256.56523 100.53487,245.3486 136.97772,267.48647 l 5.95669,3.61849 3.00348,-3.30248 c 1.65192,-1.81636 3.00441,-3.52748 3.00554,-3.80248 0.001,-0.275 -10.92451,-7.756 -24.2792,-16.62443 l -24.28125,-16.12444 -24.17319,4.12444 -24.173191,4.12443 -19.12738,23 c -10.520059,12.65 -20.090794,23.54655 -21.2683,24.21456 -3.353827,1.90266 -6.5171921,1.50008 -9.1863735,-1.16911 -4.5393842,-4.53938 -3.5562568,-7.08065 8.1404865,-21.0422 5.827268,-6.95559 10.439768,-12.78515 10.25,-12.95458 -0.189768,-0.16944 -2.691374,-1.4866 -5.559126,-2.92702 -7.7382428,-3.88679 -9.6133265,-9.38514 -4.831361,-14.1671 3.309035,-3.30904 6.324688,-3.09446 14.521221,1.03325 l 6.925838,3.48779 5.744091,-6.98226 c 3.159249,-3.84025 6.443888,-7.18259 7.299197,-7.42743 0.85531,-0.24483 7.967608,-1.46495 15.805108,-2.71136 7.8375,-1.24641 14.25,-2.52605 14.25,-2.84364 0,-0.31759 -5.461557,-3.26247 -12.136793,-6.54417 L 50.726414,206.5 41.363207,192.50535 C 35.105389,183.15215 32,177.58179 32,175.7099 32,172.61384 35.915521,168 38.542981,168 c 0.898639,0 16.331594,1.83789 34.295454,4.0842 l 32.661565,4.08421 39.87666,11.96537 39.87667,11.96538 26.12333,3.371 c 14.36784,1.85406 28.08401,4.07878 30.48038,4.94383 10.14188,3.66106 17.65838,11.83156 24.97274,27.1456 3.01393,6.31026 4.01605,7.42062 10.56478,11.70597 4.47862,2.93072 8.35326,4.73379 10.17022,4.73274 2.31325,-0.001 10.01876,-5.51071 36.36408,-26 36.0211,-28.01434 36.73956,-28.42079 41.61659,-23.54375 2.91397,2.91396 3.22403,7.45091 0.70455,10.30926 -3.38725,3.84284 -65.67114,51.52285 -69.68559,53.34621 -4.4873,2.03813 -11.24971,2.41422 -16.47321,0.91614 -1.86757,-0.53562 -6.84069,-3.23562 -11.05136,-6 L 261.38407,256 237.92704,256 H 214.47 L 176.985,243.51192 C 137.51042,230.36101 136,229.63618 136,223.84376 136,220.28442 139.9438,216 143.22017,216 c 1.27109,0 18.49702,5.4 38.27983,12 l 35.96875,12 16.78247,0 16.78247,0 -2.4236,-4.75 c -2.89451,-5.67294 -6.8419,-9.61661 -11.61009,-11.59915 -1.925,-0.80039 -14.975,-2.88722 -29,-4.6374 l -25.5,-3.18215 -39.94628,-11.98615 -39.94627,-11.98616 -22.549953,-2.84993 c -12.402474,-1.56747 -22.696346,-2.70354 -22.875271,-2.52462 -0.178925,0.17893 0.692326,1.87775 1.936113,3.77517 1.881896,2.87086 6.176168,5.40511 25.587058,15.10011 21.572263,10.77452 26.838623,13.99892 70.060113,42.89527 L 201.5,279.5 l 31,0.5 c 30.86934,0.49789 31.02355,0.51104 36.58648,3.11982 10.74314,5.03805 17.59793,15.03171 18.6492,27.1888 0.50177,5.80264 0.86436,6.53951 5.77474,11.73597 8.36974,8.85736 9.77158,12.42668 10.29216,26.20541 l 0.44393,11.75 h 5.48515 5.48516 l -0.69597,-2.75 c -2.64946,-10.46899 -3.59606,-46.30746 -1.5132,-57.29035 3.26564,-17.21966 15.08689,-28.93366 53.99235,-53.50253 8.525,-5.38355 15.85467,-10.09093 16.28815,-10.46085 0.7231,-0.61706 -23.03628,-62.74094 -26.71917,-69.86288 C 354.17438,161.50275 350.36084,160 341.00421,160 c -7.26148,0 -8.34789,-0.25277 -10.54966,-2.45455 C 325.13542,152.22633 329.02611,144 336.86094,144 l 3.95186,0 -1.13601,-3.75 c -0.64307,-2.12279 -3.26554,-5.89134 -6.04364,-8.68486 l -4.90762,-4.93485 -1.41523,3.54824 c -2.36166,5.92111 -8.65369,7.56899 -12.85575,3.36692 C 312.06535,131.15626 312,130.68911 312,116 c 0,-14.68911 0.0654,-15.15626 2.45455,-17.545455 5.01094,-5.010948 12.23787,-2.166633 13.2267,5.205665 0.51988,3.87602 1.08788,4.50156 8.91538,9.81857 11.43742,7.76913 15.93445,13.95117 20.38361,28.02122 0.8619,2.72566 3.21308,5.78595 7.3801,9.60589 l 6.11525,5.6059 9.50457,-6.3559 C 385.79128,146.46988 390.53242,144 392.18082,144 c 1.739,0 5.46911,2.09125 10.50763,5.89101 22.21368,16.75226 38.91389,42.60862 44.31064,68.60463 1.39283,6.70922 0.25285,10.61291 -3.61373,12.37464 -3.15203,1.43616 -28.81395,1.5059 -31.46796,0.0855 C 409.49113,229.6573 392,194.97517 392,191.46277 c 0,-1.47197 1.10642,-3.58366 2.60568,-4.97313 2.26577,-2.09985 3.72394,-2.45235 11.17823,-2.70225 l 8.57256,-0.28739 -8.31445,-8.7789 c -4.57294,-4.82839 -9.62064,-9.70899 -11.2171,-10.84577 l -2.90265,-2.06687 -7.44822,4.84577 c -4.09652,2.66517 -7.4632,5.29577 -7.4815,5.84577 -0.0183,0.55 7.49152,20.26628 16.68851,43.81396 15.34043,39.27717 16.89102,42.76437 18.77036,42.21372 7.16089,-2.09814 20.03251,-2.87122 28.98304,-1.74074 12.88018,1.6268 19.97016,4.36148 21.6173,8.33801 1.62499,3.92307 0.34644,7.79421 -3.23889,9.80661 -2.40013,1.34716 -3.37828,1.30121 -9.9868,-0.46907 -7.60377,-2.03688 -25.56001,-2.73808 -31.00677,-1.21083 l -2.68069,0.75166 3.03469,7.451 3.03469,7.45101 6.146,-0.5619 c 29.91368,-2.73483 55.86256,25.30198 50.81763,54.90657 -1.81297,10.63891 -5.99607,18.75963 -13.5592,26.32277 -18.63539,18.63538 -46.86111,19.05297 -66.37985,0.98206 -20.40689,-18.89318 -20.05272,-50.57222 0.78105,-69.8611 l 6.98283,-6.46503 -2.58294,-6.86435 c -1.42062,-3.77539 -2.7392,-7.02123 -2.93018,-7.21297 -0.19098,-0.19174 -2.85747,1.31758 -5.92553,3.35404 -8.44945,5.60842 -16.04474,14.65224 -21.39427,25.47445 -3.57264,7.22751 -5.31447,9.70089 -7.33112,10.41011 -3.68958,1.29755 -8.35277,-0.81781 -9.86826,-4.47653 -1.03103,-2.48913 -0.87218,-3.81141 1.08733,-9.0511 4.9991,-13.36748 17.21565,-28.14507 30.28132,-36.62942 7.583,-4.92411 7.52923,-4.72317 3.67189,-13.72198 l -2.00378,-4.67463 -3.75045,2.25377 c -2.06275,1.23957 -10.72546,6.82323 -19.25046,12.40812 -26.59933,17.42573 -35.20831,25.38418 -37.88371,35.02105 -1.4268,5.13938 -1.45765,41.2281 -0.0419,49.04708 0.5909,3.26351 2.3909,8.28934 4,11.16851 3.57783,6.40181 3.68674,9.59496 0.43809,12.84361 l -2.48755,2.48754 -82.85658,-0.283 -82.85659,-0.283 -2.90586,4.8256 c -1.59823,2.65408 -6.05587,7.97841 -9.90587,11.83183 -18.77514,18.79185 -45.25884,27.13428 -71,22.36517 z m 28,-16.02195 c 9.28367,-1.94244 21.66787,-8.18325 28.67349,-14.44951 6.62163,-5.92281 13.24998,-14.55694 12.32463,-16.05418 -0.3541,-0.57294 -3.34151,-2.40351 -6.63869,-4.06792 l -5.99488,-3.02621 -6.51166,7.03319 C 112.28104,388.53538 82.067256,389.25244 62.387581,369.57277 47.803315,354.9885 44.125789,334.15006 52.847195,315.51284 56.66231,307.36013 59.917358,304 64,304 c 3.904275,0 8,3.89964 8,7.617 0,1.48935 -1.319286,4.7723 -2.931746,7.29545 -10.279973,16.08593 -4.031871,37.52431 13.431746,46.08679 4.095855,2.00821 6.537047,2.45597 13.5,2.47614 7.80826,0.0226 9.01474,-0.25446 14.82498,-3.40467 5.29919,-2.87312 12.19122,-9.1306 12.16896,-11.04855 C 122.9906,352.73497 115.09448,348.225 105.447,343 81.793922,330.18968 77.571518,325.71983 77.580134,313.5 c 0.0049,-7.00444 2.461538,-13.2 7.516945,-18.95779 4.551647,-5.18404 9.949643,-7.49312 17.580261,-7.52025 5.16902,-0.0184 7.29099,0.56123 13,3.55091 l 6.82266,3.57288 4.73809,-5.32288 c 5.47655,-6.15246 5.53988,-6.00869 -4.82565,-10.95465 -23.533776,-11.22923 -52.390906,-5.93318 -71.434156,13.11006 -25.264037,25.26404 -25.249223,64.70296 0.03385,90.11617 15.458683,15.53826 36.907507,21.9215 58.487867,17.4062 z m 336,-33.58023 c 22.36611,-10.61361 24.72212,-41.88356 4.1745,-55.40547 -5.7918,-3.81144 -12.51536,-5.81835 -17.87834,-5.33649 l -3.57858,0.32154 5.88339,15 c 3.23587,8.25 5.88691,16.03295 5.89121,17.29545 0.0109,3.20115 -4.28127,7.20455 -7.72422,7.20455 -5.05036,0 -6.64755,-2.25539 -12.72042,-17.96242 -4.38404,-11.33903 -6.23957,-15.05096 -7.41094,-14.82537 -2.42418,0.46685 -8.7286,9.4652 -10.522,15.01813 -5.35588,16.58353 3.49911,34.02458 20.39079,40.1623 6.31088,2.2931 16.96704,1.62537 23.49461,-1.47222 z m -243.58333,-5.29346 c -1.86369,-1.66853 -96.28121,-56.55591 -97.64436,-56.76322 -4.00282,-0.60875 -7.258365,1.1886 -9.260149,5.11242 -2.470621,4.84282 -2.532483,7.17875 -0.262161,9.89935 1.664392,1.9945 68.317,38.88361 74.03025,40.97229 2.47561,0.90505 34.10781,1.64884 33.13642,0.77916 z m 85.92435,-10.07383 c -0.3354,-10.27457 -0.39549,-10.50303 -3.64372,-13.85198 l -3.3027,-3.40511 -3.1973,3.00801 c -8.91069,8.38315 -23.70503,10.75202 -34.78378,5.56958 -14.32161,-6.6994 -21.89159,-22.7004 -17.47739,-36.94273 0.92578,-2.98699 1.92392,-6.00854 2.2181,-6.71454 0.42081,-1.00993 -1.8651,-1.22315 -10.72061,-1 L 205.67816,296.5 202.81788,305 c -2.6632,7.91433 -2.84159,9.42074 -2.58908,21.86288 l 0.2712,13.36289 16.5,9.81417 16.5,9.81418 27.34102,0.0729 L 288.18205,360 Z M 184,320.18759 c 0,-8.26375 0.47348,-11.21315 3,-18.68759 1.65,-4.88135 3,-9.23281 3,-9.66991 C 190,291.16685 163.69839,273 162.73817,273 c -0.17305,0 -2.01915,2.03913 -4.10243,4.5314 l -3.78778,4.5314 2.90964,3.31391 c 7.04246,8.02092 13.56766,21.61431 16.30829,33.97366 1.09674,4.94592 1.84896,6.21224 4.8657,8.19116 1.96263,1.28744 3.90591,2.36728 4.31841,2.39964 0.4125,0.0324 0.75,-4.35676 0.75,-9.75358 z m 78.32881,6.44838 c 10.27462,-4.293 12.77936,-17.7631 4.78884,-25.75362 -11.2351,-11.23509 -29.64576,-1.17188 -26.68915,14.58821 1.76619,9.41462 12.72217,15.00029 21.90031,11.16541 z M 154.48214,310.25 c -0.84959,-2.0625 -3.43342,-6.55345 -5.74185,-9.9799 l -4.19714,-6.2299 -3.77157,3.68285 C 138.69721,299.74862 137,301.73732 137,302.14239 c 0,0.56381 17.51491,11.58869 18.76342,11.81076 0.14488,0.0258 -0.4317,-1.64065 -1.28128,-3.70315 z m 275.47826,-95 c -0.0218,-0.4125 -1.26922,-3.9 -2.77208,-7.75 l -2.73249,-7 -5.76472,-0.301 -5.76472,-0.301 4.04797,8.051 4.04796,8.051 h 4.48884 c 2.46886,0 4.47102,-0.3375 4.44924,-0.75 z M 417,414.50398 c -32.35734,-6.51173 -57.34062,-31.79003 -63.59101,-64.34195 -2.18057,-11.35635 -1.89344,-16.76849 1.04556,-19.70748 2.93,-2.93001 7.38624,-3.2138 10.52718,-0.67043 1.795,1.45351 2.38306,3.42 3.17332,10.61183 1.90239,17.31283 7.72307,29.70826 19.36394,41.23652 24.86103,24.62052 64.60305,24.3667 89.54162,-0.57186 24.57532,-24.57533 25.22012,-62.55418 1.50837,-88.84372 C 474.59161,287.80712 472,284.04831 472,282.68939 c 0,-2.97447 2.62505,-6.59634 5.60091,-7.72776 3.51897,-1.33791 6.69679,0.25954 12.45898,6.26294 11.18663,11.65492 19.04509,28.63782 21.21827,45.85476 4.37634,34.67146 -16.9793,70.33306 -49.7121,83.0138 -14.76888,5.72149 -30.37714,7.26629 -44.56606,4.41085 z";
        
        const svgMoto = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="38" viewBox="0 0 42 38">
          <!-- Background pill for visibility -->
          <rect x="1" y="1" width="40" height="22" rx="4" fill="white" stroke="${colors.stroke}" stroke-width="1"/>
          <!-- Motorcycle icon from Freepik -->
          <g transform="translate(7, -2) scale(0.053)">
            <path fill="${colors.fill}" d="${motoPath}"/>
          </g>
          <!-- Day badge -->
          <rect x="6" y="25" width="30" height="12" rx="2" fill="${colors.badge}" stroke="${colors.stroke}" stroke-width="0.75"/>
          <text x="21" y="35" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="${colors.text}">${label.text}</text>
        </svg>`;

        return (
          <Marker
            key={`day-label-${label.day}`}
            position={{ lat: label.lat, lng: label.lng }}
            icon={{
              url: `data:image/svg+xml;base64,${btoa(svgMoto)}`,
              scaledSize: new google.maps.Size(42, 38),
              anchor: new google.maps.Point(21, 38), // Anchor at bottom center
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
    </div>
  );
}
