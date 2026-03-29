'use client';

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useTranslations } from "next-intl";
import { GoogleMap, Marker, Polyline, useJsApiLoader, MarkerClusterer, StandaloneSearchBox, InfoWindow } from "@react-google-maps/api";
import EnlargeablePhoto from "@/shared/EnlargeablePhoto";

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
  category: "fuel" | "lodging" | "campground" | "dining" | "poi" | "charging" | "border";
};

// Border crossing info for hover popup
interface BorderCrossingInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  rating: number | null;
  photoUrls: string[];
  openingHours: string[] | null;
  websiteUrl: string | null;
  fromCountry: string | null;
  toCountry: string | null;
  motorcycleTips: string | null;
  warnings: string | null;
  bestTimeToGo: string | null;
  hasAiTips: boolean;
}

type PanelPlaceItem = {
  name: string;
  category: "fuel" | "lodging" | "campground" | "dining" | "poi" | "charging" | "border";
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
// Predicted range end icon (red circle with "E" for empty) - distinct from gas stations
const fuelRangeEndIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#fff" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#fff">E</text></svg>`;

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

// EV Charging icon (lightning bolt) - cyan/sky
const chargingIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0ea5e9" stroke="#fff" stroke-width="1"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
const chargingIconSvgHighlight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#38bdf8" stroke="#fff" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;

// Border crossing icon (flag/checkpoint) - purple/violet
const borderIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#8b5cf6" stroke="#fff" stroke-width="1"><path d="M4 2v20M4 4h12l-2 4 2 4H4"/></svg>`;
const borderIconSvgHighlight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#a78bfa" stroke="#fff" stroke-width="2"><path d="M4 2v20M4 4h12l-2 4 2 4H4"/></svg>`;

// Helper to create icon URL from SVG using base64 encoding
const svgToIconUrl = (svg: string) => {
  if (typeof window !== 'undefined') {
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// Google Maps libraries - defined outside component to prevent unnecessary reloads
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

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
  showChargingPlaces?: boolean;
  showBorderPlaces?: boolean;
  minPlaceRating?: number | null;
  onlyOpenNow?: boolean;
  /**
   * Index of the focused waypoint - map will pan/zoom to this waypoint when set.
   */
  focusedWaypointIndex?: number | null;
  /**
   * Trigger counter - changes to this value will re-trigger the pan/zoom even if the index is the same.
   */
  focusedWaypointTrigger?: number;
  /**
   * Optional React node containing nearby places controls to show in fullscreen mode.
   */
  nearbyPlacesControls?: React.ReactNode;
  /**
   * Total route distance in meters - used for simulation telemetry display.
   */
  totalDistanceMeters?: number | null;
  /**
   * Total route duration in seconds - used for simulation telemetry display.
   */
  totalDurationSeconds?: number | null;
  /**
   * Motorcycle fuel range in km - used for simulation fuel gauge.
   */
  fuelRangeKm?: number | null;
  /**
   * Callback when fuel drops below 25% during simulation - parent can enable fuel places filter.
   */
  onLowFuelAlert?: () => void;
  /**
   * Callback to trigger a save - used when adding fuel waypoint during out-of-fuel state.
   */
  onRequestSave?: () => void;
  /**
   * Callback when a draggable waypoint (VIA) is dragged to a new position.
   */
  onWaypointDragEnd?: (index: number, lat: number, lng: number) => void;
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
  showChargingPlaces,
  showBorderPlaces,
  minPlaceRating,
  onlyOpenNow,
  focusedWaypointIndex,
  focusedWaypointTrigger,
  nearbyPlacesControls,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalDistanceMeters: _totalDistanceMeters,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalDurationSeconds: _totalDurationSeconds,
  fuelRangeKm,
  onLowFuelAlert,
  onRequestSave,
  onWaypointDragEnd,
}: TripPlannerMapProps) {
  const t = useTranslations("map");
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  // Ref for onAddWaypoint so polyline click handlers always see the latest callback
  const onAddWaypointRef = useRef(onAddWaypoint);
  onAddWaypointRef.current = onAddWaypoint;
  const idleTimeoutRef = useRef<number | null>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-maps-trip-planner",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [fuelPlaces, setFuelPlaces] = useState<PlaceMarker[]>([]);
  const [lodgingPlaces, setLodgingPlaces] = useState<PlaceMarker[]>([]);
  const [campgroundPlaces, setCampgroundPlaces] = useState<PlaceMarker[]>([]);
  const [diningPlaces, setDiningPlaces] = useState<PlaceMarker[]>([]);
  const [poiPlaces, setPoiPlaces] = useState<PlaceMarker[]>([]);
  const [chargingPlaces, setChargingPlaces] = useState<PlaceMarker[]>([]);
  const [borderPlaces, setBorderPlaces] = useState<PlaceMarker[]>([]);
  const [placesCenter, setPlacesCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [highlightedPlace, setHighlightedPlace] = useState<{
    lat: number;
    lng: number;
    category: "fuel" | "lodging" | "campground" | "dining" | "poi" | "charging" | "border";
  } | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  const [recentWaypointName, setRecentWaypointName] = useState<string | null>(null);
  const waypointToastTimeoutRef = useRef<number | null>(null);

  // Border crossing popup state
  const [hoveredBorderWaypoint, setHoveredBorderWaypoint] = useState<{
    lat: number;
    lng: number;
    index: number;
  } | null>(null);
  const [borderCrossingsCache, setBorderCrossingsCache] = useState<Map<string, BorderCrossingInfo[]>>(new Map());
  const [borderCrossingLoading, setBorderCrossingLoading] = useState(false);
  const fetchedBorderKeysRef = useRef<Set<string>>(new Set());

const [pendingPlace, setPendingPlace] = useState<PanelPlaceItem | null>(null);
  const [zoomHint, setZoomHint] = useState<string | null>(null);
  const zoomHintTimeoutRef = useRef<number | null>(null);

  // Distance measurement state
  const [measureMode, setMeasureMode] = useState(false);
  const [measureModePrompt, setMeasureModePrompt] = useState(false); // Show choice dialog
  const [measurePoints, setMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [measureRoadLoading, setMeasureRoadLoading] = useState(false);
  const [measureRoutes, setMeasureRoutes] = useState<{
    distanceKm: number;
    durationMins: number;
    summary: string;
    path: { lat: number; lng: number }[];
  }[]>([]);
  const [measureAnimOffset, setMeasureAnimOffset] = useState(0);
  const measureAnimRef = useRef<number | null>(null);

  // Zoom level tracking for day labels
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);

  // Fullscreen state - tracks both native and CSS-based fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Track if we're using CSS fallback (for iOS/unsupported browsers)
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);

  // Route ride simulation state
  type SimulationMode = 'off' | 'day' | 'full';
  type SimulationState = 'idle' | 'playing' | 'paused' | 'waypoint-pause';
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('off');
  const [simulationDay, setSimulationDay] = useState<number>(1);
  const [simulationState, setSimulationState] = useState<SimulationState>('idle');
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [simulationWaypointName, setSimulationWaypointName] = useState<string | null>(null);
  const [userPannedDuringPause, setUserPannedDuringPause] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1); // Speed multiplier (0.5x to 3x)
  const animationFrameRef = useRef<number | null>(null);
  const lastAnimationTimeRef = useRef<number>(0);
  const animationFrameCounterRef = useRef<number>(0); // For throttling bounds updates
  const simulationProgressRef = useRef<number>(0); // High-frequency progress tracking
  const lastProgressUpdateRef = useRef<number>(0); // For throttling state updates
  const lastCameraUpdateRef = useRef<number>(0); // For throttling camera updates on mobile
  const waypointPauseTimeoutRef = useRef<number | null>(null);
  const visitedWaypointsRef = useRef<Set<number>>(new Set());
  const currentSimulationPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastFuelStopProgressRef = useRef<number>(0); // Track progress at last fuel fill-up
  const [showFuelPrompt, setShowFuelPrompt] = useState(false);
  const [simulationPanelExpanded, setSimulationPanelExpanded] = useState(false);
  // Collapsible state for nearby places panel in fullscreen (default collapsed)
  const [nearbyPlacesPanelExpanded, setNearbyPlacesPanelExpanded] = useState(false);
  // Mobile detection for responsive panel behavior
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  // Low fuel alert state - track if alert has been triggered this simulation
  const lowFuelAlertTriggeredRef = useRef(false);
  const [lowFuelToast, setLowFuelToast] = useState<string | null>(null);
  const lowFuelToastTimeoutRef = useRef<number | null>(null);
  // Accurate distance/duration fetched from Directions API for current simulation segment
  const [simulationSegmentDistanceKm, setSimulationSegmentDistanceKm] = useState<number | null>(null);
  const [simulationSegmentDurationSeconds, setSimulationSegmentDurationSeconds] = useState<number | null>(null);

  // Out-of-fuel handling (Option 2)
  const [showOutOfFuelPrompt, setShowOutOfFuelPrompt] = useState(false);
  const outOfFuelDismissedRef = useRef(false);
  const prevFuelPercentRef = useRef<number | null>(null);

  // Track previous values of show* props to detect when they change from false to true
  const prevShowFuel = useRef(showFuelPlaces);
  const prevShowLodging = useRef(showLodgingPlaces);
  const prevShowCampground = useRef(showCampgroundPlaces);
  const prevShowDining = useRef(showDiningPlaces);
  const prevShowPoi = useRef(showPoiPlaces);
  const prevShowCharging = useRef(showChargingPlaces);
  const prevShowBorder = useRef(showBorderPlaces);

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
      if (lowFuelToastTimeoutRef.current !== null) {
        window.clearTimeout(lowFuelToastTimeoutRef.current);
      }
      if (measureAnimRef.current !== null) {
        cancelAnimationFrame(measureAnimRef.current);
      }
    };
  }, []);

  // Fetch border crossing data for hover popup
  const fetchBorderCrossings = useCallback(async (lat: number, lng: number) => {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    
    // Check cache first
    if (borderCrossingsCache.has(cacheKey)) {
      return;
    }
    
    // Check if already fetched (prevent duplicate requests)
    if (fetchedBorderKeysRef.current.has(cacheKey)) {
      return;
    }
    
    fetchedBorderKeysRef.current.add(cacheKey);
    setBorderCrossingLoading(true);
    
    try {
      const response = await fetch(`/api/nearby-crossings?lat=${lat}&lng=${lng}&radius=50`);
      if (response.ok) {
        const data = await response.json();
        if (data.crossings && data.crossings.length > 0) {
          setBorderCrossingsCache((prev) => new Map(prev).set(cacheKey, data.crossings));
        }
      }
    } catch (err) {
      console.error("Failed to fetch border crossings for popup:", err);
    } finally {
      setBorderCrossingLoading(false);
    }
  }, [borderCrossingsCache]);

  // Handle border waypoint click - open popup and fetch crossing data
  const handleBorderClick = useCallback((lat: number, lng: number, index: number) => {
    // If clicking the same marker, close the popup (toggle)
    if (hoveredBorderWaypoint && hoveredBorderWaypoint.index === index) {
      setHoveredBorderWaypoint(null);
      return;
    }
    setHoveredBorderWaypoint({ lat, lng, index });
    fetchBorderCrossings(lat, lng);
  }, [fetchBorderCrossings, hoveredBorderWaypoint]);

  const handleBorderPopupClose = useCallback(() => {
    setHoveredBorderWaypoint(null);
  }, []);

  // Animate measure line when routes are displayed
  useEffect(() => {
    if (!measureMode || measureRoutes.length === 0) {
      if (measureAnimRef.current !== null) {
        cancelAnimationFrame(measureAnimRef.current);
        measureAnimRef.current = null;
      }
      setMeasureAnimOffset(0);
      return;
    }

    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime > 50) { // ~20fps for smooth but efficient animation
        lastTime = time;
        setMeasureAnimOffset((prev) => (prev + 2) % 100);
      }
      measureAnimRef.current = requestAnimationFrame(animate);
    };
    measureAnimRef.current = requestAnimationFrame(animate);

    return () => {
      if (measureAnimRef.current !== null) {
        cancelAnimationFrame(measureAnimRef.current);
        measureAnimRef.current = null;
      }
    };
  }, [measureMode, measureRoutes.length]);

  // Track fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFullscreen = !!document.fullscreenElement;
      // Only update if we're not in CSS fullscreen mode
      if (!isCssFullscreen) {
        setIsFullscreen(isNativeFullscreen);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isCssFullscreen]);

  // Handle Escape key for CSS fullscreen mode
  useEffect(() => {
    if (!isCssFullscreen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCssFullscreen(false);
        setIsFullscreen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCssFullscreen]);

  // Track actual viewport dimensions for CSS fullscreen (iOS Safari doesn't update 100vh/100vw reliably)
  const [cssFullscreenDimensions, setCssFullscreenDimensions] = useState({ width: 0, height: 0 });
  const lastDimensionsRef = useRef({ width: 0, height: 0 });
  
  useEffect(() => {
    if (!isCssFullscreen) {
      // Reset dimensions when exiting fullscreen
      setCssFullscreenDimensions({ width: 0, height: 0 });
      lastDimensionsRef.current = { width: 0, height: 0 };
      return;
    }
    
    const updateDimensions = () => {
      // Use visualViewport if available (more accurate on iOS), fallback to window
      const vp = window.visualViewport;
      const newWidth = vp ? Math.round(vp.width) : window.innerWidth;
      const newHeight = vp ? Math.round(vp.height) : window.innerHeight;
      
      // Only update if dimensions actually changed
      if (lastDimensionsRef.current.width !== newWidth || lastDimensionsRef.current.height !== newHeight) {
        lastDimensionsRef.current = { width: newWidth, height: newHeight };
        setCssFullscreenDimensions({ width: newWidth, height: newHeight });
        
        // Force Google Maps to resize when dimensions change
        const map = mapRef.current;
        if (map) {
          google.maps.event.trigger(map, 'resize');
        }
      }
    };
    
    // Initial dimensions
    updateDimensions();
    
    const handleOrientationChange = () => {
      // iOS Safari needs multiple delayed updates to get correct dimensions after rotation
      // The delays account for Safari's animation and viewport recalculation
      updateDimensions();
      setTimeout(updateDimensions, 50);
      setTimeout(updateDimensions, 100);
      setTimeout(updateDimensions, 200);
      setTimeout(updateDimensions, 350);
      setTimeout(updateDimensions, 500);
      setTimeout(updateDimensions, 750);
      setTimeout(updateDimensions, 1000);
      setTimeout(updateDimensions, 1500);
    };
    
    // Listen to both orientationchange and resize for better coverage
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', updateDimensions);
    
    // Also trigger on screen.orientation change for modern browsers
    screen.orientation?.addEventListener('change', handleOrientationChange);
    
    // iOS specific: listen to visualViewport resize and scroll (scroll can indicate keyboard/rotation)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDimensions);
      window.visualViewport.addEventListener('scroll', updateDimensions);
    }
    
    // Polling fallback: iOS sometimes doesn't fire events reliably
    // Poll every 500ms while in fullscreen to catch any missed changes
    const pollInterval = setInterval(updateDimensions, 500);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', updateDimensions);
      screen.orientation?.removeEventListener('change', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateDimensions);
        window.visualViewport.removeEventListener('scroll', updateDimensions);
      }
      clearInterval(pollInterval);
    };
  }, [isCssFullscreen]);

  // Detect mobile viewport for responsive simulation panel
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    checkMobile(); // Initial check
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Cleanup simulation timeouts and animation frames
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (waypointPauseTimeoutRef.current !== null) {
        window.clearTimeout(waypointPauseTimeoutRef.current);
      }
    };
  }, []);

  // Pan/zoom to focused waypoint when it changes (or when trigger increments)
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
  }, [focusedWaypointIndex, focusedWaypointTrigger, waypoints]);

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
    const chargingJustEnabled = showChargingPlaces && !prevShowCharging.current;
    const borderJustEnabled = showBorderPlaces && !prevShowBorder.current;

    // Update refs for next render
    prevShowFuel.current = showFuelPlaces;
    prevShowLodging.current = showLodgingPlaces;
    prevShowCampground.current = showCampgroundPlaces;
    prevShowDining.current = showDiningPlaces;
    prevShowPoi.current = showPoiPlaces;
    prevShowCharging.current = showChargingPlaces;
    prevShowBorder.current = showBorderPlaces;

    const anyJustEnabled =
      fuelJustEnabled ||
      lodgingJustEnabled ||
      campgroundJustEnabled ||
      diningJustEnabled ||
      poiJustEnabled ||
      chargingJustEnabled ||
      borderJustEnabled;

    if (!anyJustEnabled) return;

    const zoom = map.getZoom() ?? 0;

    // Border crossings can show at lower zoom (4+) since they're sparse
    const minZoomForBorders = 4;
    const minZoomForOthers = 7;
    
    const nonBorderJustEnabled = fuelJustEnabled || lodgingJustEnabled || campgroundJustEnabled || diningJustEnabled || poiJustEnabled || chargingJustEnabled;
    
    if (zoom < minZoomForBorders || (zoom < minZoomForOthers && nonBorderJustEnabled && !borderJustEnabled)) {
      // Show hint to zoom in (but not if only borders were enabled and we're at 4+)
      if (!(borderJustEnabled && !nonBorderJustEnabled && zoom >= minZoomForBorders)) {
        setZoomHint("Zoom in to see nearby places");
        if (zoomHintTimeoutRef.current !== null) {
          window.clearTimeout(zoomHintTimeoutRef.current);
        }
        zoomHintTimeoutRef.current = window.setTimeout(() => {
          setZoomHint(null);
          zoomHintTimeoutRef.current = null;
        }, 3000);
      }
      
      // Still fetch borders if zoom >= 4 and borders were just enabled
      if (borderJustEnabled && zoom >= minZoomForBorders) {
        const bounds = map.getBounds();
        if (bounds && (google.maps as any).places) {
          const service = new google.maps.places.PlacesService(map);
          service.textSearch(
            { query: "border crossing customs", bounds },
            (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                // Filter to only include results within current bounds (textSearch uses bounds as bias, not strict filter)
                const currentBounds = map.getBounds();
                const filtered = results.filter((r) => {
                  if (!r.geometry?.location || !currentBounds) return false;
                  return currentBounds.contains(r.geometry.location);
                });
                setBorderPlaces(
                  filtered.slice(0, MAX_PLACES_RESULTS).map((r) => ({
                    lat: r.geometry?.location?.lat() ?? 0,
                    lng: r.geometry?.location?.lng() ?? 0,
                    name: r.name ?? null,
                    rating: typeof r.rating === "number" ? r.rating : null,
                    openNow: r.opening_hours?.open_now ?? null,
                    category: "border",
                  })),
                );
              }
            },
          );
        }
      }
      
      if (zoom < minZoomForOthers) return;
    }
    
    if (zoom >= minZoomForOthers) {
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

      if (chargingJustEnabled) {
        service.nearbySearch(
          { bounds, type: "electric_vehicle_charging_station" },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const filtered = results.filter((r) => {
                const ratingOk = !minPlaceRating || (typeof r.rating === "number" && r.rating >= minPlaceRating);
                const openOk = !onlyOpenNow || r.opening_hours?.open_now === true;
                return ratingOk && openOk;
              });
              setChargingPlaces(
                filtered.slice(0, MAX_PLACES_RESULTS).map((r) => ({
                  lat: r.geometry?.location?.lat() ?? 0,
                  lng: r.geometry?.location?.lng() ?? 0,
                  name: r.name ?? null,
                  rating: typeof r.rating === "number" ? r.rating : null,
                  openNow: r.opening_hours?.open_now ?? null,
                  category: "charging",
                })),
              );
            }
          },
        );
      }

      // Border fetch is handled earlier for lower zoom levels, but also fetch here at zoom 7+
      if (borderJustEnabled) {
        service.textSearch(
          { query: "border crossing customs", bounds },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              // Filter to only include results within current bounds (textSearch uses bounds as bias, not strict filter)
              const currentBounds = map.getBounds();
              const filtered = results.filter((r) => {
                if (!r.geometry?.location || !currentBounds) return false;
                return currentBounds.contains(r.geometry.location);
              });
              setBorderPlaces(
                filtered.slice(0, MAX_PLACES_RESULTS).map((r) => ({
                  lat: r.geometry?.location?.lat() ?? 0,
                  lng: r.geometry?.location?.lng() ?? 0,
                  name: r.name ?? null,
                  rating: typeof r.rating === "number" ? r.rating : null,
                  openNow: r.opening_hours?.open_now ?? null,
                  category: "border",
                })),
              );
            }
          },
        );
      }
    }
  }, [showFuelPlaces, showLodgingPlaces, showCampgroundPlaces, showDiningPlaces, showPoiPlaces, showChargingPlaces, showBorderPlaces, minPlaceRating, onlyOpenNow]);

  // Fetch directions for measurement between two points
  const fetchMeasureDirections = useCallback(
    (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
      // Debug: log the exact coordinates being measured
      console.log('[Measure] Origin:', p1.lat.toFixed(5), p1.lng.toFixed(5));
      console.log('[Measure] Destination:', p2.lat.toFixed(5), p2.lng.toFixed(5));

      setMeasureRoadLoading(true);
      setMeasureRoutes([]); // Clear previous routes while loading
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
            
            // Debug: log all routes returned
            console.log('[Measure] Directions API returned', routes.length, 'routes');
            routes.forEach((r, i) => {
              console.log(`[Measure] Route ${i}: ${r.distanceKm.toFixed(1)} km, ${r.durationMins} mins via ${r.summary}`);
            });
            
            setMeasureRoutes(routes);
          }
        }
      );
    },
    []
  );

  // Handle adding a measurement point (from map click or waypoint click)
  const handleMeasurePoint = useCallback(
    (point: { lat: number; lng: number }) => {
      // If measurement is complete (2 points + routes or no route), allow re-measuring
      // by replacing the destination point and recalculating
      if (measurePoints.length === 2) {
        const p1 = measurePoints[0];
        setMeasurePoints([p1, point]);
        fetchMeasureDirections(p1, point);
        return;
      }

      setMeasurePoints((prev) => {
        if (prev.length === 0) {
          // First point
          return [point];
        } else if (prev.length === 1) {
          // Second point - fetch road distances with alternatives
          const p1 = prev[0];
          fetchMeasureDirections(p1, point);
          return [p1, point];
        } else {
          return prev;
        }
      });
    },
    [measurePoints, fetchMeasureDirections]
  );

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      // Close border crossing popup when clicking the map
      if (hoveredBorderWaypoint) {
        setHoveredBorderWaypoint(null);
        return;
      }

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
    [onAddWaypoint, enableClickToAdd, measureMode, handleMeasurePoint, hoveredBorderWaypoint],
  );

  // Toggle measure mode - show prompt if waypoints exist, otherwise start from anywhere
  const handleMeasureToggle = useCallback(() => {
    if (measureMode) {
      // Exiting measure mode - clear everything
      setMeasureMode(false);
      setMeasurePoints([]);
      setMeasureRoutes([]);
      setMeasureModePrompt(false);
    } else {
      // Entering measure mode
      if (waypoints.length > 0) {
        // Show prompt to choose start point type
        setMeasureModePrompt(true);
      } else {
        // No waypoints - go straight to "from anywhere" mode
        setMeasureMode(true);
      }
    }
  }, [measureMode, waypoints.length]);

  // Start measure from last waypoint
  const handleMeasureFromWaypoint = useCallback(() => {
    setMeasureModePrompt(false);
    setMeasureMode(true);
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
  }, [waypoints]);

  // Start measure from anywhere (user picks both points)
  const handleMeasureFromAnywhere = useCallback(() => {
    setMeasureModePrompt(false);
    setMeasureMode(true);
    setMeasurePoints([]);
  }, []);

  // Cancel measure prompt
  const handleMeasureCancel = useCallback(() => {
    setMeasureModePrompt(false);
  }, []);

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
      setMapReady(true);
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
    } else if (types.includes("electric_vehicle_charging_station")) {
      category = "charging";
    } else if (types.includes("lodging")) {
      category = "lodging";
    } else if (types.includes("campground")) {
      category = "campground";
    } else if (types.includes("restaurant") || types.includes("cafe") || types.includes("bar")) {
      category = "dining";
    } else if (types.includes("tourist_attraction") || types.includes("point_of_interest")) {
      category = "poi";
    } else if (types.includes("local_government_office") || place.name?.toLowerCase().includes("border") || place.name?.toLowerCase().includes("customs")) {
      category = "border";
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
      // Border crossings can show at lower zoom (4+) since they're sparse.
      const minZoomForBorders = 4;
      const minZoomForOthers = 7;
      
      if (zoom < minZoomForBorders) {
        setFuelPlaces([]);
        setLodgingPlaces([]);
        setCampgroundPlaces([]);
        setDiningPlaces([]);
        setPoiPlaces([]);
        setChargingPlaces([]);
        setBorderPlaces([]);
        return;
      }
      
      // Clear non-border places if below zoom 7
      if (zoom < minZoomForOthers) {
        setFuelPlaces([]);
        setLodgingPlaces([]);
        setCampgroundPlaces([]);
        setDiningPlaces([]);
        setPoiPlaces([]);
        setChargingPlaces([]);
        // But still fetch border crossings at zoom 4-6
        if (showBorderPlaces) {
          if (!(google.maps as any).places) return;
          const service = new google.maps.places.PlacesService(map);
          service.textSearch(
            { query: "border crossing customs", bounds },
            (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                // Filter to only include results within current bounds (textSearch uses bounds as bias, not strict filter)
                const currentBounds = map.getBounds();
                const filtered = results.filter((r) => {
                  if (!r.geometry?.location || !currentBounds) return false;
                  return currentBounds.contains(r.geometry.location);
                });
                const limited = filtered.slice(0, MAX_PLACES_RESULTS);
                setBorderPlaces(
                  limited.map((r) => ({
                    lat: r.geometry?.location?.lat() ?? 0,
                    lng: r.geometry?.location?.lng() ?? 0,
                    name: r.name ?? null,
                    rating: typeof r.rating === "number" ? r.rating : null,
                    openNow: r.opening_hours?.open_now ?? null,
                    category: "border",
                  })),
                );
              }
            },
          );
        } else {
          setBorderPlaces([]);
        }
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

      if (showChargingPlaces) {
        service.nearbySearch(
          {
            bounds,
            type: "electric_vehicle_charging_station",
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
              setChargingPlaces(
                limited.map((r) => ({
                  lat: r.geometry?.location?.lat() ?? 0,
                  lng: r.geometry?.location?.lng() ?? 0,
                  name: r.name ?? null,
                  rating: typeof r.rating === "number" ? r.rating : null,
                  openNow: r.opening_hours?.open_now ?? null,
                  category: "charging",
                })),
              );
            }
          },
        );
      } else {
        setChargingPlaces([]);
      }

      if (showBorderPlaces) {
        // Use text search for border crossings since there's no specific place type
        service.textSearch(
          { query: "border crossing customs", bounds },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              // Filter to only include results within current bounds (textSearch uses bounds as bias, not strict filter)
              const currentBounds = map.getBounds();
              const filtered = results.filter((r) => {
                if (!r.geometry?.location || !currentBounds) return false;
                return currentBounds.contains(r.geometry.location);
              });
              const limited = filtered.slice(0, MAX_PLACES_RESULTS);
              setBorderPlaces(
                limited.map((r) => ({
                  lat: r.geometry?.location?.lat() ?? 0,
                  lng: r.geometry?.location?.lng() ?? 0,
                  name: r.name ?? null,
                  rating: typeof r.rating === "number" ? r.rating : null,
                  openNow: r.opening_hours?.open_now ?? null,
                  category: "border",
                })),
              );
            }
          },
        );
      } else {
        setBorderPlaces([]);
      }
    }, 500);
  }, [showFuelPlaces, showLodgingPlaces, showCampgroundPlaces, showDiningPlaces, showPoiPlaces, showChargingPlaces, showBorderPlaces, minPlaceRating, onlyOpenNow]);

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
    if (showChargingPlaces) all.push(...chargingPlaces);
    if (showBorderPlaces) all.push(...borderPlaces);

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
    showChargingPlaces,
    showBorderPlaces,
    fuelPlaces,
    lodgingPlaces,
    campgroundPlaces,
    diningPlaces,
    poiPlaces,
    chargingPlaces,
    borderPlaces,
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

  // ── Imperative route polyline management ──────────────────────────────
  // We manage Google Maps Polyline objects directly instead of using
  // <Polyline> components because @react-google-maps/api does not
  // reliably remove old drawn paths from the canvas when a Polyline
  // component unmounts or when its `path` prop changes.
  //
  // On retraced sections (where a later day’s path overlaps an earlier
  // day’s path) the later day is rendered as a dashed line so the earlier
  // solid colour is visible through the gaps.
  const routePolylinesRef = useRef<google.maps.Polyline[]>([]);

  // Aggressively destroy all tracked route polylines from the canvas.
  const destroyRoutePolylines = useCallback(() => {
    for (const pl of routePolylinesRef.current) {
      google.maps.event.clearInstanceListeners(pl);
      pl.setPath([]);
      pl.setVisible(false);
      pl.setMap(null);
    }
    routePolylinesRef.current = [];
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    // 1. Remove every existing route polyline from the map.
    destroyRoutePolylines();

    // 2. Nothing to draw if there is no map or no route.
    if (!map || !routePath || routePath.length === 0) return;

    // ── Overlap detection helpers ────────────────────────────────────
    // Grid-based spatial index: cell size ~200 m (≈0.002° at mid latitudes).
    const CELL = 0.002;
    const cellKey = (lat: number, lng: number) =>
      `${Math.round(lat / CELL)},${Math.round(lng / CELL)}`;

    type Pt = { lat: number; lng: number };

    /** Check whether a point overlaps the grid (same cell or any neighbour). */
    const overlaps = (grid: Set<string>, p: Pt): boolean => {
      const cx = Math.round(p.lat / CELL);
      const cy = Math.round(p.lng / CELL);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (grid.has(`${cx + dx},${cy + dy}`)) return true;
        }
      }
      return false;
    };

    /**
     * Split a path into contiguous runs of overlapping / non-overlapping
     * points relative to an earlier-days grid.
     * Adjacent sub-paths share their boundary point so the line is continuous.
     */
    const splitByOverlap = (
      path: Pt[],
      grid: Set<string>,
    ): { sub: Pt[]; isOverlap: boolean }[] => {
      if (path.length === 0) return [];
      const runs: { sub: Pt[]; isOverlap: boolean }[] = [];
      let currentOverlap = overlaps(grid, path[0]);
      let current: Pt[] = [path[0]];

      for (let i = 1; i < path.length; i++) {
        const ol = overlaps(grid, path[i]);
        if (ol !== currentOverlap) {
          runs.push({ sub: current, isOverlap: currentOverlap });
          current = [current[current.length - 1]]; // share boundary point
          currentOverlap = ol;
        }
        current.push(path[i]);
      }
      if (current.length > 0) runs.push({ sub: current, isOverlap: currentOverlap });
      return runs;
    };

    // Click handler for polylines — inserts a VIA shaping point
    const handlePolylineClick = (e: google.maps.PolyMouseEvent) => {
      if (!e.latLng || !onAddWaypointRef.current) return;
      onAddWaypointRef.current({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
        type: "VIA",
      });
    };

    // ── Build polylines ──────────────────────────────────────────
    if (dayRoutePaths.length > 0) {
      // Accumulate a spatial grid of all earlier days' points.
      const earlierGrid = new Set<string>();

      for (const segment of dayRoutePaths) {
        const segGrid = earlierGrid.size > 0 ? earlierGrid : null;

        if (!segGrid) {
          // First day — always solid, no earlier path to overlap with.
          const pl = new google.maps.Polyline({
            path: segment.path,
            strokeColor: segment.color,
            strokeOpacity: 0.85,
            strokeWeight: 4,
            clickable: true,
            map,
          });
          pl.addListener("click", handlePolylineClick);
          routePolylinesRef.current.push(pl);
        } else {
          // Later day — split into overlapping (dashed) and unique (solid).
          const runs = splitByOverlap(segment.path, segGrid);
          for (const run of runs) {
            if (run.sub.length < 2) continue;
            if (run.isOverlap) {
              // Dashed line so the earlier day's solid colour shows through.
              const pl = new google.maps.Polyline({
                path: run.sub,
                strokeColor: segment.color,
                strokeOpacity: 0,
                strokeWeight: 4,
                clickable: true,
                icons: [{
                  icon: {
                    path: "M 0,-1 0,1",
                    strokeOpacity: 1,
                    strokeColor: segment.color,
                    scale: 3,
                  },
                  offset: "0",
                  repeat: "14px",
                }],
                map,
              });
              pl.addListener("click", handlePolylineClick);
              routePolylinesRef.current.push(pl);
            } else {
              // Solid — no overlap here.
              const pl = new google.maps.Polyline({
                path: run.sub,
                strokeColor: segment.color,
                strokeOpacity: 0.85,
                strokeWeight: 4,
                clickable: true,
                map,
              });
              pl.addListener("click", handlePolylineClick);
              routePolylinesRef.current.push(pl);
            }
          }
        }

        // Add this day’s points to the grid for future overlap checks.
        for (const p of segment.path) earlierGrid.add(cellKey(p.lat, p.lng));
      }
    } else {
      // Fallback: single green line
      const pl = new google.maps.Polyline({
        path: routePath,
        strokeColor: "#22c55e",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        clickable: true,
        map,
      });
      pl.addListener("click", handlePolylineClick);
      routePolylinesRef.current.push(pl);
    }

    // Cleanup on unmount or when route changes.
    return () => {
      destroyRoutePolylines();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePath, dayRoutePaths, mapReady]);

  // Simulation path based on mode (full route or single day)
  const simulationPath = useMemo(() => {
    if (simulationMode === 'off') return [];
    if (simulationMode === 'full') return routePath ?? [];
    // Day mode: find the path for the selected day
    const dayPath = dayRoutePaths.find(p => p.day === simulationDay);
    return dayPath?.path ?? [];
  }, [simulationMode, simulationDay, routePath, dayRoutePaths]);

  // Fetch accurate distance/duration from Directions API for simulation segment
  // Uses the same approach as Measure feature for consistency
  useEffect(() => {
    // Reset when simulation is off
    if (simulationMode === 'off') {
      setSimulationSegmentDistanceKm(null);
      setSimulationSegmentDurationSeconds(null);
      return;
    }

    // Wait for Google Maps API to load
    if (!isLoaded) {
      return;
    }

    // Get the segment's start and end points
    let origin: { lat: number; lng: number } | null = null;
    let destination: { lat: number; lng: number } | null = null;

    if (simulationMode === 'full') {
      // Full route: first to last waypoint
      if (waypoints.length >= 2) {
        origin = { lat: waypoints[0].lat, lng: waypoints[0].lng };
        destination = { lat: waypoints[waypoints.length - 1].lat, lng: waypoints[waypoints.length - 1].lng };
      }
    } else {
      // Day mode: first to last waypoint of the day segment
      const segment = daySegments.find(s => s.day === simulationDay);
      if (segment && segment.waypoints.length >= 2) {
        origin = { lat: segment.waypoints[0].lat, lng: segment.waypoints[0].lng };
        destination = { lat: segment.waypoints[segment.waypoints.length - 1].lat, lng: segment.waypoints[segment.waypoints.length - 1].lng };
      }
    }

    if (!origin || !destination) {
      setSimulationSegmentDistanceKm(null);
      setSimulationSegmentDurationSeconds(null);
      return;
    }

    // Debug: log the exact coordinates being used
    console.log('[Simulation] Fetching for mode:', simulationMode, 'day:', simulationDay);
    console.log('[Simulation] Origin:', origin.lat.toFixed(5), origin.lng.toFixed(5));
    console.log('[Simulation] Destination:', destination.lat.toFixed(5), destination.lng.toFixed(5));

    // Clear previous values while loading
    setSimulationSegmentDistanceKm(null);
    setSimulationSegmentDurationSeconds(null);

    // Call Directions API the same way as Measure feature
    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true, // Match Measure feature
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result && result.routes.length > 0) {
          // Sort routes by distance (same as Measure) and use the shortest
          const sortedRoutes = [...result.routes].sort((a, b) => {
            const distA = a.legs[0]?.distance?.value ?? Infinity;
            const distB = b.legs[0]?.distance?.value ?? Infinity;
            return distA - distB;
          });
          
          const shortestRoute = sortedRoutes[0];
          const leg = shortestRoute.legs[0];
          const distanceKm = (leg?.distance?.value ?? 0) / 1000;
          const durationSeconds = leg?.duration?.value ?? 0;
          
          console.log('[Simulation] Directions API returned', result.routes.length, 'routes');
          console.log('[Simulation] Shortest route:', distanceKm.toFixed(1), 'km,', Math.floor(durationSeconds / 60), 'mins');
          
          setSimulationSegmentDistanceKm(distanceKm);
          setSimulationSegmentDurationSeconds(durationSeconds);
        } else {
          console.log('[Simulation] Directions API failed:', status);
        }
      }
    );
  }, [simulationMode, simulationDay, daySegments, waypoints, isLoaded]);

  // Waypoints for the active simulation (for pause detection)
  const simulationWaypointsForPause = useMemo(() => {
    // Helper to get display name for a waypoint
    const getWaypointDisplayName = (wp: WaypointPosition, fallbackNum: number): string => {
      if (wp.name && wp.name.trim()) return wp.name;
      if (wp.type) {
        // Format type nicely: "FUEL" -> "Fuel Stop", "LODGING" -> "Lodging"
        const typeLabel = wp.type.charAt(0) + wp.type.slice(1).toLowerCase();
        return `${typeLabel} Stop`;
      }
      return `Waypoint ${fallbackNum}`;
    };

    if (simulationMode === 'off') return [];
    if (simulationMode === 'full') {
      // All waypoints except start (we don't pause at the very beginning)
      return waypoints.slice(1).map((wp, idx) => ({
        index: idx + 1,
        lat: wp.lat,
        lng: wp.lng,
        name: getWaypointDisplayName(wp, idx + 2),
        type: wp.type ?? null,
      }));
    }
    // Day mode: waypoints for the selected day, excluding the first (start of day)
    const segment = daySegments.find(s => s.day === simulationDay);
    if (!segment) return [];
    return segment.waypoints.slice(1).map((wp, idx) => ({
      index: idx + 1,
      lat: wp.lat,
      lng: wp.lng,
      name: getWaypointDisplayName(wp, idx + 2),
      type: wp.type ?? null,
    }));
  }, [simulationMode, simulationDay, waypoints, daySegments]);

  // Interpolated position along the simulation path
  const simulationPosition = useMemo(() => {
    if (simulationPath.length === 0) return null;
    const idx = Math.min(simulationProgress, simulationPath.length - 1);
    const floorIdx = Math.floor(idx);
    const ceilIdx = Math.min(floorIdx + 1, simulationPath.length - 1);
    const t = idx - floorIdx;
    const p1 = simulationPath[floorIdx];
    const p2 = simulationPath[ceilIdx];
    return {
      lat: p1.lat + t * (p2.lat - p1.lat),
      lng: p1.lng + t * (p2.lng - p1.lng),
    };
  }, [simulationPath, simulationProgress]);

  // Simulation telemetry (odometer, time, fuel)
  // Computed directly (not memoized) to ensure real-time updates during animation
  const simulationTelemetry = (() => {
    if (simulationMode === 'off' || simulationPath.length === 0) {
      return null;
    }

    const progress = simulationPath.length > 1
      ? simulationProgress / (simulationPath.length - 1)
      : 0;
    const progressPercent = Math.min(100, Math.max(0, progress * 100));

    // Distance calculation - uses stored route data for consistency with trip totals
    const totalDistanceKm: number | null = simulationSegmentDistanceKm;
    let traveledDistanceKm: number | null = null;

    if (totalDistanceKm != null) {
      traveledDistanceKm = totalDistanceKm * progress;
    }

    // Time calculation - uses stored route data for consistency with trip totals
    const totalTimeSeconds: number | null = simulationSegmentDurationSeconds;
    let elapsedTimeSeconds: number | null = null;

    if (totalTimeSeconds != null) {
      elapsedTimeSeconds = totalTimeSeconds * progress;
    }

    // Fuel calculation (% remaining) - based on distance since last fill-up
    let fuelPercent: number | null = null;
    const lastFuelProgress = lastFuelStopProgressRef.current;
    const progressSinceLastFuel = simulationPath.length > 1
      ? (simulationProgress - lastFuelProgress) / (simulationPath.length - 1)
      : 0;
    const distanceSinceLastFuelKm = totalDistanceKm != null
      ? totalDistanceKm * Math.max(0, progressSinceLastFuel)
      : null;

    if (fuelRangeKm && distanceSinceLastFuelKm != null) {
      // Calculate fuel used based on distance since last fill-up
      const fuelUsedPercent = (distanceSinceLastFuelKm / fuelRangeKm) * 100;
      fuelPercent = Math.max(0, 100 - fuelUsedPercent);
    } else if (distanceSinceLastFuelKm != null) {
      // No fuel range provided - estimate with default 300km range
      const defaultRangeKm = 300;
      const fuelUsedPercent = (distanceSinceLastFuelKm / defaultRangeKm) * 100;
      fuelPercent = Math.max(0, 100 - fuelUsedPercent);
    }

    // Format helpers
    const formatDistance = (km: number) => {
      if (km < 1) return `${Math.round(km * 1000)} m`;
      return `${km.toFixed(1)} km`;
    };

    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    };

    return {
      progressPercent,
      distanceTraveled: traveledDistanceKm != null ? formatDistance(traveledDistanceKm) : null,
      distanceTotal: totalDistanceKm != null ? formatDistance(totalDistanceKm) : null,
      timeElapsed: elapsedTimeSeconds != null ? formatTime(elapsedTimeSeconds) : null,
      timeTotal: totalTimeSeconds != null ? formatTime(totalTimeSeconds) : null,
      fuelPercent,
    };
  })();

  // Predictive "range ends here" marker position (Option 5)
  const rangeEndPosition = useMemo(() => {
    if (simulationMode === 'off') return null;
    if (!fuelRangeKm || !simulationSegmentDistanceKm || simulationSegmentDistanceKm <= 0) return null;
    if (simulationPath.length < 2) return null;
    // Hide marker once empty
    if (simulationTelemetry?.fuelPercent != null && simulationTelemetry.fuelPercent <= 0) return null;

    const pathLenMinus1 = simulationPath.length - 1;
    const lastIdx = lastFuelStopProgressRef.current; // index along path
    const deltaNormalized = fuelRangeKm / simulationSegmentDistanceKm; // portion of segment distance
    const targetIdx = lastIdx + deltaNormalized * pathLenMinus1;

    // If fuel range would reach beyond end of segment, skip marker (trip completes before empty)
    if (targetIdx >= pathLenMinus1) return null;

    const floorIdx = Math.max(0, Math.floor(targetIdx));
    const ceilIdx = Math.min(floorIdx + 1, pathLenMinus1);
    const tLerp = targetIdx - floorIdx;
    const p1 = simulationPath[floorIdx];
    const p2 = simulationPath[ceilIdx];
    return {
      lat: p1.lat + tLerp * (p2.lat - p1.lat),
      lng: p1.lng + tLerp * (p2.lng - p1.lng),
    };
  }, [simulationMode, simulationPath, fuelRangeKm, simulationSegmentDistanceKm, simulationTelemetry?.fuelPercent, simulationProgress]);

  // Low fuel alert - trigger when fuel drops to 25% or below
  const LOW_FUEL_THRESHOLD = 25;
  useEffect(() => {
    // Only check during active simulation
    if (simulationMode === 'off' || !simulationTelemetry?.fuelPercent) return;
    
    // Already triggered for this simulation
    if (lowFuelAlertTriggeredRef.current) return;
    
    // Check if fuel is at or below threshold
    if (simulationTelemetry.fuelPercent <= LOW_FUEL_THRESHOLD) {
      lowFuelAlertTriggeredRef.current = true;
      
      // Notify parent to enable fuel places filter
      if (onLowFuelAlert) {
        onLowFuelAlert();
      }
      
      // Show toast notification
      setLowFuelToast(t("simulation.lowFuelAlert"));
      
      // Auto-dismiss toast after 5 seconds
      if (lowFuelToastTimeoutRef.current !== null) {
        window.clearTimeout(lowFuelToastTimeoutRef.current);
      }
      lowFuelToastTimeoutRef.current = window.setTimeout(() => {
        setLowFuelToast(null);
        lowFuelToastTimeoutRef.current = null;
      }, 5000);
    }
  }, [simulationMode, simulationTelemetry?.fuelPercent, onLowFuelAlert, t]);

  // Detect crossing to 0% fuel - auto-pause and prompt (once) unless user chose to continue anyway
  useEffect(() => {
    if (simulationMode === 'off' || simulationTelemetry?.fuelPercent == null) return;
    const current = simulationTelemetry.fuelPercent;
    const prev = prevFuelPercentRef.current;
    prevFuelPercentRef.current = current;

    if (outOfFuelDismissedRef.current) return;

    if (!showOutOfFuelPrompt && prev != null && prev > 0 && current <= 0) {
      setShowOutOfFuelPrompt(true);
      setSimulationState('paused');
      if (onLowFuelAlert) onLowFuelAlert(); // ensure stations are visible
    }
  }, [simulationMode, simulationTelemetry?.fuelPercent, onLowFuelAlert, showOutOfFuelPrompt]);

  // Track previous waypoints to detect new FUEL waypoint additions
  const prevWaypointsRef = useRef<WaypointPosition[]>([]);
  // Store pending fuel waypoint to process after route recalculates
  const pendingFuelWaypointRef = useRef<WaypointPosition | null>(null);
  // Store the simulation position when we paused for out-of-fuel (for finding nearest point after route change)
  const outOfFuelPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  // Capture simulation position when out-of-fuel prompt appears
  useEffect(() => {
    if (showOutOfFuelPrompt && simulationPosition) {
      outOfFuelPositionRef.current = { lat: simulationPosition.lat, lng: simulationPosition.lng };
    }
  }, [showOutOfFuelPrompt, simulationPosition]);

  // Detect new FUEL waypoint additions and store for processing
  useEffect(() => {
    const prevWaypoints = prevWaypointsRef.current;
    prevWaypointsRef.current = waypoints;

    if (simulationMode === 'off') return;

    // Check if a new FUEL waypoint was added
    if (waypoints.length <= prevWaypoints.length) return;

    // Find new fuel waypoints that weren't in the previous list
    const newFuelWaypoint = waypoints.find(
      (wp) =>
        wp.type === 'FUEL' &&
        !prevWaypoints.some(
          (prev) =>
            prev.lat === wp.lat && prev.lng === wp.lng && prev.type === wp.type
        )
    );

    if (newFuelWaypoint) {
      console.log('[Simulation] New fuel waypoint detected, storing for rewind after route update');
      pendingFuelWaypointRef.current = newFuelWaypoint;
      
      // Auto-save to trigger route recalculation if we're in out-of-fuel state
      if (outOfFuelPositionRef.current && onRequestSave) {
        console.log('[Simulation] Auto-saving to recalculate route with new fuel stop');
        onRequestSave();
      }
    }
  }, [waypoints, simulationMode, onRequestSave]);

  // Process pending fuel waypoint rewind after simulationPath updates
  useEffect(() => {
    const pendingWp = pendingFuelWaypointRef.current;
    const outOfFuelPos = outOfFuelPositionRef.current;
    
    if (!pendingWp || simulationMode === 'off' || simulationPath.length < 2) {
      return;
    }

    // Find the closest point on the NEW simulation path for the fuel waypoint
    let fuelWpIdx = -1;
    let fuelWpDistSq = Infinity;

    for (let i = 0; i < simulationPath.length; i++) {
      const pt = simulationPath[i];
      const distSq = Math.pow(pt.lat - pendingWp.lat, 2) + Math.pow(pt.lng - pendingWp.lng, 2);
      if (distSq < fuelWpDistSq) {
        fuelWpDistSq = distSq;
        fuelWpIdx = i;
      }
    }

    // Find where the out-of-fuel position is on the new path
    let outOfFuelIdx = simulationPath.length - 1;
    if (outOfFuelPos) {
      let closestDist = Infinity;
      for (let i = 0; i < simulationPath.length; i++) {
        const pt = simulationPath[i];
        const distSq = Math.pow(pt.lat - outOfFuelPos.lat, 2) + Math.pow(pt.lng - outOfFuelPos.lng, 2);
        if (distSq < closestDist) {
          closestDist = distSq;
          outOfFuelIdx = i;
        }
      }
    }

    // Clear the pending waypoint
    pendingFuelWaypointRef.current = null;

    // If the fuel waypoint is behind where we ran out of fuel, rewind
    if (fuelWpIdx >= 0 && fuelWpIdx < outOfFuelIdx) {
      console.log('[Simulation] Rewinding to fuel waypoint at index', fuelWpIdx, 'from out-of-fuel position', outOfFuelIdx);
      
      // Rewind progress to the fuel waypoint
      simulationProgressRef.current = fuelWpIdx;
      setSimulationProgress(fuelWpIdx);
      
      // Reset fuel gauge (filled up at this station)
      lastFuelStopProgressRef.current = fuelWpIdx;
      
      // Reset out-of-fuel state so it can trigger again if needed
      outOfFuelDismissedRef.current = false;
      setShowOutOfFuelPrompt(false);
      outOfFuelPositionRef.current = null;
      
      // Reset low fuel alert so it can trigger again
      lowFuelAlertTriggeredRef.current = false;
      
      // Clear all visited waypoints (we'll pass them again on the new route)
      visitedWaypointsRef.current.clear();
      
      // Resume playing
      setSimulationState('playing');
      lastAnimationTimeRef.current = 0;
      
      // Pan camera to the new position
      const map = mapRef.current;
      if (map && simulationPath[fuelWpIdx]) {
        const rewindPos = simulationPath[fuelWpIdx];
        map.panTo({ lat: rewindPos.lat, lng: rewindPos.lng });
      }
    } else {
      console.log('[Simulation] Fuel waypoint not behind out-of-fuel position, not rewinding');
    }
  }, [simulationPath, simulationMode]);

  // Animation engine for route ride simulation
  // Note: simulationProgress removed from deps to prevent effect restart every frame
  useEffect(() => {
    if (simulationState !== 'playing' || simulationPath.length === 0) {
      return;
    }

    const BASE_SPEED = 75; // Path points per second (base pace, was 15)
    const SPEED = BASE_SPEED * simulationSpeed; // Apply speed multiplier
    const WAYPOINT_PROXIMITY_THRESHOLD = 0.0005; // ~50m in degrees squared

    const animate = (timestamp: number) => {
      if (lastAnimationTimeRef.current === 0) {
        lastAnimationTimeRef.current = timestamp;
      }

      const deltaTime = (timestamp - lastAnimationTimeRef.current) / 1000;
      lastAnimationTimeRef.current = timestamp;

      // Update progress using ref (no re-render)
      const newProgress = simulationProgressRef.current + SPEED * deltaTime;
      simulationProgressRef.current = newProgress;
      
      // Check if we've reached the end
      if (newProgress >= simulationPath.length - 1) {
        simulationProgressRef.current = simulationPath.length - 1;
        setSimulationProgress(simulationPath.length - 1);
        setSimulationState('idle');
        setSimulationWaypointName(null);
        return;
      }

      // Check proximity to waypoints for pause
      const currentIdx = Math.floor(newProgress);
      const currentPoint = simulationPath[currentIdx];
      if (currentPoint) {
        // Store current position for camera tracking
        currentSimulationPosRef.current = currentPoint;

        for (let i = 0; i < simulationWaypointsForPause.length; i++) {
          const wp = simulationWaypointsForPause[i];
          if (visitedWaypointsRef.current.has(i)) continue;

          const distSq = Math.pow(currentPoint.lat - wp.lat, 2) + Math.pow(currentPoint.lng - wp.lng, 2);
          if (distSq < WAYPOINT_PROXIMITY_THRESHOLD) {
            // Mark as visited and trigger waypoint pause
            visitedWaypointsRef.current.add(i);
            console.log('[Simulation] Reached waypoint:', wp.name, 'type:', wp.type);
            setSimulationProgress(newProgress);
            setSimulationState('waypoint-pause');
            setSimulationWaypointName(wp.name);
            
            // Check if this is a FUEL waypoint - show fill-up prompt
            if (wp.type === 'FUEL') {
              console.log('[Simulation] FUEL waypoint detected, showing prompt');
              setShowFuelPrompt(true);
              // Don't auto-resume - wait for user response
            } else {
              // Auto-resume after 2 seconds for non-fuel waypoints
              waypointPauseTimeoutRef.current = window.setTimeout(() => {
                setSimulationState('playing');
                setSimulationWaypointName(null);
                waypointPauseTimeoutRef.current = null;
              }, 2000);
            }
            
            return;
          }
        }
      }

      // Throttle state updates to ~2fps (every 500ms) for UI display
      // This dramatically reduces re-renders to improve touch responsiveness on mobile
      // while keeping the animation smooth via refs
      // Use startTransition to mark these as low-priority updates
      if (timestamp - lastProgressUpdateRef.current > 500) {
        lastProgressUpdateRef.current = timestamp;
        startTransition(() => {
          setSimulationProgress(newProgress);
        });
      }

      // Pan camera to follow motorcycle - throttle to ~30fps (33ms) to reduce main thread blocking
      // This is the key optimization for mobile touch responsiveness
      const map = mapRef.current;
      const pos = currentSimulationPosRef.current;
      if (map && pos && timestamp - lastCameraUpdateRef.current > 33) {
        lastCameraUpdateRef.current = timestamp;
        map.setCenter({ lat: pos.lat, lng: pos.lng });
        // Update bounds for day labels to follow during animation (throttled to ~3fps)
        animationFrameCounterRef.current++;
        if (animationFrameCounterRef.current % 10 === 0) {
          const bounds = map.getBounds();
          if (bounds) {
            startTransition(() => {
              setMapBounds(bounds);
            });
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationState, simulationPath, simulationWaypointsForPause, simulationSpeed]);

  // Compute visible day labels within current viewport
  const visibleDayLabels = useMemo(() => {
    if (!mapBounds || daySegments.length === 0 || dayRoutePaths.length === 0) return [];

    // Viewport centre — used to anchor each day badge to the route point
    // closest to where the user is actually looking.
    const ne = mapBounds.getNorthEast();
    const sw = mapBounds.getSouthWest();
    const centerLat = (ne.lat() + sw.lat()) / 2;
    const centerLng = (ne.lng() + sw.lng()) / 2;

    const labels: { day: number; lat: number; lng: number; text: string }[] = [];

    for (const segment of daySegments) {
      // Find the corresponding route path for this day
      const dayPath = dayRoutePaths.find(p => p.day === segment.day);
      if (!dayPath || dayPath.path.length < 2) continue;

      // Find the visible route point closest to the viewport centre.
      // This ensures the badge tracks the pan position smoothly instead
      // of getting anchored to a dense cluster of points.
      let bestPt: { lat: number; lng: number } | null = null;
      let bestDist = Infinity;

      for (const pt of dayPath.path) {
        if (!mapBounds.contains({ lat: pt.lat, lng: pt.lng })) continue;
        const d = Math.pow(pt.lat - centerLat, 2) + Math.pow(pt.lng - centerLng, 2);
        if (d < bestDist) {
          bestDist = d;
          bestPt = pt;
        }
      }

      if (bestPt) {
        // Calculate offset to move label away from route line and waypoints
        // Use a northward offset (positive lat) to position above the route
        // The offset scales inversely with zoom - smaller offset at higher zoom
        const zoomFactor = Math.max(1, 12 - (currentZoom ?? 8));
        const latOffset = 0.008 * zoomFactor; // ~800m at zoom 8, less at higher zoom
        
        // Check distance to nearest waypoint and increase offset if too close
        let finalLat = bestPt.lat + latOffset;
        const finalLng = bestPt.lng;
        
        // Find minimum distance to any waypoint in this segment
        const minWpDistSq = segment.waypoints.reduce((min, wp) => {
          const distSq = Math.pow(bestPt!.lat - wp.lat, 2) + Math.pow(bestPt!.lng - wp.lng, 2);
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

    // Push apart any labels that are too close to each other.
    // On overlapping route sections multiple day badges land at nearly the
    // same position; spread them so every badge is readable.
    const zf = Math.max(1, 12 - (currentZoom ?? 8));
    const minSepLat = 0.014 * zf;  // minimum latitude separation
    const minSepLng = 0.014 * zf;  // minimum longitude separation

    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const dLat = Math.abs(labels[i].lat - labels[j].lat);
        const dLng = Math.abs(labels[i].lng - labels[j].lng);
        if (dLat < minSepLat && dLng < minSepLng) {
          // Nudge the later label southward so it sits below the earlier one.
          labels[j].lat = labels[i].lat - minSepLat;
        }
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

    // If currently in any fullscreen mode, exit
    if (isFullscreen) {
      if (isCssFullscreen) {
        // Exit CSS fullscreen
        setIsCssFullscreen(false);
        setIsFullscreen(false);
      } else if (document.fullscreenElement) {
        // Exit native fullscreen
        document.exitFullscreen();
      }
      return;
    }

    // Try native fullscreen first
    if (container.requestFullscreen) {
      container.requestFullscreen().catch(() => {
        // Native fullscreen failed (likely iOS or permission denied)
        // Fall back to CSS fullscreen
        setIsCssFullscreen(true);
        setIsFullscreen(true);
      });
    } else {
      // No native fullscreen support - use CSS fallback
      setIsCssFullscreen(true);
      setIsFullscreen(true);
    }
  }, [isFullscreen, isCssFullscreen]);

  // Simulation control functions
  const startSimulation = useCallback((mode: 'day' | 'full', day?: number) => {
    setSimulationMode(mode);
    if (mode === 'day' && day !== undefined) {
      setSimulationDay(day);
    }
    simulationProgressRef.current = 0;
    lastProgressUpdateRef.current = 0;
    setSimulationProgress(0);
    setSimulationState('playing');
    setSimulationWaypointName(null);
    setUserPannedDuringPause(false);
    setShowFuelPrompt(false);
    setShowOutOfFuelPrompt(false);
    outOfFuelDismissedRef.current = false;
    prevFuelPercentRef.current = null;
    visitedWaypointsRef.current.clear();
    lastAnimationTimeRef.current = 0;
    lastFuelStopProgressRef.current = 0; // Start with full tank
    lowFuelAlertTriggeredRef.current = false; // Reset low fuel alert for new simulation

    // Auto-collapse panel on mobile, keep expanded on desktop
    setSimulationPanelExpanded(!isMobileViewport);

    // Zoom to start of route
    const map = mapRef.current;
    if (map) {
      const path = mode === 'full' ? routePath : dayRoutePaths.find(p => p.day === (day ?? simulationDay))?.path;
      if (path && path.length > 0) {
        map.panTo({ lat: path[0].lat, lng: path[0].lng });
        const zoom = map.getZoom() ?? 10;
        if (zoom < 11) {
          map.setZoom(11);
        }
      }
    }
  }, [routePath, dayRoutePaths, simulationDay, isMobileViewport]);

  const pauseSimulation = useCallback(() => {
    if (waypointPauseTimeoutRef.current !== null) {
      window.clearTimeout(waypointPauseTimeoutRef.current);
      waypointPauseTimeoutRef.current = null;
    }
    setSimulationState('paused');
  }, []);

  const resumeSimulation = useCallback(() => {
    setSimulationState('playing');
    setUserPannedDuringPause(false);
    lastAnimationTimeRef.current = 0;
  }, []);

  const stopSimulation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (waypointPauseTimeoutRef.current !== null) {
      window.clearTimeout(waypointPauseTimeoutRef.current);
      waypointPauseTimeoutRef.current = null;
    }
    setSimulationMode('off');
    setSimulationState('idle');
    simulationProgressRef.current = 0;
    lastProgressUpdateRef.current = 0;
    setSimulationProgress(0);
    setSimulationWaypointName(null);
    setUserPannedDuringPause(false);
    setShowFuelPrompt(false);
    setShowOutOfFuelPrompt(false);
    outOfFuelDismissedRef.current = false;
    prevFuelPercentRef.current = null;
    visitedWaypointsRef.current.clear();
    lastFuelStopProgressRef.current = 0;
    lowFuelAlertTriggeredRef.current = false; // Reset for next simulation
    setLowFuelToast(null); // Clear any existing toast
  }, []);

  // Fuel prompt handlers
  const handleFillUp = useCallback(() => {
    // Fill up - reset fuel gauge by recording current progress as last fuel stop
    lastFuelStopProgressRef.current = simulationProgress;
    setShowFuelPrompt(false);
    setShowOutOfFuelPrompt(false);
    outOfFuelDismissedRef.current = false;
    setSimulationWaypointName(null);
    setSimulationState('playing');
    lastAnimationTimeRef.current = 0;
  }, [simulationProgress]);

  const handleSkipFillUp = useCallback(() => {
    // Skip fill-up - just resume without refueling
    setShowFuelPrompt(false);
    setSimulationWaypointName(null);
    setSimulationState('playing');
    lastAnimationTimeRef.current = 0;
  }, []);

  const recenterSimulation = useCallback(() => {
    const map = mapRef.current;
    if (map && simulationPosition) {
      map.panTo({ lat: simulationPosition.lat, lng: simulationPosition.lng });
      setUserPannedDuringPause(false);
    }
  }, [simulationPosition]);

  const handleMapDragEnd = useCallback(() => {
    // Track if user panned away during pause
    if (simulationState === 'paused' || simulationState === 'waypoint-pause') {
      setUserPannedDuringPause(true);
    }
  }, [simulationState]);

  // Number of days available for simulation
  const numSimulationDays = daySegments.length;

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
  // CSS fullscreen uses fixed positioning to cover the viewport
  // Use explicit pixel dimensions for iOS Safari compatibility (vw/vh are unreliable during rotation)
  const dynamicContainerStyle: React.CSSProperties = isCssFullscreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: cssFullscreenDimensions.width > 0 ? `${cssFullscreenDimensions.width}px` : '100vw',
        height: cssFullscreenDimensions.height > 0 ? `${cssFullscreenDimensions.height}px` : '100vh',
        zIndex: 9999,
        touchAction: 'none',
      }
    : isFullscreen
    ? { width: "100%", height: "100vh", touchAction: "none" }
    : containerStyle;

  return (
    <div ref={mapContainerRef} className="relative" data-map-fullscreen={isCssFullscreen || isFullscreen ? "true" : undefined}>
    <GoogleMap
      mapContainerStyle={dynamicContainerStyle}
      center={center}
      onLoad={handleMapLoad}
      onIdle={handleMapIdle}
      onZoomChanged={handleZoomChanged}
      onClick={handleMapClick}
      onDragEnd={handleMapDragEnd}
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
            className="pointer-events-auto rounded border-2 border-amber-700 bg-amber-400 px-3 py-1.5 text-[11px] font-semibold text-black shadow-lg"
            role="status"
            aria-live="polite"
          >
            {zoomHint}
          </div>
        </div>
      )}

      {/* Low fuel alert toast */}
      {lowFuelToast && (
        <div
          className="pointer-events-none flex justify-center"
          style={{ position: "absolute", left: 0, right: 0, top: 160, zIndex: 47 }}
        >
          <div
            className="pointer-events-auto rounded-lg border-2 border-amber-700 bg-amber-400 px-4 py-2 text-sm font-semibold text-black shadow-lg"
            role="alert"
            aria-live="assertive"
          >
            <span aria-hidden="true">⛽</span> {lowFuelToast}
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
                  else if (item.category === "charging") inferredType = "CHARGING";
                  else if (item.category === "border") inferredType = "BORDER";

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
          style={{ position: "absolute", left: 8, top: 8, zIndex: 30, maxWidth: "calc(100% - 180px)" }}
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
              aria-label={t("searchPlaceholder")}
              className="w-full max-w-64 rounded border border-adv-border bg-slate-950/90 px-2 py-1 text-[11px] text-slate-100 shadow-adv-glow placeholder:text-slate-500"
            />
          </StandaloneSearchBox>
        </div>
      )}

      {/* Fit route, measure, and fullscreen controls */}
      <div
        data-tour-map-tools
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
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); toggleFullscreen(); }}
          className="rounded border border-adv-border bg-slate-950/80 px-2 py-1 text-[10px] text-slate-200 shadow-adv-glow hover:bg-slate-900 touch-manipulation"
          title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
          aria-label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
        >
          <span aria-hidden="true">⛶</span>
        </button>
      </div>

      {/* Nearby places controls panel - collapsible overlay on the map */}
      {nearbyPlacesControls && (
        <div
          className="pointer-events-auto"
          style={{
            position: "absolute",
            left: 8,
            bottom: 8,
            zIndex: 30,
            maxWidth: "calc(100% - 300px)",
            maxHeight: nearbyPlacesPanelExpanded
              ? (isFullscreen ? "calc(100vh - 60px)" : "280px")
              : "auto",
          }}
        >
          <div className="rounded border border-adv-border bg-slate-950/95 p-2 text-[11px] text-slate-200 shadow-adv-glow">
            {/* Collapsible header */}
            <button
              type="button"
              onClick={() => setNearbyPlacesPanelExpanded(!nearbyPlacesPanelExpanded)}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setNearbyPlacesPanelExpanded(!nearbyPlacesPanelExpanded); }}
              className="flex w-full items-center justify-between gap-2 text-left py-1 touch-manipulation"
              aria-expanded={nearbyPlacesPanelExpanded}
              aria-controls="nearby-places-panel-body"
            >
              <span className="text-[10px] font-semibold text-amber-400">
                {t("nearbyPlaces")}
              </span>
              <span className="text-[10px] text-slate-500">
                {nearbyPlacesPanelExpanded ? '▼' : '▶'}
              </span>
            </button>
            {/* Expanded content */}
            {nearbyPlacesPanelExpanded && (
              <div
                id="nearby-places-panel-body"
                className="mt-1"
                style={{
                  maxHeight: isFullscreen ? "calc(100vh - 100px)" : "220px",
                  overflowY: "auto",
                }}
              >
                {nearbyPlacesControls}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ride simulation controls - shown when route has waypoints OR simulation is active */}
      {((routePath && routePath.length > 1) || simulationMode !== 'off') && (
        <div
          className="pointer-events-auto"
          style={{ position: "absolute", right: 8, top: 44, zIndex: 30 }}
        >
          <div className="rounded border border-adv-border bg-slate-950/95 p-2 text-[11px] shadow-adv-glow">
            {/* Collapsible header */}
            <button
              type="button"
              onClick={() => setSimulationPanelExpanded(!simulationPanelExpanded)}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setSimulationPanelExpanded(!simulationPanelExpanded); }}
              className="flex w-full items-center justify-between gap-2 text-left py-1 touch-manipulation"
              aria-expanded={simulationPanelExpanded}
              aria-controls="simulation-panel-body"
            >
              <span className="text-[10px] font-semibold text-teal-400">
                {t("simulation.rideSimulation")}
              </span>
              <span className="text-[10px] text-slate-500">
                {simulationPanelExpanded ? '▼' : '▶'}
              </span>
            </button>

            {/* Mobile collapsed view - compact controls when simulation is active but panel collapsed */}
            {simulationMode !== 'off' && !simulationPanelExpanded && (
              <div className="mt-1.5 flex items-center gap-2" id="simulation-panel-body">
                {/* Progress bar */}
                {simulationTelemetry && (
                  <div
                    className="relative h-1.5 w-16 overflow-hidden rounded bg-slate-700"
                    role="progressbar"
                    aria-label={t("simulation.rideSimulation")}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(simulationTelemetry.progressPercent)}
                  >
                    <div
                      className="absolute left-0 top-0 h-full bg-teal-500"
                      style={{ width: `${simulationTelemetry.progressPercent}%` }}
                    />
                  </div>
                )}
                {/* Play/Pause button */}
                {simulationState === 'playing' ? (
                  <button
                    type="button"
                    aria-label={t("simulation.pause")}
                    onClick={pauseSimulation}
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); pauseSimulation(); }}
                    className="rounded border border-amber-500 bg-amber-600/80 px-2 py-1 text-[10px] font-semibold text-white hover:bg-amber-500 active:bg-amber-400 touch-manipulation"
                  >
                    <span aria-hidden="true">⏸</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={t("simulation.play")}
                    onClick={resumeSimulation}
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); resumeSimulation(); }}
                    className="rounded border border-teal-600 bg-teal-700/80 px-2 py-1 text-[10px] font-semibold text-white hover:bg-teal-600 active:bg-teal-500 touch-manipulation"
                  >
                    <span aria-hidden="true">▶</span>
                  </button>
                )}
                {/* Stop button */}
                <button
                  type="button"
                  aria-label={t("simulation.stop")}
                  onClick={stopSimulation}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); stopSimulation(); }}
                  className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-600 active:bg-slate-500 touch-manipulation"
                >
                  <span aria-hidden="true">⏹</span>
                </button>
              </div>
            )}

            {/* Expanded content - show when panel is expanded */}
            {simulationPanelExpanded && (
              <div id="simulation-panel-body" className="mt-1.5">
            {simulationMode === 'off' ? (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => startSimulation('full')}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); startSimulation('full'); }}
                  className="rounded border border-teal-600 bg-teal-700/80 px-3 py-2 text-[10px] font-semibold text-white hover:bg-teal-600 active:bg-teal-500 touch-manipulation"
                >
                  ▶ {t("simulation.fullRoute")}
                </button>
                {numSimulationDays > 1 && (
                  <div className="flex items-center gap-1">
                    <select
                      value={simulationDay}
                      onChange={(e) => setSimulationDay(Number(e.target.value))}
                      aria-label={t("simulation.day", { day: simulationDay })}
                      className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-[10px] text-slate-200 touch-manipulation"
                    >
                      {Array.from({ length: numSimulationDays }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {t("simulation.day", { day })}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => startSimulation('day', simulationDay)}
                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); startSimulation('day', simulationDay); }}
                      className="rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-[10px] text-slate-200 hover:bg-slate-600 active:bg-slate-500 touch-manipulation"
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="text-[9px] text-slate-400">
                  {simulationMode === 'full' ? t("simulation.fullRoute") : t("simulation.day", { day: simulationDay })}
                </div>
                <div className="flex gap-1">
                {simulationState === 'playing' ? (
                    <button
                      type="button"
                      onClick={pauseSimulation}
                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); pauseSimulation(); }}
                      className="flex-1 rounded border border-amber-500 bg-amber-600/80 px-3 py-2 text-[10px] font-semibold text-white hover:bg-amber-500 active:bg-amber-400 touch-manipulation"
                    >
                      ⏸ {t("simulation.pause")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={resumeSimulation}
                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); resumeSimulation(); }}
                      className="flex-1 rounded border border-teal-600 bg-teal-700/80 px-3 py-2 text-[10px] font-semibold text-white hover:bg-teal-600 active:bg-teal-500 touch-manipulation"
                    >
                      ▶ {t("simulation.play")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={stopSimulation}
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); stopSimulation(); }}
                    className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-[10px] text-slate-200 hover:bg-slate-600 active:bg-slate-500 touch-manipulation"
                  >
                    ⏹ {t("simulation.stop")}
                  </button>
                </div>
                {/* Speed control */}
                <div className="flex items-center gap-2 pt-1">
                  <span id="simulationSpeedLabel" className="text-[9px] text-slate-400">{t("simulation.speed")}:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.5"
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    aria-labelledby="simulationSpeedLabel"
                    className="h-2 w-20 cursor-pointer appearance-none rounded bg-slate-600 accent-teal-500 touch-manipulation"
                  />
                  <span className="w-6 text-[9px] font-semibold text-teal-300">{simulationSpeed}x</span>
                </div>
                {/* Telemetry dashboard strip */}
                {simulationTelemetry && (
                  <div className="mt-2 space-y-1 border-t border-slate-700 pt-2">
                    {/* Distance (Odometer) */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400">{t("simulation.dist")}:</span>
                      <span className="text-[9px] text-slate-200">
                        {simulationTelemetry.distanceTraveled ?? '--'}
                        <span className="text-slate-500"> / {simulationTelemetry.distanceTotal ?? '--'}</span>
                      </span>
                    </div>
                    {/* Time elapsed */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400">{t("simulation.time")}:</span>
                      <span className="text-[9px] text-slate-200">
                        {simulationTelemetry.timeElapsed ?? '--'}
                        <span className="text-slate-500"> / {simulationTelemetry.timeTotal ?? '--'}</span>
                      </span>
                    </div>
                    {/* Fuel gauge */}
                    {simulationTelemetry.fuelPercent != null && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] text-slate-400">{t("simulation.fuel")}:</span>
                        <div className="flex items-center gap-1.5">
                          <div className="relative h-2 w-16 overflow-hidden rounded bg-slate-700">
                            <div
                              className={`absolute left-0 top-0 h-full ${
                                simulationTelemetry.fuelPercent > 30
                                  ? 'bg-green-500'
                                  : simulationTelemetry.fuelPercent > 15
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${simulationTelemetry.fuelPercent}%` }}
                            />
                          </div>
                          <span className={`w-7 text-right text-[9px] font-semibold ${
                            simulationTelemetry.fuelPercent > 30
                              ? 'text-green-400'
                              : simulationTelemetry.fuelPercent > 15
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}>
                            {Math.round(simulationTelemetry.fuelPercent)}%
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Progress bar */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <div
                        className="relative h-1.5 flex-1 overflow-hidden rounded bg-slate-700"
                        role="progressbar"
                        aria-label={t("simulation.rideSimulation")}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(simulationTelemetry.progressPercent)}
                      >
                        <div
                          className="absolute left-0 top-0 h-full bg-teal-500"
                          style={{ width: `${simulationTelemetry.progressPercent}%` }}
                        />
                      </div>
                      <span className="w-7 text-right text-[8px] text-slate-400">
                        {Math.round(simulationTelemetry.progressPercent)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Measure mode choice prompt */}
      {measureModePrompt && (
        <div
          className="pointer-events-none flex justify-center"
          style={{ position: "absolute", left: 0, right: 0, top: 40, zIndex: 40 }}
        >
          <div
            className="pointer-events-auto rounded-lg border-2 border-amber-500 bg-slate-950/95 px-4 py-3 shadow-lg"
            role="dialog"
            aria-label={t("measureChoiceTitle")}
          >
            <p className="mb-2 text-[11px] font-semibold text-amber-300">{t("measureChoiceTitle")}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleMeasureFromWaypoint}
                className="rounded border border-amber-500 bg-amber-600/80 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-500"
              >
                {t("measureFromWaypoint")}
              </button>
              <button
                type="button"
                onClick={handleMeasureFromAnywhere}
                className="rounded border border-slate-500 bg-slate-700 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-600"
              >
                {t("measureFromAnywhere")}
              </button>
              <button
                type="button"
                onClick={handleMeasureCancel}
                className="rounded border border-slate-600 px-3 py-1 text-[10px] text-slate-400 hover:bg-slate-800"
              >
                {t("cancel")}
              </button>
            </div>
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
            className="pointer-events-auto rounded border-2 border-amber-700 bg-amber-400 px-3 py-1.5 text-[11px] font-semibold text-black shadow-lg"
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
            className="pointer-events-auto rounded border-2 border-amber-700 bg-amber-400 px-3 py-1.5 text-[11px] font-semibold text-black shadow-lg"
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
              <div className="space-y-1.5">
                <div className="text-slate-500">{t("noRouteFound")}</div>
                <div className="text-[10px] text-slate-400">{t("clickNewDestination")}</div>
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
            )}
          </div>
        </div>
      )}

      {/* Simulation motorcycle marker */}
      {simulationMode !== 'off' && simulationPosition && (
        <Marker
          key="simulation-motorcycle"
          position={simulationPosition}
          icon={{
            url: svgToIconUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#dc2626" stroke="#fff" stroke-width="2"/><circle cx="10" cy="20" r="4" fill="#fff"/><circle cx="22" cy="20" r="4" fill="#fff"/><rect x="8" y="14" width="16" height="6" rx="2" fill="#fff"/><rect x="14" y="10" width="6" height="6" rx="1" fill="#fff"/></svg>`),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          }}
          zIndex={300}
        />
      )}

      {/* Predictive range end marker */}
      {rangeEndPosition && (
        <Marker
          key="range-end-marker"
          position={rangeEndPosition}
          icon={{
            url: svgToIconUrl(fuelRangeEndIconSvg),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12),
          }}
          title={t("simulation.rangeEndsHere")}
          zIndex={220}
        />
      )}

      {/* Simulation waypoint name overlay */}
      {simulationWaypointName && (simulationState === 'waypoint-pause' || simulationState === 'paused') && (
        <div
          className="pointer-events-none flex justify-center"
          style={{ position: "absolute", left: 0, right: 0, top: 80, zIndex: 45 }}
        >
          <div
            className="pointer-events-auto rounded-lg border-2 border-teal-500 bg-slate-950/95 px-4 py-2 text-sm font-semibold text-teal-300 shadow-lg"
            role="status"
            aria-live="polite"
          >
            📍 {simulationWaypointName}
          </div>
        </div>
      )}

      {/* Out-of-fuel prompt (auto-pause at 0%) */}
      {showOutOfFuelPrompt && (
        <div
          className="pointer-events-none flex justify-center"
          style={{ position: "absolute", left: 0, right: 0, top: 120, zIndex: 48 }}
        >
          <div
            className="pointer-events-auto w-[min(360px,92%)] rounded-lg border-2 border-red-500 bg-slate-950/95 px-4 py-3 shadow-lg"
            role="alertdialog"
            aria-modal="false"
            aria-labelledby="out-of-fuel-title"
          >
            <p id="out-of-fuel-title" className="mb-2 text-sm font-semibold text-red-300">⛽ {t("simulation.outOfFuelTitle")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { if (onLowFuelAlert) onLowFuelAlert(); setShowOutOfFuelPrompt(false); }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); if (onLowFuelAlert) onLowFuelAlert(); setShowOutOfFuelPrompt(false); }}
                className="rounded border border-amber-500 bg-amber-600/80 px-3 py-2 text-[11px] font-semibold text-white hover:bg-amber-500 active:bg-amber-400 touch-manipulation"
              >
                {t("simulation.findStation")}
              </button>
              <button
                type="button"
                onClick={() => { outOfFuelDismissedRef.current = true; setShowOutOfFuelPrompt(false); resumeSimulation(); }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); outOfFuelDismissedRef.current = true; setShowOutOfFuelPrompt(false); resumeSimulation(); }}
                className="rounded border border-slate-500 bg-slate-700 px-3 py-2 text-[11px] text-slate-200 hover:bg-slate-600 active:bg-slate-500 touch-manipulation"
              >
                {t("simulation.continueAnyway")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fuel fill-up prompt */}
      {showFuelPrompt && (
        <div
          className="pointer-events-none flex justify-center"
          style={{ position: "absolute", left: 0, right: 0, top: 120, zIndex: 46 }}
        >
          <div
            className="pointer-events-auto rounded-lg border-2 border-green-500 bg-slate-950/95 px-4 py-3 shadow-lg"
            role="dialog"
            aria-label={t("simulation.fillUp")}
          >
            <p className="mb-2 text-sm font-semibold text-green-300">⛽ {t("simulation.fillUp")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleFillUp}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleFillUp(); }}
                className="rounded border border-green-500 bg-green-600/80 px-4 py-2 text-[11px] font-semibold text-white hover:bg-green-500 active:bg-green-400 touch-manipulation"
              >
                {t("simulation.yes")}
              </button>
              <button
                type="button"
                onClick={handleSkipFillUp}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleSkipFillUp(); }}
                className="rounded border border-slate-500 bg-slate-700 px-4 py-2 text-[11px] text-slate-200 hover:bg-slate-600 active:bg-slate-500 touch-manipulation"
              >
                {t("simulation.no")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulation recenter button - shown when user panned away during pause */}
      {simulationMode !== 'off' && userPannedDuringPause && (simulationState === 'paused' || simulationState === 'waypoint-pause') && (
        <div
          className="pointer-events-auto"
          style={{ position: "absolute", right: 8, bottom: 60, zIndex: 35 }}
        >
          <button
            type="button"
            onClick={recenterSimulation}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); recenterSimulation(); }}
            className="rounded border border-teal-500 bg-teal-600/90 px-4 py-2 text-[11px] font-semibold text-white shadow-lg hover:bg-teal-500 active:bg-teal-400 touch-manipulation"
          >
            {t("simulation.recenter")}
          </button>
        </div>
      )}

      {/* Measurement markers - bright magenta to match measure lines */}
      <Marker
        key="measure-start"
        position={measurePoints[0] ?? { lat: 0, lng: 0 }}
        visible={measureMode && measurePoints.length >= 1}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#e879f9",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        }}
        zIndex={100}
      />
      <Marker
        key="measure-end"
        position={measurePoints[1] ?? { lat: 0, lng: 0 }}
        visible={measureMode && measurePoints.length === 2}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#e879f9",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        }}
        zIndex={100}
      />

      {/* Measurement route polylines - bright magenta animated dashes */}
      <Polyline
        key="measure-route-0"
        path={measureRoutes[0]?.path ?? []}
        visible={measureMode && measureRoutes.length >= 1}
        options={{
          strokeColor: "#e879f9",
          strokeOpacity: 0,
          strokeWeight: 6,
          zIndex: 50,
          icons: [{
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 1,
              strokeColor: "#e879f9",
              scale: 4,
            },
            offset: `${measureAnimOffset}%`,
            repeat: "20px",
          }],
        }}
      />
      <Polyline
        key="measure-route-1"
        path={measureRoutes[1]?.path ?? []}
        visible={measureMode && measureRoutes.length >= 2}
        options={{
          strokeColor: "#c084fc",
          strokeOpacity: 0,
          strokeWeight: 4,
          zIndex: 40,
          icons: [{
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 0.7,
              strokeColor: "#c084fc",
              scale: 3,
            },
            offset: "0",
            repeat: "16px",
          }],
        }}
      />
      <Polyline
        key="measure-route-2"
        path={measureRoutes[2]?.path ?? []}
        visible={measureMode && measureRoutes.length >= 3}
        options={{
          strokeColor: "#c084fc",
          strokeOpacity: 0,
          strokeWeight: 4,
          zIndex: 40,
          icons: [{
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 0.7,
              strokeColor: "#c084fc",
              scale: 3,
            },
            offset: "0",
            repeat: "16px",
          }],
        }}
      />

      {/* Route polylines are managed imperatively via useEffect + routePolylinesRef */}

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

        // VIA shaping points: small gray draggable circles
        if (wpType === "VIA") {
          return (
            <Marker
              key={`via-${index}`}
              position={position}
              draggable
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: "#94a3b8",
                fillOpacity: 0.9,
                strokeColor: "#fff",
                strokeWeight: 2,
              }}
              zIndex={5}
              title="Via point (drag to reshape route)"
              onClick={() => {
                if (onMarkerClick) onMarkerClick(index);
              }}
              onDragEnd={(e) => {
                if (!e.latLng) return;
                if (onWaypointDragEnd) {
                  onWaypointDragEnd(index, e.latLng.lat(), e.latLng.lng());
                }
              }}
            />
          );
        }

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
        } else if (wpType === "CHARGING") {
          icon = {
            url: svgToIconUrl(chargingIconSvg),
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14),
          };
          zIndex = 9;
        } else if (wpType === "BORDER") {
          icon = {
            url: svgToIconUrl(borderIconSvg),
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14),
          };
          zIndex = 9;
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
              // Border markers also open the crossing detail popup
              if (wpType === "BORDER") {
                handleBorderClick(position.lat, position.lng, index);
              }
              if (onMarkerClick) onMarkerClick(index);
            }}
          />
        );
      })}

      {/* Border crossing hover popup */}
      {hoveredBorderWaypoint && (
        <InfoWindow
          position={{ lat: hoveredBorderWaypoint.lat, lng: hoveredBorderWaypoint.lng }}
          onCloseClick={handleBorderPopupClose}
          options={{
            pixelOffset: new google.maps.Size(0, -30),
            disableAutoPan: true,
          }}
        >
          <div 
            className="border-crossing-popup"
            style={{ 
              maxWidth: 320, 
              maxHeight: 400,
              overflowY: 'auto',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {borderCrossingLoading ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                <div style={{ marginBottom: 8 }}>🔄</div>
                <div style={{ fontSize: 12 }}>{t("loadingCrossings")}</div>
              </div>
            ) : (() => {
              const cacheKey = `${hoveredBorderWaypoint.lat.toFixed(4)},${hoveredBorderWaypoint.lng.toFixed(4)}`;
              const crossings = borderCrossingsCache.get(cacheKey) || [];
              
              if (crossings.length === 0) {
                return (
                  <div style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🚧</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t("borderCrossing")}</div>
                    <div style={{ fontSize: 11, marginTop: 4, color: '#94a3b8' }}>
                      {waypoints[hoveredBorderWaypoint.index]?.name || t("noCrossingsFound")}
                    </div>
                  </div>
                );
              }
              
              // Show the closest crossing (first one)
              const crossing = crossings[0];
              
              return (
                <div>
                  {/* Photos */}
                  {crossing.photoUrls && crossing.photoUrls.length > 0 && (
                    <div style={{ 
                      display: 'flex', 
                      gap: 4, 
                      overflowX: 'auto',
                      marginBottom: 8,
                      paddingBottom: 4,
                    }}>
                      {crossing.photoUrls.slice(0, 3).map((url, i) => (
                        <EnlargeablePhoto
                          key={i}
                          src={url}
                          alt={`${crossing.name} photo ${i + 1}`}
                          thumbWidth={100}
                          thumbHeight={75}
                          inlineStyles
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Name and rating */}
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>
                    {crossing.name}
                  </div>
                  
                  {crossing.rating && (
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      ⭐ {crossing.rating.toFixed(1)}
                      {crossing.fromCountry && crossing.toCountry && (
                        <span style={{ marginLeft: 8 }}>
                          {crossing.fromCountry} → {crossing.toCountry}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Address */}
                  {crossing.address && (
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                      📍 {crossing.address}
                    </div>
                  )}
                  
                  {/* Opening hours */}
                  {crossing.openingHours && crossing.openingHours.length > 0 && (
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                      🕐 {crossing.openingHours[0]}
                    </div>
                  )}
                  
                  {/* Website link */}
                  {crossing.websiteUrl && (
                    <div style={{ marginBottom: 6 }}>
                      <a 
                        href={crossing.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          fontSize: 11, 
                          color: '#3b82f6',
                          textDecoration: 'none',
                        }}
                      >
                        🔗 {t("visitWebsite")}
                      </a>
                    </div>
                  )}
                  
                  {/* AI Tips if available */}
                  {crossing.hasAiTips && crossing.motorcycleTips && (
                    <div style={{ 
                      marginTop: 8, 
                      padding: 8, 
                      backgroundColor: '#f0fdf4', 
                      borderRadius: 4,
                      borderLeft: '3px solid #22c55e',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                        🏍️ {t("motorcycleTips")}
                      </div>
                      <div style={{ fontSize: 11, color: '#166534', lineHeight: 1.4 }}>
                        {crossing.motorcycleTips.slice(0, 150)}
                        {crossing.motorcycleTips.length > 150 && '...'}
                      </div>
                    </div>
                  )}
                  
                  {/* Warnings if available */}
                  {crossing.warnings && (
                    <div style={{ 
                      marginTop: 6, 
                      padding: 6, 
                      backgroundColor: '#fef2f2', 
                      borderRadius: 4,
                      borderLeft: '3px solid #ef4444',
                    }}>
                      <div style={{ fontSize: 10, color: '#991b1b' }}>
                        ⚠️ {crossing.warnings.slice(0, 100)}
                        {crossing.warnings.length > 100 && '...'}
                      </div>
                    </div>
                  )}
                  
                  {/* Show count if multiple crossings nearby */}
                  {crossings.length > 1 && (
                    <div style={{ 
                      marginTop: 8, 
                      fontSize: 10, 
                      color: '#8b5cf6',
                      textAlign: 'center',
                    }}>
                      +{crossings.length - 1} {t("moreCrossingsNearby")}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </InfoWindow>
      )}

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

      {showChargingPlaces && chargingPlaces.length > 0 && (
        <MarkerClusterer>
          {(clusterer) => (
            <>
              {chargingPlaces.map((p, idx) => {
              const isHighlighted =
                highlightedPlace &&
                highlightedPlace.category === "charging" &&
                highlightedPlace.lat === p.lat &&
                highlightedPlace.lng === p.lng;

              const icon = {
                url: svgToIconUrl(isHighlighted ? chargingIconSvgHighlight : chargingIconSvg),
                scaledSize: new google.maps.Size(isHighlighted ? 32 : 24, isHighlighted ? 32 : 24),
                anchor: new google.maps.Point(isHighlighted ? 16 : 12, isHighlighted ? 16 : 12),
              };

              return (
                <Marker
                  key={`charging-place-${idx}`}
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

      {showBorderPlaces && borderPlaces.length > 0 && (
        <MarkerClusterer>
          {(clusterer) => (
            <>
              {borderPlaces.map((p, idx) => {
              const isHighlighted =
                highlightedPlace &&
                highlightedPlace.category === "border" &&
                highlightedPlace.lat === p.lat &&
                highlightedPlace.lng === p.lng;

              const icon = {
                url: svgToIconUrl(isHighlighted ? borderIconSvgHighlight : borderIconSvg),
                scaledSize: new google.maps.Size(isHighlighted ? 32 : 24, isHighlighted ? 32 : 24),
                anchor: new google.maps.Point(isHighlighted ? 16 : 12, isHighlighted ? 16 : 12),
              };

              return (
                <Marker
                  key={`border-place-${idx}`}
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
                charging: "bg-sky-500",
                border: "bg-violet-500",
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
