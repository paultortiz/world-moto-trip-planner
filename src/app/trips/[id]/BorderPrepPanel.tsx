"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createFetchTracker } from "@/lib/safeFetch";
import { useTranslations, useLocale } from "next-intl";
import ReactMarkdown from "react-markdown";
import {
  type BorderPort,
  type BorderRequirement,
  getWaitTimeSeverity,
  getWaitTimeColorClasses,
} from "@/lib/borderCrossings";
import {
  detectCountriesForWaypoints,
  findCountryTransitions,
  getUniqueCountriesInOrder,
  getCountryPairs,
  type WaypointWithCountry,
} from "@/lib/countryDetection";

// Type for vehicle entry requirements from API
interface VehicleEntryRequirement {
  id: string;
  destCountry: string;
  countryName: string;
  tipRequired: boolean;
  tipCostUsd: number | null;
  tipValidityDays: number | null;
  tipObtainAt: string | null;
  tipAgency: string | null;
  tipUrl: string | null;
  tipDocuments: string[] | null;
  tipNotes: string | null;
  tipProcessingDays: number | null;
  carnetRequired: boolean;
  carnetAccepted: boolean;
  carnetIssuers: { country: string; org: string; url: string }[] | null;
  carnetNotes: string | null;
  carnetProcessingWeeks: number | null;
  depositRequired: boolean;
  depositAmountUsd: number | null;
  depositRefundable: boolean | null;
  depositNotes: string | null;
  insuranceRequired: boolean;
  insuranceNotes: string | null;
  sourceUrl: string | null;
  lastVerified: string | null;
}

// Type for border crossing from Google Places API
interface BorderCrossingData {
  id: string;
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  openingHours: string[] | null;
  phoneNumber: string | null;
  websiteUrl: string | null;
  photoUrls: string[];
  fromCountry: string | null;
  toCountry: string | null;
  // AI-enhanced fields
  motorcycleTips: string | null;
  warnings: string | null;
  bestTimeToGo: string | null;
  tipProcessInfo: string | null;
  hasAiTips: boolean;
}

interface WaypointDto {
  id?: string;
  lat: number;
  lng: number;
  name?: string | null;
  type?: string | null;
}

interface BorderPrepPanelProps {
  waypoints: WaypointDto[];
}

// Enlargeable photo component with desktop hover and mobile tap support
function EnlargeablePhoto({ src, alt }: { src: string; alt: string }) {
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!imgRef.current || window.innerWidth < 768) return; // Skip on mobile
    
    const rect = imgRef.current.getBoundingClientRect();
    const enlargedWidth = rect.width * 3;
    const enlargedHeight = rect.height * 3;
    
    // Calculate position to keep enlarged image within viewport
    let top = rect.top + rect.height / 2 - enlargedHeight / 2;
    let left = rect.left + rect.width / 2 - enlargedWidth / 2;
    
    // Adjust if going off screen
    const padding = 16;
    if (left < padding) left = padding;
    if (left + enlargedWidth > window.innerWidth - padding) {
      left = window.innerWidth - enlargedWidth - padding;
    }
    if (top < padding) top = padding;
    if (top + enlargedHeight > window.innerHeight - padding) {
      top = window.innerHeight - enlargedHeight - padding;
    }
    
    setPosition({ top, left });
    setIsEnlarged(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsEnlarged(false);
  }, []);

  // Mobile tap handler - opens in modal-like overlay
  const handleTap = useCallback(() => {
    if (window.innerWidth >= 768) return; // Desktop uses hover
    setIsEnlarged(true);
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setIsEnlarged(false);
  }, []);

  return (
    <>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="h-20 w-28 flex-shrink-0 cursor-pointer rounded object-cover transition-transform md:cursor-zoom-in"
        loading="lazy"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleTap}
      />
      
      {/* Desktop: Hover enlargement */}
      {isEnlarged && position && window.innerWidth >= 768 && (
        <div
          className="pointer-events-none fixed z-50 hidden md:block"
          style={{ top: position.top, left: position.left }}
        >
          <img
            src={src}
            alt={alt}
            className="h-60 w-84 rounded-lg object-cover shadow-2xl ring-2 ring-slate-600"
            style={{ width: 336, height: 240 }} // 3x of 112x80
          />
        </div>
      )}
      
      {/* Mobile: Tap to open overlay */}
      {isEnlarged && window.innerWidth < 768 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 md:hidden"
          onClick={handleCloseOverlay}
        >
          <div className="relative max-h-[80vh] max-w-[90vw]">
            <img
              src={src}
              alt={alt}
              className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain"
            />
            <button
              type="button"
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white shadow-lg"
              onClick={handleCloseOverlay}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Category icons for document requirements
const CATEGORY_ICONS: Record<string, string> = {
  passport: "🛂",
  visa: "📋",
  vehicle: "🏍️",
  insurance: "🛡️",
  health: "💉",
  customs: "📦",
  tips: "💡",
};

// Category display order
const CATEGORY_ORDER = ["passport", "visa", "vehicle", "insurance", "health", "customs", "tips"];

// Crossing card component for displaying border crossing details
function CrossingCard({ 
  crossing, 
  t, 
  onGetTips,
  onRegenerateTips,
  isLoadingTips 
}: { 
  crossing: BorderCrossingData; 
  t: (key: string) => string;
  onGetTips: (id: string) => void;
  onRegenerateTips: (id: string) => void;
  isLoadingTips: boolean;
}) {
  const [showAllTips, setShowAllTips] = useState(false);

  return (
    <div className="rounded border border-slate-700 bg-slate-900/50 p-3">
      {/* Photos */}
      {crossing.photoUrls.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {crossing.photoUrls.map((url, idx) => (
            <EnlargeablePhoto
              key={idx}
              src={url}
              alt={`${crossing.name} photo ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h6 className="text-sm font-medium text-slate-200">{crossing.name}</h6>
          {crossing.address && (
            <p className="text-[10px] text-slate-500">📍 {crossing.address}</p>
          )}
        </div>
        {crossing.rating && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-amber-400">★</span>
            <span className="text-slate-300">{crossing.rating.toFixed(1)}</span>
            {crossing.userRatingsTotal && (
              <span className="text-slate-500">({crossing.userRatingsTotal})</span>
            )}
          </div>
        )}
      </div>

      {/* Opening hours */}
      {crossing.openingHours && crossing.openingHours.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] text-slate-400">
            🕐 {crossing.openingHours[0]}
          </p>
        </div>
      )}

      {/* Contact info */}
      <div className="mb-2 flex flex-wrap gap-3 text-[10px]">
        {crossing.phoneNumber && (
          <a href={`tel:${crossing.phoneNumber}`} className="text-blue-400 hover:underline">
            📞 {crossing.phoneNumber}
          </a>
        )}
        {crossing.websiteUrl && (
          <a
            href={crossing.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            🌐 {t("crossing.website")}
          </a>
        )}
      </div>

      {/* AI-generated tips section */}
      {crossing.hasAiTips ? (
        <div className="mt-3 space-y-2">
          {/* Best time to go */}
          {crossing.bestTimeToGo && (
            <div className="rounded bg-emerald-500/10 p-2">
              <p className="text-[10px] font-medium text-emerald-400">🕐 {t("crossing.bestTime")}</p>
              <p className="text-[10px] text-slate-300">{crossing.bestTimeToGo}</p>
            </div>
          )}

          {/* Motorcycle tips */}
          {crossing.motorcycleTips && (
            <div className="rounded bg-violet-500/10 p-2">
              <p className="text-[10px] font-medium text-violet-400">🏍️ {t("crossing.motoTips")}</p>
              <div className={`prose prose-invert prose-xs max-w-none text-[10px] text-slate-300 ${!showAllTips && "line-clamp-3"}`}>
                <ReactMarkdown>{crossing.motorcycleTips}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Warnings */}
          {crossing.warnings && (
            <div className="rounded bg-red-500/10 p-2">
              <p className="text-[10px] font-medium text-red-400">⚠️ {t("crossing.warnings")}</p>
              <div className={`prose prose-invert prose-xs max-w-none text-[10px] text-slate-300 ${!showAllTips && "line-clamp-2"}`}>
                <ReactMarkdown>{crossing.warnings}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* TIP/Permit info */}
          {crossing.tipProcessInfo && (
            <div className="rounded bg-amber-500/10 p-2">
              <p className="text-[10px] font-medium text-amber-400">📋 {t("crossing.permitProcess")}</p>
              <div className={`prose prose-invert prose-xs max-w-none text-[10px] text-slate-300 ${!showAllTips && "line-clamp-3"}`}>
                <ReactMarkdown>{crossing.tipProcessInfo}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Show more/less toggle and regenerate button */}
          <div className="flex items-center gap-3">
            {(crossing.motorcycleTips || crossing.warnings || crossing.tipProcessInfo) && (
              <button
                type="button"
                onClick={() => setShowAllTips(!showAllTips)}
                className="text-[10px] text-violet-400 hover:underline"
              >
                {showAllTips ? t("crossing.showLess") : t("crossing.showMore")}
              </button>
            )}
            <button
              type="button"
              onClick={() => onRegenerateTips(crossing.id)}
              disabled={isLoadingTips}
              className="text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-50"
              title={t("crossing.regenerateTips")}
            >
              {isLoadingTips ? (
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 animate-spin rounded-full border border-slate-400 border-t-transparent" />
                </span>
              ) : (
                <span>↻ {t("crossing.regenerateTips")}</span>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Get AI tips button */
        <button
          type="button"
          onClick={() => onGetTips(crossing.id)}
          disabled={isLoadingTips}
          className="mt-3 flex items-center gap-2 rounded bg-violet-500/20 px-3 py-1.5 text-[10px] font-medium text-violet-300 hover:bg-violet-500/30 disabled:opacity-50"
        >
          {isLoadingTips ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border border-violet-400 border-t-transparent" />
              {t("crossing.generatingTips")}
            </>
          ) : (
            <>
              🏍️ {t("crossing.getMotoTips")}
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function BorderPrepPanel({ waypoints }: BorderPrepPanelProps) {
  const t = useTranslations("borderCrossings");
  const locale = useLocale();

  // Panel state
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"countries" | "crossings" | "vehicleEntry" | "requirements">("countries");

  // Country detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [waypointsWithCountry, setWaypointsWithCountry] = useState<WaypointWithCountry[]>([]);
  const [countriesDetected, setCountriesDetected] = useState(false);

  // Wait times state
  const [waitTimes, setWaitTimes] = useState<Map<string, BorderPort>>(new Map());
  const [waitTimesLoading, setWaitTimesLoading] = useState(false);

  // Requirements state
  const [requirements, setRequirements] = useState<Map<string, BorderRequirement[]>>(new Map());
  const [requirementsLoading, setRequirementsLoading] = useState<string | null>(null);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);

  // Vehicle entry requirements state
  const [vehicleRequirements, setVehicleRequirements] = useState<Map<string, VehicleEntryRequirement>>(new Map());
  const [vehicleReqLoading, setVehicleReqLoading] = useState<Set<string>>(new Set());

  // Border crossings state (keyed by border waypoint location)
  const [borderCrossingsData, setBorderCrossingsData] = useState<Map<string, BorderCrossingData[]>>(new Map());
  const [crossingsLoading, setCrossingsLoading] = useState<Set<string>>(new Set());
  const [aiTipsLoading, setAiTipsLoading] = useState<Set<string>>(new Set());
  // Track fetch errors for potential UI display (currently logged to console)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fetchErrors, setFetchErrors] = useState<Map<string, string>>(new Map());

  // FetchTrackers to prevent infinite loops and limit retries (max 3 attempts per key)
  const crossingsTrackerRef = useRef(createFetchTracker(3));
  const vehicleReqTrackerRef = useRef(createFetchTracker(3));
  const aiTipsTrackerRef = useRef(createFetchTracker(3));
  const waitTimesTrackerRef = useRef(createFetchTracker(3));

  // Derived data
  const borderWaypoints = useMemo(
    () => waypoints.filter((wp) => wp.type === "BORDER"),
    [waypoints]
  );

  const transitions = useMemo(
    () => findCountryTransitions(waypointsWithCountry),
    [waypointsWithCountry]
  );

  const uniqueCountries = useMemo(
    () => getUniqueCountriesInOrder(waypointsWithCountry),
    [waypointsWithCountry]
  );

  const countryPairs = useMemo(() => getCountryPairs(transitions), [transitions]);

  // Detect countries when panel is expanded and waypoints change
  const detectCountries = useCallback(async () => {
    if (waypoints.length === 0) return;
    if (typeof google === "undefined" || !google.maps) return;

    setIsDetecting(true);
    setDetectionProgress(0);

    try {
      const geocoder = new google.maps.Geocoder();
      const results = await detectCountriesForWaypoints(
        waypoints,
        geocoder,
        (completed, total) => {
          setDetectionProgress(Math.round((completed / total) * 100));
        }
      );
      console.log("[BorderPrep] Detected countries for waypoints:", results.map(r => ({ name: r.name, country: r.country })));
      setWaypointsWithCountry(results);
      setCountriesDetected(true);
    } catch (err) {
      console.error("Country detection failed:", err);
    } finally {
      setIsDetecting(false);
    }
  }, [waypoints]);

  // Fetch wait times for border waypoints
  const fetchWaitTimes = useCallback(async () => {
    if (borderWaypoints.length === 0) return;
    
    const tracker = waitTimesTrackerRef.current;
    const trackKey = "wait-times";
    
    if (!tracker.canFetch(trackKey)) {
      if (tracker.isBlocked(trackKey)) {
        console.error(`[BorderPrep] Wait times fetch blocked after ${tracker.getFailureCount(trackKey)} failures`);
      }
      return;
    }

    tracker.startFetch(trackKey);
    setWaitTimesLoading(true);
    const newWaitTimes = new Map<string, BorderPort>();

    try {
      for (const wp of borderWaypoints) {
        const response = await fetch(
          `/api/border/wait-times?lat=${wp.lat}&lng=${wp.lng}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.port) {
            newWaitTimes.set(wp.id ?? `${wp.lat},${wp.lng}`, data.port);
          }
        }
      }
      setWaitTimes(newWaitTimes);
      tracker.completeFetch(trackKey);
    } catch (err) {
      console.error("Failed to fetch wait times:", err);
      tracker.failFetch(trackKey);
      setFetchErrors((prev) => new Map(prev).set(trackKey, String(err)));
    } finally {
      setWaitTimesLoading(false);
    }
  }, [borderWaypoints]);

  // Generate requirements for a country pair
  const generateRequirements = useCallback(
    async (from: string, to: string) => {
      const key = `${from}-${to}`;
      setRequirementsLoading(key);
      setRequirementsError(null);

      try {
        const response = await fetch("/api/ai/border-requirements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originCountry: from,
            destCountry: to,
            locale,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error ?? "Failed to generate requirements");
        }

        const data = await response.json();
        setRequirements((prev) => new Map(prev).set(key, data.requirements));
      } catch (err: any) {
        setRequirementsError(err.message);
      } finally {
        setRequirementsLoading(null);
      }
    },
    [locale]
  );

  // Auto-detect countries when panel is first expanded
  useEffect(() => {
    if (isExpanded && !countriesDetected && !isDetecting) {
      detectCountries();
    }
  }, [isExpanded, countriesDetected, isDetecting, detectCountries]);

  // Fetch wait times when panel is expanded
  useEffect(() => {
    if (isExpanded && borderWaypoints.length > 0) {
      fetchWaitTimes();
    }
  }, [isExpanded, borderWaypoints, fetchWaitTimes]);

  // Fetch vehicle entry requirements for a country
  const fetchVehicleRequirements = useCallback(async (countryCode: string) => {
    const tracker = vehicleReqTrackerRef.current;
    const trackKey = `vehicle-${countryCode}`;
    
    if (!tracker.canFetch(trackKey)) {
      if (tracker.isBlocked(trackKey)) {
        console.error(`[BorderPrep] Vehicle requirements for ${countryCode} blocked after ${tracker.getFailureCount(trackKey)} failures`);
      }
      return;
    }

    tracker.startFetch(trackKey);
    setVehicleReqLoading((prev) => new Set(prev).add(countryCode));

    try {
      const response = await fetch(`/api/vehicle-requirements?country=${countryCode}`);
      if (response.ok) {
        const data = await response.json();
        if (data.requirements) {
          setVehicleRequirements((prev) => new Map(prev).set(countryCode, data.requirements));
        }
        tracker.completeFetch(trackKey);
      } else {
        tracker.failFetch(trackKey);
        console.error(`[BorderPrep] Vehicle requirements API error for ${countryCode}: ${response.status}`);
      }
    } catch (err) {
      console.error(`Failed to fetch vehicle requirements for ${countryCode}:`, err);
      tracker.failFetch(trackKey);
      setFetchErrors((prev) => new Map(prev).set(trackKey, String(err)));
    } finally {
      setVehicleReqLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(countryCode);
        return newSet;
      });
    }
  }, []); // No state dependencies - uses tracker ref

  // Auto-fetch vehicle requirements when countries are detected
  useEffect(() => {
    if (activeTab === "vehicleEntry" && uniqueCountries.length > 0) {
      for (const country of uniqueCountries) {
        fetchVehicleRequirements(country.code);
      }
    }
  }, [activeTab, uniqueCountries, fetchVehicleRequirements]);

  // Fetch border crossings near a location (using Google Places)
  // Uses FetchTracker for deduplication and retry limits
  const fetchNearbyCrossings = useCallback(async (lat: number, lng: number) => {
    const tracker = crossingsTrackerRef.current;
    const trackKey = `crossings-${lat.toFixed(4)},${lng.toFixed(4)}`;
    const stateKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    
    if (!tracker.canFetch(trackKey)) {
      if (tracker.isBlocked(trackKey)) {
        console.error(`[BorderPrep] Crossings fetch for ${stateKey} blocked after ${tracker.getFailureCount(trackKey)} failures`);
      }
      return;
    }

    tracker.startFetch(trackKey);
    setCrossingsLoading((prev) => new Set(prev).add(stateKey));

    try {
      const response = await fetch(`/api/nearby-crossings?lat=${lat}&lng=${lng}&radius=100`);
      if (response.ok) {
        const data = await response.json();
        if (data.crossings && data.crossings.length > 0) {
          setBorderCrossingsData((prev) => new Map(prev).set(stateKey, data.crossings));
        }
        tracker.completeFetch(trackKey);
      } else {
        tracker.failFetch(trackKey);
        console.error(`[BorderPrep] Nearby crossings API error: ${response.status}`);
      }
    } catch (err) {
      console.error(`Failed to fetch nearby crossings for ${lat},${lng}:`, err);
      tracker.failFetch(trackKey);
      setFetchErrors((prev) => new Map(prev).set(trackKey, String(err)));
    } finally {
      setCrossingsLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(stateKey);
        return newSet;
      });
    }
  }, []); // No state dependencies - uses tracker ref

  // Fetch AI tips for a specific crossing
  const fetchAiTips = useCallback(async (crossingId: string) => {
    const tracker = aiTipsTrackerRef.current;
    const trackKey = `ai-tips-${crossingId}`;
    
    if (!tracker.canFetch(trackKey)) {
      if (tracker.isBlocked(trackKey)) {
        console.error(`[BorderPrep] AI tips for ${crossingId} blocked after ${tracker.getFailureCount(trackKey)} failures`);
      }
      return;
    }

    tracker.startFetch(trackKey);
    setAiTipsLoading((prev) => new Set(prev).add(crossingId));

    try {
      const response = await fetch(`/api/border-crossings/${crossingId}/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (response.ok) {
        const data = await response.json();
        // Update the crossing data with AI tips
        setBorderCrossingsData((prev) => {
          const newMap = new Map(prev);
          for (const [key, crossings] of newMap) {
            const updated = crossings.map((c) =>
              c.id === crossingId
                ? {
                    ...c,
                    motorcycleTips: data.crossing.motorcycleTips,
                    warnings: data.crossing.warnings,
                    bestTimeToGo: data.crossing.bestTimeToGo,
                    tipProcessInfo: data.crossing.tipProcessInfo,
                    hasAiTips: true,
                  }
                : c
            );
            newMap.set(key, updated);
          }
          return newMap;
        });
        tracker.completeFetch(trackKey);
      } else {
        tracker.failFetch(trackKey);
        console.error(`[BorderPrep] AI tips API error for ${crossingId}: ${response.status}`);
      }
    } catch (err) {
      console.error(`Failed to fetch AI tips for crossing ${crossingId}:`, err);
      tracker.failFetch(trackKey);
      setFetchErrors((prev) => new Map(prev).set(trackKey, String(err)));
    } finally {
      setAiTipsLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(crossingId);
        return newSet;
      });
    }
  }, [locale]); // Only locale dependency - uses tracker ref

  // Regenerate AI tips for a specific crossing (force regeneration)
  // Note: This resets the tracker for the crossing to allow a fresh attempt
  const regenerateAiTips = useCallback(async (crossingId: string) => {
    const tracker = aiTipsTrackerRef.current;
    const trackKey = `ai-tips-${crossingId}`;
    
    // Reset tracker for this key to allow regeneration
    tracker.reset(trackKey);
    
    // Check if currently loading
    if (!tracker.canFetch(trackKey)) {
      return;
    }

    tracker.startFetch(trackKey);
    setAiTipsLoading((prev) => new Set(prev).add(crossingId));

    try {
      const response = await fetch(`/api/border-crossings/${crossingId}/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, forceRegenerate: true }),
      });
      if (response.ok) {
        const data = await response.json();
        // Update the crossing data with new AI tips
        setBorderCrossingsData((prev) => {
          const newMap = new Map(prev);
          for (const [key, crossings] of newMap) {
            const updated = crossings.map((c) =>
              c.id === crossingId
                ? {
                    ...c,
                    motorcycleTips: data.crossing.motorcycleTips,
                    warnings: data.crossing.warnings,
                    bestTimeToGo: data.crossing.bestTimeToGo,
                    tipProcessInfo: data.crossing.tipProcessInfo,
                    hasAiTips: true,
                  }
                : c
            );
            newMap.set(key, updated);
          }
          return newMap;
        });
        tracker.completeFetch(trackKey);
      } else {
        tracker.failFetch(trackKey);
        console.error(`[BorderPrep] Regenerate AI tips API error for ${crossingId}: ${response.status}`);
      }
    } catch (err) {
      console.error(`Failed to regenerate AI tips for crossing ${crossingId}:`, err);
      tracker.failFetch(trackKey);
      setFetchErrors((prev) => new Map(prev).set(trackKey, String(err)));
    } finally {
      setAiTipsLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(crossingId);
        return newSet;
      });
    }
  }, [locale]); // Only locale dependency - uses tracker ref

  // Auto-fetch nearby crossings when crossings tab is selected and we have border waypoints
  useEffect(() => {
    if (activeTab === "crossings" && borderWaypoints.length > 0) {
      for (const wp of borderWaypoints) {
        fetchNearbyCrossings(wp.lat, wp.lng);
      }
    }
  }, [activeTab, borderWaypoints, fetchNearbyCrossings]);

  // Group requirements by category
  const groupedRequirements = useCallback((reqs: BorderRequirement[]) => {
    const groups: Record<string, BorderRequirement[]> = {};
    for (const req of reqs) {
      if (!groups[req.category]) {
        groups[req.category] = [];
      }
      groups[req.category].push(req);
    }
    return groups;
  }, []);

  // If no border-related content, don't render
  if (waypoints.length < 2) return null;

  return (
    <section className="mb-6 rounded-lg border border-adv-border bg-slate-950/80 p-4 shadow-adv-glow">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🚧</span>
          <h2 className="text-sm font-semibold text-amber-400">{t("title")}</h2>
          {borderWaypoints.length > 0 && (
            <span className="rounded-full bg-violet-500/30 px-2 py-0.5 text-[10px] text-violet-300">
              {borderWaypoints.length} {t("crossings")}
            </span>
          )}
        </div>
        <span className="text-slate-500">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4">
          {/* Tab buttons */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("countries")}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "countries"
                  ? "bg-amber-500/30 text-amber-300"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {t("countriesTab")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("vehicleEntry")}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "vehicleEntry"
                  ? "bg-violet-500/30 text-violet-300"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              🏍️ {t("vehicleEntryTab")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("crossings")}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "crossings"
                  ? "bg-emerald-500/30 text-emerald-300"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              🚧 {t("crossingsTab")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("requirements")}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === "requirements"
                  ? "bg-amber-500/30 text-amber-300"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {t("requirementsTab")}
            </button>
          </div>

          {/* Countries tab */}
          {activeTab === "countries" && (
            <div>
              {/* Detection progress */}
              {isDetecting && (
                <div className="mb-4">
                  <p className="mb-1 text-xs text-slate-400">{t("detectingCountries")}</p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${detectionProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Countries list */}
              {!isDetecting && uniqueCountries.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-semibold text-slate-300">
                    {t("countriesOnRoute")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {uniqueCountries.map((country, idx) => (
                      <span
                        key={`${country.code}-${idx}`}
                        className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200"
                      >
                        {country.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Border crossings with wait times */}
              {borderWaypoints.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-slate-300">
                    {t("borderCrossings")}
                  </h3>
                  <div className="space-y-2">
                    {borderWaypoints.map((wp) => {
                      const key = wp.id ?? `${wp.lat},${wp.lng}`;
                      const waitTime = waitTimes.get(key);
                      const severity = waitTime
                        ? getWaitTimeSeverity(waitTime.passengerWaitMinutes)
                        : "unknown";
                      const colors = getWaitTimeColorClasses(severity);

                      return (
                        <div
                          key={key}
                          className={`rounded border p-2 ${colors.border} ${colors.bg}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-slate-200">
                                {wp.name ?? t("unnamedCrossing")}
                              </p>
                              {waitTime && (
                                <p className="text-[10px] text-slate-400">
                                  {waitTime.portName} · {waitTime.crossingName}
                                </p>
                              )}
                            </div>
                            {waitTimesLoading ? (
                              <span className="text-[10px] text-slate-500">
                                {t("loading")}
                              </span>
                            ) : waitTime?.passengerWaitMinutes != null ? (
                              <div className="text-right">
                                <span className={`text-sm font-bold ${colors.text}`}>
                                  {waitTime.passengerWaitMinutes} {t("minutes")}
                                </span>
                                <p className="text-[10px] text-slate-500">
                                  {waitTime.passengerLanesOpen} {t("lanesOpen")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">
                                {t("noWaitData")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No border crossings */}
              {borderWaypoints.length === 0 && !isDetecting && (
                <p className="text-xs text-slate-500">{t("noBorderCrossings")}</p>
              )}
            </div>
          )}

          {/* Vehicle Entry tab */}
          {activeTab === "vehicleEntry" && (
            <div>
              {isDetecting ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-500">{t("detectingCountries")}</p>
                </div>
              ) : uniqueCountries.length > 0 ? (
                <div className="space-y-4">
                  {uniqueCountries.map((country) => {
                    const req = vehicleRequirements.get(country.code);
                    const isLoading = vehicleReqLoading.has(country.code);

                    return (
                      <div
                        key={country.code}
                        className="rounded border border-slate-700 bg-slate-900/50 p-3"
                      >
                        <h4 className="mb-3 text-sm font-semibold text-slate-200">
                          {country.name}
                        </h4>

                        {isLoading && (
                          <div className="flex items-center gap-2 py-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                            <span className="text-xs text-slate-400">{t("loading")}</span>
                          </div>
                        )}

                        {!isLoading && !req && (
                          <p className="text-xs text-slate-500">{t("noVehicleData")}</p>
                        )}

                        {req && (
                          <div className="space-y-4">
                            {/* TIP Section */}
                            <div className="rounded bg-slate-800/50 p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <h5 className="flex items-center gap-2 text-xs font-medium text-violet-300">
                                  📝 {t("vehicleEntry.tip")}
                                </h5>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    req.tipRequired
                                      ? "bg-amber-500/30 text-amber-300"
                                      : "bg-emerald-500/30 text-emerald-300"
                                  }`}
                                >
                                  {req.tipRequired ? t("vehicleEntry.tipRequired") : t("vehicleEntry.tipNotRequired")}
                                </span>
                              </div>

                              {req.tipRequired && (
                                <div className="grid gap-2 text-xs">
                                  {/* Cost and Validity */}
                                  <div className="flex flex-wrap gap-4">
                                    <div>
                                      <span className="text-slate-500">{t("vehicleEntry.cost")}:</span>{" "}
                                      <span className="text-slate-200">
                                        {req.tipCostUsd === 0 || req.tipCostUsd === null
                                          ? t("vehicleEntry.free")
                                          : `$${req.tipCostUsd} USD`}
                                      </span>
                                    </div>
                                    {req.tipValidityDays && (
                                      <div>
                                        <span className="text-slate-500">{t("vehicleEntry.validity")}:</span>{" "}
                                        <span className="text-slate-200">{req.tipValidityDays} {t("vehicleEntry.days")}</span>
                                      </div>
                                    )}
                                    {req.tipProcessingDays && (
                                      <div>
                                        <span className="text-slate-500">{t("vehicleEntry.processingTime")}:</span>{" "}
                                        <span className="text-slate-200">{req.tipProcessingDays} {t("vehicleEntry.days")}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Where to obtain */}
                                  {req.tipObtainAt && (
                                    <div>
                                      <span className="text-slate-500">{t("vehicleEntry.obtainAt")}:</span>{" "}
                                      <span className="text-slate-200">
                                        {req.tipObtainAt === "online" ? t("vehicleEntry.online") : t("vehicleEntry.border")}
                                      </span>
                                    </div>
                                  )}

                                  {/* Agency */}
                                  {req.tipAgency && (
                                    <div>
                                      <span className="text-slate-500">{t("vehicleEntry.agency")}:</span>{" "}
                                      {req.tipUrl ? (
                                        <a
                                          href={req.tipUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-violet-400 hover:text-violet-300 hover:underline"
                                        >
                                          {req.tipAgency} ↗
                                        </a>
                                      ) : (
                                        <span className="text-slate-200">{req.tipAgency}</span>
                                      )}
                                    </div>
                                  )}

                                  {/* Documents */}
                                  {req.tipDocuments && req.tipDocuments.length > 0 && (
                                    <div>
                                      <p className="mb-1 text-slate-500">{t("vehicleEntry.documents")}:</p>
                                      <ul className="ml-4 list-disc text-slate-300">
                                        {req.tipDocuments.map((doc: string, idx: number) => (
                                          <li key={idx}>{doc}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Notes */}
                                  {req.tipNotes && (
                                    <div className="mt-2 rounded bg-slate-900/50 p-2">
                                      <p className="text-[10px] text-slate-400">
                                        💡 {req.tipNotes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Carnet Section */}
                            <div className="rounded bg-slate-800/50 p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <h5 className="flex items-center gap-2 text-xs font-medium text-violet-300">
                                  📘 {t("vehicleEntry.carnet")}
                                </h5>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    req.carnetRequired
                                      ? "bg-red-500/30 text-red-300"
                                      : req.carnetAccepted
                                      ? "bg-blue-500/30 text-blue-300"
                                      : "bg-slate-600/30 text-slate-400"
                                  }`}
                                >
                                  {req.carnetRequired
                                    ? t("vehicleEntry.carnetRequired")
                                    : req.carnetAccepted
                                    ? t("vehicleEntry.carnetAccepted")
                                    : t("vehicleEntry.carnetNotNeeded")}
                                </span>
                              </div>

                              {req.carnetRequired && (
                                <div className="grid gap-2 text-xs">
                                  {req.carnetProcessingWeeks && (
                                    <div>
                                      <span className="text-slate-500">{t("vehicleEntry.processingTime")}:</span>{" "}
                                      <span className="text-slate-200">{req.carnetProcessingWeeks} {t("vehicleEntry.weeks")}</span>
                                    </div>
                                  )}

                                  {req.carnetIssuers && req.carnetIssuers.length > 0 && (
                                    <div>
                                      <p className="mb-1 text-slate-500">{t("vehicleEntry.issuers")}:</p>
                                      <ul className="ml-4 space-y-1 text-slate-300">
                                        {req.carnetIssuers.map((issuer: { country: string; org: string; url: string }, idx: number) => (
                                          <li key={idx}>
                                            <span className="text-slate-500">{issuer.country}:</span>{" "}
                                            <a
                                              href={issuer.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-violet-400 hover:text-violet-300 hover:underline"
                                            >
                                              {issuer.org} ↗
                                            </a>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {req.carnetNotes && (
                                    <div className="mt-2 rounded bg-slate-900/50 p-2">
                                      <p className="text-[10px] text-slate-400">
                                        💡 {req.carnetNotes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Deposit Section */}
                            {req.depositRequired && (
                              <div className="rounded bg-slate-800/50 p-3">
                                <h5 className="mb-2 flex items-center gap-2 text-xs font-medium text-violet-300">
                                  💰 {t("vehicleEntry.deposit")}
                                </h5>
                                <div className="grid gap-2 text-xs">
                                  <div className="flex flex-wrap gap-4">
                                    {req.depositAmountUsd && (
                                      <div>
                                        <span className="text-slate-500">{t("vehicleEntry.cost")}:</span>{" "}
                                        <span className="text-slate-200">${req.depositAmountUsd} USD</span>
                                      </div>
                                    )}
                                    {req.depositRefundable !== null && (
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                                          req.depositRefundable
                                            ? "bg-emerald-500/30 text-emerald-300"
                                            : "bg-amber-500/30 text-amber-300"
                                        }`}
                                      >
                                        {req.depositRefundable
                                          ? t("vehicleEntry.depositRefundable")
                                          : t("vehicleEntry.depositNonRefundable")}
                                      </span>
                                    )}
                                  </div>
                                  {req.depositNotes && (
                                    <p className="text-[10px] text-slate-400">
                                      💡 {req.depositNotes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Insurance Section */}
                            {req.insuranceRequired && (
                              <div className="rounded bg-slate-800/50 p-3">
                                <h5 className="mb-2 flex items-center gap-2 text-xs font-medium text-violet-300">
                                  🛡️ {t("vehicleEntry.insurance")}
                                </h5>
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-[10px] text-amber-300">
                                    {t("vehicleEntry.insuranceRequired")}
                                  </span>
                                </div>
                                {req.insuranceNotes && (
                                  <p className="mt-2 text-[10px] text-slate-400">
                                    💡 {req.insuranceNotes}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500">
                              {req.sourceUrl && (
                                <a
                                  href={req.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-violet-400 hover:underline"
                                >
                                  {t("vehicleEntry.officialSource")} ↗
                                </a>
                              )}
                              {req.lastVerified && (
                                <span>
                                  {t("vehicleEntry.lastVerified")}: {new Date(req.lastVerified).toLocaleDateString(locale)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-500">{t("singleCountryTrip")}</p>
                </div>
              )}
            </div>
          )}

          {/* Crossings tab */}
          {activeTab === "crossings" && (
            <div>
              {borderWaypoints.length > 0 ? (
                <div className="space-y-6">
                  {borderWaypoints.map((wp) => {
                    const key = `${wp.lat.toFixed(4)},${wp.lng.toFixed(4)}`;
                    const crossings = borderCrossingsData.get(key);
                    const isLoading = crossingsLoading.has(key);

                    return (
                      <div key={wp.id ?? key}>
                        <div className="mb-3">
                          <h4 className="text-xs font-semibold text-slate-200">
                            {t("crossing.nearbyResults")}
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            📍 {wp.name || t("crossing.nearLocation")} ({wp.lat.toFixed(4)}, {wp.lng.toFixed(4)})
                          </p>
                        </div>

                        {isLoading && (
                          <div className="flex items-center gap-2 py-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                            <span className="text-xs text-slate-400">{t("crossing.searchingNearby")}</span>
                          </div>
                        )}

                        {!isLoading && (!crossings || crossings.length === 0) && (
                          <p className="text-xs text-slate-500">{t("noCrossingsData")}</p>
                        )}

                        {crossings && crossings.length > 0 && (
                          <div className="space-y-3">
                            {crossings.map((crossing: BorderCrossingData) => (
                              <CrossingCard
                                key={crossing.id}
                                crossing={crossing}
                                t={t}
                                onGetTips={fetchAiTips}
                                onRegenerateTips={regenerateAiTips}
                                isLoadingTips={aiTipsLoading.has(crossing.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-500">{t("crossing.noBorderWaypoints")}</p>
                  <p className="mt-1 text-[10px] text-slate-600">{t("crossing.addBorderWaypoint")}</p>
                </div>
              )}
            </div>
          )}

          {/* Requirements tab */}
          {activeTab === "requirements" && (
            <div>
              {/* Country transitions */}
              {countryPairs.length > 0 ? (
                <div className="space-y-4">
                {countryPairs.map(({ from, to, fromName, toName }) => {
                    const key = `${from}-${to}`;
                    const reqs = requirements.get(key);
                    const isLoading = requirementsLoading === key;
                    const grouped = reqs ? groupedRequirements(reqs) : null;

                    return (
                      <div
                        key={key}
                        className="rounded border border-slate-700 bg-slate-900/50 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-slate-200">
                            {fromName} → {toName}
                          </h4>
                          {!reqs && (
                            <button
                              type="button"
                              onClick={() => generateRequirements(from, to)}
                              disabled={isLoading}
                              className="rounded bg-amber-500/30 px-2 py-1 text-[10px] font-medium text-amber-300 hover:bg-amber-500/40 disabled:opacity-50"
                            >
                              {isLoading ? t("generating") : t("generateRequirements")}
                            </button>
                          )}
                        </div>

                        {/* Loading spinner */}
                        {isLoading && (
                          <div className="flex items-center gap-2 py-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                            <span className="text-xs text-slate-400">{t("generating")}</span>
                          </div>
                        )}

                        {/* Requirements by category */}
                        {grouped && (
                          <div className="space-y-3">
                            {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat) => (
                              <div key={cat}>
                                <h5 className="mb-1 flex items-center gap-1 text-[11px] font-medium text-slate-300">
                                  <span>{CATEGORY_ICONS[cat]}</span>
                                  {t(`categories.${cat}`)}
                                </h5>
                                <div className="space-y-1">
                                  {grouped[cat].map((req, idx) => (
                                    <div
                                      key={idx}
                                      className="rounded bg-slate-800/50 p-2"
                                    >
                                      <div className="flex items-start gap-2">
                                        <span
                                          className={`mt-0.5 text-[10px] ${
                                            req.required
                                              ? "text-red-400"
                                              : "text-slate-500"
                                          }`}
                                        >
                                          {req.required ? "●" : "○"}
                                        </span>
                                        <div>
                                          <p className="text-xs font-medium text-slate-200">
                                            {req.title}
                                          </p>
                                          <p className="mt-0.5 text-[10px] text-slate-400">
                                            {req.description}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center">
                  {isDetecting ? (
                    <p className="text-xs text-slate-500">{t("detectingCountries")}</p>
                  ) : countriesDetected && transitions.length === 0 ? (
                    <p className="text-xs text-slate-500">{t("singleCountryTrip")}</p>
                  ) : (
                    <p className="text-xs text-slate-500">{t("noRequirements")}</p>
                  )}
                </div>
              )}

              {/* Error message */}
              {requirementsError && (
                <p className="mt-2 text-xs text-red-400">{requirementsError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
