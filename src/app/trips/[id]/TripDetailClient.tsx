"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import ReactMarkdown from "react-markdown";
import TripPlannerMap, {
  type WaypointPosition,
} from "@/features/map/TripPlannerMap";
import RecalculateRouteButton from "./RecalculateRouteButton";
import DeleteTripButton from "./DeleteTripButton";
import WaypointEditor from "./WaypointEditor";
import ElevationProfile from "./ElevationProfile";

interface WaypointDto {
  id?: string;
  lat: number;
  lng: number;
  name?: string | null;
  type?: string | null;
  notes?: string | null;
  dayIndex?: number | null;
  googlePlaceId?: string | null;
}

interface DailyPlanEntry {
  day: number;
  distanceKm: number;
  durationHours: number;
}

type FuelRisk = "low" | "medium" | "high";

interface FuelLeg {
  label: string;
  distanceKm: number;
  risk: FuelRisk;
}

interface FuelPlanSummary {
  longestLegKm: number | null;
  legs: FuelLeg[];
}

interface TripChecklistItemDto {
  id?: string;
  label: string;
  isDone: boolean;
}

type SegmentRiskLevel = "low" | "medium" | "high" | "extreme" | null;

interface SegmentNoteDto {
  index: number; // 0-based segment index (wp[index] -> wp[index+1])
  risk: SegmentRiskLevel;
  note: string;
}

type ChecklistTemplateId = "ADV" | "ROAD" | "OFFROAD" | "BDR";

const ADV_DEFAULT_CHECKLIST: TripChecklistItemDto[] = [
  { label: "Inspect tires & pressures", isDone: false },
  { label: "Check oil level & fluids", isDone: false },
  { label: "Pack tools, spares, and repair kit", isDone: false },
  { label: "Verify documents (license, registration, insurance)", isDone: false },
  { label: "Download offline maps / GPX to nav device", isDone: false },
  { label: "Share itinerary & emergency contacts", isDone: false },
];

const ROAD_TRIP_CHECKLIST: TripChecklistItemDto[] = [
  { label: "Inspect tires, pressures, and tread wear", isDone: false },
  { label: "Check chain / shaft / belt and lube as needed", isDone: false },
  { label: "Confirm fuel range and next fuel stops", isDone: false },
  { label: "Pack rain gear and extra layers", isDone: false },
  { label: "Verify lodging reservations and arrival windows", isDone: false },
  { label: "Sync nav route to phone / GPS", isDone: false },
];

const OFFROAD_CHECKLIST: TripChecklistItemDto[] = [
  { label: "Set tire pressures for dirt / mixed terrain", isDone: false },
  { label: "Inspect skid plate, crash bars, and handguards", isDone: false },
  { label: "Pack tubes / plugs, pump, and tire irons", isDone: false },
  { label: "Check toolkit, tow strap, and first-aid kit", isDone: false },
  { label: "Confirm water, snacks, and extra fuel if needed", isDone: false },
  { label: "Download offline topo maps / tracks", isDone: false },
];

const BDR_CHECKLIST: TripChecklistItemDto[] = [
  { label: "Review BDR route notes and seasonal closures", isDone: false },
  { label: "Check tire condition and choose appropriate tires", isDone: false },
  { label: "Pack camping kit and cold-weather layers", isDone: false },
  { label: "Plan bail-out options and resupply towns", isDone: false },
  { label: "Share full BDR itinerary and check-in plan", isDone: false },
  { label: "Load BDR section GPX on all nav devices", isDone: false },
];

const CHECKLIST_TEMPLATES: { id: ChecklistTemplateId; label: string; items: TripChecklistItemDto[] }[] = [
  { id: "ADV", label: "ADV mixed (default)", items: ADV_DEFAULT_CHECKLIST },
  { id: "ROAD", label: "Road trip", items: ROAD_TRIP_CHECKLIST },
  { id: "OFFROAD", label: "Off-road day", items: OFFROAD_CHECKLIST },
  { id: "BDR", label: "BDR / backcountry", items: BDR_CHECKLIST },
];

interface TripDetailClientProps {
  trip: any; // structural typing via runtime shape
  routePath?: WaypointPosition[];
  motorcycles?: any[];
}

function haversineKm(a: WaypointPosition, b: WaypointPosition): number {
  const R = 6371; // km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function computeDailyPlan(
  waypoints: WaypointDto[],
  totalDistanceMeters?: number | null,
  totalDurationSeconds?: number | null,
): DailyPlanEntry[] {
  if (!waypoints || waypoints.length < 2) return [];

  const totalDistanceKm =
    (totalDistanceMeters ?? 0) > 0 ? (totalDistanceMeters as number) / 1000 : null;
  const totalDurationHrs =
    (totalDurationSeconds ?? 0) > 0 ? (totalDurationSeconds as number) / 3600 : null;

  // Derive an effective day for each waypoint by walking forward and
  // carrying the last known dayIndex, defaulting to 1 for the first
  // waypoint. This makes older trips and partial assignments behave
  // sensibly and guarantees we can build a contiguous 1..maxDay range.
  const effectiveDays: number[] = [];
  let currentDay = 1;
  for (let i = 0; i < waypoints.length; i++) {
    const raw = waypoints[i].dayIndex;
    if (typeof raw === "number" && raw >= 1) {
      currentDay = raw;
    }
    effectiveDays[i] = currentDay;
  }

  const perDayDistance = new Map<number, number>();
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const day = effectiveDays[i];
    const distanceKm = haversineKm(
      { lat: a.lat, lng: a.lng },
      { lat: b.lat, lng: b.lng },
    );
    perDayDistance.set(day, (perDayDistance.get(day) ?? 0) + distanceKm);
  }

  const maxDay = Math.max(...effectiveDays, 1);
  const entries: DailyPlanEntry[] = [];

  for (let day = 1; day <= maxDay; day++) {
    const distKm = perDayDistance.get(day) ?? 0;
    let hours = 0;
    if (totalDistanceKm && totalDurationHrs && totalDistanceKm > 0) {
      const fraction = totalDistanceKm > 0 ? distKm / totalDistanceKm : 0;
      hours = totalDurationHrs * fraction;
    }
    entries.push({ day, distanceKm: distKm, durationHours: hours });
  }

  return entries;
}

function computeFuelPlan(
  waypoints: WaypointDto[],
  totalDistanceMeters?: number | null,
  fuelRangeKm?: number | null,
  fuelReserveKm?: number | null,
): FuelPlanSummary | null {
  const fuelStops = waypoints
    .map((wp, index) => ({ ...wp, index }))
    .filter((wp) => wp.type === "FUEL");

  if (fuelStops.length < 2) return null;

  // Precompute straight-line distances between consecutive waypoints for reuse.
  const segmentDistancesKm: number[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    segmentDistancesKm.push(
      haversineKm(
        { lat: waypoints[i].lat, lng: waypoints[i].lng },
        { lat: waypoints[i + 1].lat, lng: waypoints[i + 1].lng },
      ),
    );
  }

  const legs: FuelLeg[] = [];
  let longestLegKm: number | null = null;

  const reserve = fuelReserveKm ?? (fuelRangeKm ? Math.round(fuelRangeKm * 0.8) : null);

  for (let i = 0; i < fuelStops.length - 1; i++) {
    const start = fuelStops[i];
    const end = fuelStops[i + 1];

    let distKm = 0;
    for (let idx = start.index; idx < end.index; idx++) {
      distKm += segmentDistancesKm[idx] ?? 0;
    }

    if (longestLegKm == null || distKm > longestLegKm) {
      longestLegKm = distKm;
    }

    let risk: FuelRisk = "low";
    if (fuelRangeKm && distKm > fuelRangeKm) {
      risk = "high";
    } else if (reserve && distKm > reserve) {
      risk = "medium";
    }

    const startLabel = start.name || `Fuel ${i + 1}`;
    const endLabel = end.name || `Fuel ${i + 2}`;

    legs.push({
      label: `${startLabel} → ${endLabel}`,
      distanceKm: distKm,
      risk,
    });
  }

  return { longestLegKm, legs };
}

function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const hh = String((h + 24) % 24).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function TripDetailClient({
  trip,
  routePath,
  motorcycles = [],
}: TripDetailClientProps) {
  const t = useTranslations("tripDetail");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sponsorDemoEnabled =
    process.env.NEXT_PUBLIC_SPONSOR_DEMO === "true" ||
    searchParams?.get("demoSponsors") === "1" ||
    searchParams?.get("demoSponsors") === "true";

  const [waypoints, setWaypoints] = useState<WaypointDto[]>(
    () => trip.waypoints ?? [],
  );
  const [isDirty, setIsDirty] = useState(false);
  const [fuelRangeInput, setFuelRangeInput] = useState<string>(
    trip.fuelRangeKm != null ? String(trip.fuelRangeKm) : "",
  );
  const [fuelReserveInput, setFuelReserveInput] = useState<string>(
    trip.fuelReserveKm != null ? String(trip.fuelReserveKm) : "",
  );
  const [fuelStatus, setFuelStatus] = useState<string | null>(null);
  const [fuelSaving, setFuelSaving] = useState(false);

  const [shareEnabled, setShareEnabled] = useState<boolean>(
    Boolean(trip.isPublic && trip.shareToken),
  );
  const [shareToken, setShareToken] = useState<string | null>(
    (trip.shareToken as string | null | undefined) ?? null,
  );
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareSaving, setShareSaving] = useState(false);

  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [aiPlanText, setAiPlanText] = useState<string | null>(
    (trip.aiDailyPlan as string | null | undefined) ?? null,
  );
  const [aiPlanGeneratedAt, setAiPlanGeneratedAt] = useState<string | null>(
    trip.aiDailyPlanGeneratedAt
      ? new Date(trip.aiDailyPlanGeneratedAt as string).toLocaleString()
      : null,
  );
  const [aiPlanError, setAiPlanError] = useState<string | null>(null);
  const [aiPlanClearing, setAiPlanClearing] = useState(false);

  const initialSegmentNotes: SegmentNoteDto[] =
    Array.isArray(trip.segmentNotes)
      ? (trip.segmentNotes as any[]).map((s, idx) => ({
          index: typeof s.index === "number" ? s.index : idx,
          risk:
            s.risk === "low" || s.risk === "medium" || s.risk === "high" || s.risk === "extreme"
              ? s.risk
              : null,
          note: typeof s.note === "string" ? s.note : "",
        }))
      : [];
  const [segmentNotes, setSegmentNotes] = useState<SegmentNoteDto[]>(initialSegmentNotes);
  const [segmentNotesStatus, setSegmentNotesStatus] = useState<string | null>(null);
  const [segmentNotesSaving, setSegmentNotesSaving] = useState(false);

  const initialChecklist: TripChecklistItemDto[] =
    Array.isArray(trip.checklistItems) && trip.checklistItems.length > 0
      ? trip.checklistItems.map((item: any) => ({
          id: item.id,
          label: item.label,
          isDone: !!item.isDone,
        }))
      : ADV_DEFAULT_CHECKLIST.map((item) => ({ ...item }));

  const [checklist, setChecklist] = useState<TripChecklistItemDto[]>(initialChecklist);
  const [checklistStatus, setChecklistStatus] = useState<string | null>(null);
  const [checklistSaving, setChecklistSaving] = useState(false);

  const [showClickToAddHint, setShowClickToAddHint] = useState(false);

  const [scheduleDailyHoursInput, setScheduleDailyHoursInput] = useState<string>(
    trip.plannedDailyRideHours != null ? String(trip.plannedDailyRideHours) : "",
  );
  const [scheduleEarliestInput, setScheduleEarliestInput] = useState<string>(
    trip.earliestDepartureHour != null ? String(trip.earliestDepartureHour) : "8",
  );
  const [scheduleLatestInput, setScheduleLatestInput] = useState<string>(
    trip.latestArrivalHour != null ? String(trip.latestArrivalHour) : "20",
  );
  const [scheduleStatus, setScheduleStatus] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [elevationRefreshKey, setElevationRefreshKey] = useState(0);

  const [fuelAutoSync, setFuelAutoSync] = useState<boolean>(
    trip.fuelAutoFromMotorcycle !== false,
  );

  const [bikeYearInput, setBikeYearInput] = useState<string>(
    typeof trip.motorcycle?.year === "number" ? String(trip.motorcycle.year) : "",
  );
  const [bikeMakeInput, setBikeMakeInput] = useState<string>(trip.motorcycle?.make ?? "");
  const [bikeModelInput, setBikeModelInput] = useState<string>(trip.motorcycle?.model ?? "");
  const [bikeStatus, setBikeStatus] = useState<string | null>(null);
  const [bikeSaving, setBikeSaving] = useState(false);
  const [selectedMotorcycleId, setSelectedMotorcycleId] = useState<string>(
    trip.motorcycle?.id ?? "",
  );

  const [startDateInput, setStartDateInput] = useState<string>(
    trip.startDate ? new Date(trip.startDate as string).toISOString().slice(0, 10) : "",
  );
  const [endDateInput, setEndDateInput] = useState<string>(
    trip.endDate ? new Date(trip.endDate as string).toISOString().slice(0, 10) : "",
  );
  const [datesStatus, setDatesStatus] = useState<string | null>(null);
  const [datesSaving, setDatesSaving] = useState(false);

  const dailyPlan = computeDailyPlan(
    waypoints,
    trip.totalDistanceMeters,
    trip.totalDurationSeconds,
  );
  const fuelPlan = computeFuelPlan(
    waypoints,
    trip.totalDistanceMeters,
    trip.fuelRangeKm,
    trip.fuelReserveKm,
  );

  const earliestHour =
    typeof trip.earliestDepartureHour === "number"
      ? trip.earliestDepartureHour
      : 8;
  const latestHour =
    typeof trip.latestArrivalHour === "number" ? trip.latestArrivalHour : 20;
  const targetDailyHours =
    typeof trip.plannedDailyRideHours === "number"
      ? trip.plannedDailyRideHours
      : null;

  // Derive seasonal, distance, duration, camping mix, and fuel signals for demo gear recommendations.
  let tripStartDate: Date | null = null;
  let tripStartMonth: number | null = null;

  if (startDateInput && typeof startDateInput === "string") {
    const parts = startDateInput.split("-");
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const monthIndex = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      if (Number.isFinite(year) && Number.isFinite(monthIndex) && Number.isFinite(day)) {
        const localDate = new Date(year, monthIndex, day);
        tripStartDate = localDate;
        tripStartMonth = localDate.getMonth() + 1;
      }
    }
  } else if (trip.startDate) {
    const d = new Date(trip.startDate as string);
    if (!Number.isNaN(d.getTime())) {
      tripStartDate = d;
      tripStartMonth = d.getMonth() + 1;
    }
  }

  const totalKm = typeof trip.totalDistanceMeters === "number" ? trip.totalDistanceMeters / 1000 : null;
  const totalHours = typeof trip.totalDurationSeconds === "number" ? trip.totalDurationSeconds / 3600 : null;
  const numDays = dailyPlan.length;

  // Derive a reasonable upper bound for waypoint day selection.
  let dateDays: number | null = null;
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate as string);
    const end = new Date(trip.endDate as string);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const diffMs = end.getTime() - start.getTime();
      const rawDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      if (rawDays >= 1 && rawDays <= 365) {
        dateDays = rawDays;
      }
    }
  }

  const baseDayHint = Math.max(
    10,
    numDays || 0,
    dateDays ?? 0,
  );

  // Climate band based on start month (northern hemisphere oriented).
  type ClimateBand = "cold" | "mild" | "hot" | null;
  let climateBand: ClimateBand = null;
  if (tripStartMonth != null) {
    if ([11, 12, 1, 2, 3].includes(tripStartMonth)) {
      climateBand = "cold";
    } else if ([6, 7, 8, 9].includes(tripStartMonth)) {
      climateBand = "hot";
    } else {
      climateBand = "mild";
    }
  }

  // Trip length tiers.
  type TripLengthTier = "day" | "weekend" | "tour" | "expedition" | null;
  let lengthTier: TripLengthTier = null;
  if (totalKm != null || numDays > 0 || totalHours != null) {
    const km = totalKm ?? 0;
    if (km < 350 || numDays === 1 || (totalHours != null && totalHours < 6)) {
      lengthTier = "day";
    } else if ((km >= 350 && km <= 1200) || (numDays >= 2 && numDays <= 3)) {
      lengthTier = "weekend";
    } else if ((km > 1200 && km <= 3500) || (numDays >= 4 && numDays <= 10)) {
      lengthTier = "tour";
    } else if (km > 3500 || numDays > 10) {
      lengthTier = "expedition";
    }
  }

  // Daily riding intensity.
  const maxDayHours =
    dailyPlan.length > 0 ? Math.max(...dailyPlan.map((d) => d.durationHours)) : null;

  type Intensity = "easy" | "moderate" | "hard" | null;
  let intensity: Intensity = null;
  if (maxDayHours != null) {
    if (maxDayHours <= 6) {
      intensity = "easy";
    } else if (maxDayHours <= 8) {
      intensity = "moderate";
    } else {
      intensity = "hard";
    }
  }

  if (targetDailyHours != null && targetDailyHours > 8) {
    intensity = "hard";
  }

  // Camping vs lodging mix.
  const campWaypoints = waypoints.filter((wp) => wp.type === "CAMPGROUND");
  const lodgeWaypoints = waypoints.filter((wp) => wp.type === "LODGING");
  const campNights = campWaypoints.length;
  const lodgeNights = lodgeWaypoints.length;
  const totalNights = campNights + lodgeNights;
  const campShare = totalNights > 0 ? campNights / totalNights : 0;

  type NightMix = "mostlyCamping" | "mixed" | "mostlyLodging" | null;
  let nightMix: NightMix = null;
  if (totalNights > 0) {
    if (campShare >= 0.6) {
      nightMix = "mostlyCamping";
    } else if (campShare >= 0.3) {
      nightMix = "mixed";
    } else {
      nightMix = "mostlyLodging";
    }
  }

  // Fuel/remoteness based on longest leg vs range.
  const longestLegKm = fuelPlan?.longestLegKm ?? null;
  const fuelRangeKm = trip.fuelRangeKm ?? null;

  type FuelRiskBand = "comfortable" | "nearReserve" | "beyondRange" | null;
  let fuelBand: FuelRiskBand = null;
  if (longestLegKm != null && fuelRangeKm != null && fuelRangeKm > 0) {
    const comfortableThreshold = 0.7 * fuelRangeKm;
    if (longestLegKm <= comfortableThreshold) {
      fuelBand = "comfortable";
    } else if (longestLegKm <= fuelRangeKm) {
      fuelBand = "nearReserve";
    } else {
      fuelBand = "beyondRange";
    }
  }

  const tripGearHighlights: string[] = [];

  // Length tier driven bullets.
  if (lengthTier === "weekend") {
    tripGearHighlights.push(
      "Compact duffel or small soft panniers with a couple of packing cubes are ideal for a long weekend route like this.",
    );
  } else if (lengthTier === "tour") {
    tripGearHighlights.push(
      "A full soft luggage system (panniers plus tail bag) keeps multi-day ADV gear organized over this tour-length route.",
    );
  } else if (lengthTier === "expedition") {
    tripGearHighlights.push(
      "Expedition-length mileage benefits from maximum-capacity, highly durable luggage that shrugs off repeated packing and drops.",
    );
  }

  // Camping / lodging mix bullets.
  if (nightMix === "mostlyCamping") {
    tripGearHighlights.push(
      "Rackless or soft luggage that is easy to carry to camp, plus separate dry bags for tent and sleep system, suits a camp-heavy plan.",
    );
  } else if (nightMix === "mixed") {
    tripGearHighlights.push(
      "Modular luggage and packing cubes make it simple to grab a small \"hotel bag\" while the rest stays on the bike between camp and lodging nights.",
    );
  } else if (nightMix === "mostlyLodging") {
    tripGearHighlights.push(
      "Smaller duffels and well-organized packing cubes are ideal when most nights end at lodging instead of camp.",
    );
  }

  // Climate bullets.
  if (climateBand === "cold") {
    tripGearHighlights.push(
      "Thermal base layers, liners, and fully waterproof outer shells help cover cold-season starts and high-elevation sections.",
    );
  } else if (climateBand === "hot") {
    tripGearHighlights.push(
      "Well-ventilated mesh or hybrid jackets and pants with good armor, plus space for a hydration system, fit hot-weather ADV travel.",
    );
  } else if (climateBand === "mild") {
    tripGearHighlights.push(
      "Layerable ADV jacket and pant systems let you handle cool mornings and warmer afternoons without overpacking.",
    );
  }

  // Intensity / long-day comfort bullets.
  if (intensity === "hard") {
    tripGearHighlights.push(
      "Comfort-focused base layers and a stable luggage layout help with long days in the saddle and reduce fatigue on this route.",
    );
  }

  // Fuel/remoteness bullets.
  if (fuelBand === "nearReserve") {
    tripGearHighlights.push(
      "Leaving flexible space in your luggage for extra water or fuel on select legs adds safety when some days brush your fuel range.",
    );
  } else if (fuelBand === "beyondRange") {
    tripGearHighlights.push(
      "Auxiliary fuel storage, repair kits, and emergency essentials become more important where segments can exceed your comfortable range.",
    );
  }

  const [showFuelPlaces, setShowFuelPlaces] = useState(false);
  const [showLodgingPlaces, setShowLodgingPlaces] = useState(false);
  const [showCampgroundPlaces, setShowCampgroundPlaces] = useState(false);
  const [showDiningPlaces, setShowDiningPlaces] = useState(false);
  const [showPoiPlaces, setShowPoiPlaces] = useState(false);
  const [enableClickToAdd, setEnableClickToAdd] = useState(false);
  const [minPlaceRating, setMinPlaceRating] = useState<string>("any");
  const [onlyOpenNow, setOnlyOpenNow] = useState(false);

  const [fuelPanelOpen, setFuelPanelOpen] = useState(false);
  const [schedulePanelOpen, setSchedulePanelOpen] = useState(false);
  const [segmentPanelOpen, setSegmentPanelOpen] = useState(false);
  const [checklistPanelOpen, setChecklistPanelOpen] = useState(false);

  // Unsaved changes warning modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const mapWaypoints: WaypointPosition[] = waypoints.map((wp) => ({
    lat: wp.lat,
    lng: wp.lng,
    type: wp.type ?? undefined,
  }));

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const key = "wm-click-to-add-hint-dismissed";
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        setShowClickToAddHint(true);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  // Browser beforeunload warning when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        // Most modern browsers ignore custom messages, but we still need to set returnValue
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Intercept internal link clicks when dirty
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;

      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Only intercept internal navigation (same origin, not external links)
      const isInternal =
        href.startsWith("/") ||
        href.startsWith(window.location.origin);
      const isNewTab =
        anchor.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey;

      if (isInternal && !isNewTab) {
        e.preventDefault();
        setPendingNavigation(href);
        setShowLeaveModal(true);
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Handle confirmed navigation
  const handleConfirmLeave = useCallback(() => {
    if (pendingNavigation) {
      // Temporarily clear dirty state to allow navigation
      setIsDirty(false);
      setShowLeaveModal(false);
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, router]);

  const handleCancelLeave = useCallback(() => {
    setShowLeaveModal(false);
    setPendingNavigation(null);
  }, []);

  // Save waypoints handler for the banner button
  const handleSaveWaypoints = useCallback(async () => {
    // This triggers the same save flow as WaypointEditor
    // We'll call the API directly here for the inline save button
    try {
      const withEffectiveDay: WaypointDto[] = [];
      let currentDay = 1;
      for (let i = 0; i < waypoints.length; i++) {
        const raw = waypoints[i].dayIndex;
        if (typeof raw === "number" && raw >= 1) {
          currentDay = raw;
        }
        withEffectiveDay.push({ ...waypoints[i], dayIndex: currentDay });
      }

      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waypoints: withEffectiveDay.map((wp) => ({
            id: wp.id,
            lat: wp.lat,
            lng: wp.lng,
            name: wp.name ?? undefined,
            type: wp.type ?? undefined,
            notes: wp.notes ?? undefined,
            dayIndex: wp.dayIndex ?? undefined,
            googlePlaceId: wp.googlePlaceId ?? undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save waypoints");
      }

      // Recalculate route
      await fetch("/api/routes/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id }),
      });

      // Recalculate elevation
      await fetch("/api/routes/elevation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id }),
      });

      setIsDirty(false);
      setElevationRefreshKey((k) => k + 1);
      router.refresh();
    } catch (err) {
      console.error("Failed to save waypoints:", err);
    }
  }, [waypoints, trip.id, router]);

  return (
    <>
      {/* Leave page confirmation modal */}
      {showLeaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
        >
          <div className="mx-4 max-w-md rounded-lg border border-amber-500/50 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 flex-shrink-0 text-amber-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h2 id="leave-modal-title" className="text-lg font-semibold text-amber-200">
                  {t("leavePageTitle")}
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  {t("leavePageMessage")}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                {t("leavePage")}
              </button>
              <button
                type="button"
                onClick={handleCancelLeave}
                className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
              >
                {t("stayOnPage")}
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="max-w-5xl">
        <h1 className="text-2xl font-bold">{trip.name}</h1>
        {trip.description && (
          <p className="mt-2 text-sm text-slate-300">{trip.description}</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          {t("tripId")}: <span className="font-mono">{trip.id}</span>
        </p>

        <div className="mt-2 flex flex-wrap items-end gap-3 text-xs text-slate-300">
          <div className="flex flex-col">
            <label htmlFor="trip-start-date" className="text-[11px] text-slate-400">
              {t("plannedStartDate")}
            </label>
            <input
              id="trip-start-date"
              type="date"
              className="mt-1 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[11px]"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="trip-end-date" className="text-[11px] text-slate-400">
              {t("plannedEndDate")}
            </label>
            <input
              id="trip-end-date"
              type="date"
              className="mt-1 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[11px]"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={datesSaving}
            onClick={async () => {
              setDatesStatus(null);
              setDatesSaving(true);
              try {
                const res = await fetch(`/api/trips/${trip.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    startDate: startDateInput || null,
                    endDate: endDateInput || null,
                  }),
                });

                if (!res.ok) {
                  const data = await res.json().catch(() => null);
                  throw new Error(data?.error ?? t("failedToSaveDates"));
                }

                setDatesStatus(t("datesSaved"));
                router.refresh();
              } catch (err: any) {
                setDatesStatus(err.message ?? t("failedToSaveDates"));
              } finally {
                setDatesSaving(false);
              }
            }}
            className="ml-auto rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
          >
            {datesSaving ? t("savingDates") : t("saveDates")}
          </button>
        </div>
        <div className="mt-1" aria-live="polite" role="status">
          {datesStatus && (
            <p className="text-[11px] text-slate-300">{datesStatus}</p>
          )}
        </div>
      </header>

      <section className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)]">
        {/* Left column: map, elevation, daily plan */}
        <div className="space-y-3">
          {waypoints.length === 0 && (
            <div className="rounded border border-adv-border bg-slate-900/80 p-2 text-[11px] text-slate-200 shadow-adv-glow">
              <p className="font-semibold text-slate-100">{t("startPlanning")}</p>
              <p className="mt-1 text-slate-300">
                {t("startPlanningHint")}
              </p>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold">{t("mapTitle")}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {t("mapDescription")}
              <span className="ml-1 font-semibold text-amber-300">
                {t("mapClickHint")}
              </span>
              {" "}
              {t("mapSearchHint")}
            </p>
            {showClickToAddHint && (
              <div className="mt-2 flex items-start justify-between gap-2 rounded border border-amber-400/70 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100">
                <p className="pr-2">
                  {t("clickToAddTip")}
                  <span className="mx-1 font-semibold">{t("clickToAddLabel")}</span>
                  {t("clickToAddTipEnd")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowClickToAddHint(false);
                    try {
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem("wm-click-to-add-hint-dismissed", "1");
                      }
                    } catch {
                      // ignore localStorage errors
                    }
                  }}
                  className="ml-auto rounded border border-amber-400/60 px-1 text-[9px] leading-none text-amber-200 hover:bg-amber-500/20"
                >
                  {t("dismiss")}
                </button>
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" />
                <span>{t("fuel")}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#60a5fa]" />
                <span>{t("lodging")}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#14b8a6]" />
                <span>{t("campground")}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#fb7185]" />
                <span>{t("dining")}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#eab308]" />
                <span>{t("poi")}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={showFuelPlaces}
                    onChange={(e) => setShowFuelPlaces(e.target.checked)}
                  />
                  <span>{t("nearbyFuel")}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={showLodgingPlaces}
                    onChange={(e) => setShowLodgingPlaces(e.target.checked)}
                  />
                  <span>{t("nearbyLodging")}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={showCampgroundPlaces}
                    onChange={(e) => setShowCampgroundPlaces(e.target.checked)}
                  />
                  <span>{t("nearbyCampgrounds")}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={showDiningPlaces}
                    onChange={(e) => setShowDiningPlaces(e.target.checked)}
                  />
                  <span>{t("nearbyDining")}</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={showPoiPlaces}
                    onChange={(e) => setShowPoiPlaces(e.target.checked)}
                  />
                  <span>{t("nearbyPois")}</span>
                </label>
                <label className="flex items-center gap-1 rounded-full border border-amber-400/70 bg-amber-500/10 px-2 py-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={enableClickToAdd}
                    onChange={(e) => setEnableClickToAdd(e.target.checked)}
                  />
                  <span className="font-semibold text-amber-300">{t("addWaypointsByClick")}</span>
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-slate-500">{t("minRating")}</span>
                  <select
                    className="rounded border border-slate-600 bg-slate-950 px-1 py-0.5 text-[11px]"
                    value={minPlaceRating}
                    onChange={(e) => setMinPlaceRating(e.target.value)}
                  >
                    <option value="any">{t("any")}</option>
                    <option value="3.5">3.5+</option>
                    <option value="4.0">4.0+</option>
                    <option value="4.5">4.5+</option>
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={onlyOpenNow}
                    onChange={(e) => setOnlyOpenNow(e.target.checked)}
                  />
                  <span>{t("openNowOnly")}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded border border-adv-border bg-slate-950/70 shadow-adv-glow">
            <TripPlannerMap
              waypoints={mapWaypoints}
              routePath={isDirty ? undefined : routePath}
              enableClickToAdd={enableClickToAdd}
              showFuelPlaces={showFuelPlaces}
              showLodgingPlaces={showLodgingPlaces}
              showCampgroundPlaces={showCampgroundPlaces}
              showDiningPlaces={showDiningPlaces}
              showPoiPlaces={showPoiPlaces}
              minPlaceRating={minPlaceRating === "any" ? null : Number(minPlaceRating)}
              onlyOpenNow={onlyOpenNow}
              onAddWaypoint={(wp) => {
                setWaypoints((prev) => {
                  const last = prev[prev.length - 1];
                  const lastDay =
                    typeof last?.dayIndex === "number" && last.dayIndex >= 1 ? last.dayIndex : 1;
                  return [
                    ...prev,
                    {
                      lat: wp.lat,
                      lng: wp.lng,
                      name: (wp as any).name ?? null,
                      type: (wp.type as string | undefined) ?? "CHECKPOINT",
                      notes: null,
                      dayIndex: prev.length === 0 ? 1 : lastDay,
                      googlePlaceId: (wp as any).googlePlaceId ?? null,
                    },
                  ];
                });
                setIsDirty(true);
              }}
              onMarkerClick={(index) => {
                setWaypoints((prev) => prev.filter((_, i) => i !== index));
                setIsDirty(true);
              }}
            />
          </div>

          {isDirty && (
            <div className="flex items-center justify-between gap-3 rounded border-2 border-amber-500 bg-amber-500/20 p-3 text-amber-100 animate-pulse">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 flex-shrink-0 text-amber-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-[12px] font-medium">
                  {t("unsavedWarningBanner")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveWaypoints}
                className="whitespace-nowrap rounded bg-amber-500 px-4 py-1.5 text-[12px] font-bold text-black shadow-lg hover:bg-amber-400 transition-colors"
              >
                {t("saveAndRecalculate")}
              </button>
            </div>
          )}

          <ElevationProfile
            tripId={trip.id}
            refreshKey={elevationRefreshKey}
          />

          <div className="flex items-center justify-between text-xs text-slate-300">
            <div>
              <p>
                {t("totalDistance")}: {trip.totalDistanceMeters != null
                  ? `${(trip.totalDistanceMeters / 1000).toFixed(1)} km`
                  : "--"}
              </p>
              <p>
                {t("totalDuration")}: {trip.totalDurationSeconds != null
                  ? `${(trip.totalDurationSeconds / 3600).toFixed(1)} h`
                  : "--"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <RecalculateRouteButton
                tripId={trip.id}
                onRouteRecalculated={() => setElevationRefreshKey((k) => k + 1)}
              />
              <a
                href={`/api/trips/${trip.id}/gpx`}
                className="rounded border border-adv-border px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900"
              >
                {t("exportGpx")}
              </a>
              <DeleteTripButton tripId={trip.id} />
            </div>
          </div>

          {sponsorDemoEnabled && (
            <section
              className="mt-2 space-y-1 rounded border border-amber-500/60 bg-amber-500/5 p-2 text-[11px] text-slate-100"
              aria-label="Featured ADV gear sponsor demo"
            >
              <p className="flex items-center justify-between gap-2">
                <span className="font-semibold text-amber-200">Featured ADV gear for this trip (Mosko Moto demo)</span>
                <span className="rounded border border-amber-400/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                  Demo only
                </span>
              </p>
              <p className="text-[11px] text-amber-100/90">
                Show how gear partners can appear where riders are reviewing distance, duration, and exporting GPX files for
                navigation.
              </p>
              <p className="mt-1 text-[11px] text-amber-100">
                Example:
                <span className="ml-1 font-semibold">waterproof soft panniers and duffels</span> sized for multi-day ADV
                routes like this one.
              </p>
              <p className="mt-1">
                <a
                  href="https://moskomoto.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold text-amber-300 underline hover:text-amber-200"
                >
                  Visit Mosko Moto (example sponsor link)
                </a>
              </p>
            </section>
          )}

          {dailyPlan.length > 0 && (
            <section className="space-y-2 rounded border border-adv-border bg-slate-900/70 p-3 text-xs text-slate-200 shadow-adv-glow" aria-label="Daily distance and duration plan by day">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-100 text-xs md:text-sm">{t("dailyPlan")}</h2>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {dailyPlan.map((day) => {
                  const isHeavy = day.distanceKm > 600 || day.durationHours > 10;
                  return (
                    <div
                      key={day.day}
                      className={`flex items-center justify-between rounded px-2 py-1 text-[11px] ${
                        isHeavy
                          ? "border border-amber-500/70 bg-amber-500/10"
                          : "border border-slate-700 bg-slate-950/60"
                      }`}
                    >
                      <span className="text-slate-300">{t("day")} {day.day}</span>
                      <span className="text-slate-400">
                        {day.distanceKm.toFixed(0)} km · {day.durationHours.toFixed(1)} h
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right column: sharing, accordions, waypoint editor */}
        <div className="space-y-3">
          {/* Sharing panel */}
          <section className="space-y-2 rounded border border-adv-border bg-slate-900/70 p-3 text-xs text-slate-200 shadow-adv-glow" aria-label="Trip sharing settings">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold text-slate-100 text-xs md:text-sm">{t("sharing")}</h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={shareEnabled}
                    onChange={async (e) => {
                      const enabled = e.target.checked;
                      setShareSaving(true);
                      setShareStatus(null);
                      try {
                        const res = await fetch(`/api/trips/${trip.id}/share`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ enabled }),
                        });

                        if (!res.ok) {
                          const data = await res.json().catch(() => null);
                          throw new Error(data?.error ?? "Failed to update sharing");
                        }

                        const data = await res.json();
                        setShareEnabled(Boolean(data.isPublic && data.shareToken));
                        setShareToken(data.shareToken ?? null);
                        setShareStatus(
                          data.isPublic ? t("sharingEnabledStatus") : t("sharingDisabledStatus"),
                        );
                      } catch (err: any) {
                        setShareStatus(err.message ?? t("failedToUpdateSharing"));
                      } finally {
                        setShareSaving(false);
                      }
                    }}
                  />
                  <span>{shareEnabled ? t("sharingEnabled") : t("sharingDisabled")}</span>
                </label>
                {shareEnabled && shareToken && (
                  <button
                    type="button"
                    disabled={shareSaving}
                    onClick={async () => {
                      try {
                        const origin = window.location.origin;
                        const url = `${origin}/share/${shareToken}`;
                        await navigator.clipboard.writeText(url);
                        setShareStatus(t("linkCopied"));
                      } catch {
                        setShareStatus(t("copyFailed"));
                      }
                    }}
                    className="rounded border border-adv-border px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-900"
                  >
                    {t("copyLink")}
                  </button>
                )}
              </div>
            </div>
            {shareEnabled && shareToken && (
              <div className="mt-1">
                <p className="text-[11px] text-slate-400">{t("shareUrl")}</p>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    readOnly
                    className="flex-1 truncate rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300"
                    value={`/share/${shareToken}`}
                  />
                </div>
              </div>
            )}
            <div aria-live="polite" role="status">
              {shareStatus && (
                <p className="mt-1 text-[11px] text-slate-300">{shareStatus}</p>
              )}
            </div>
          </section>

          {/* Waypoint editor */}
          <WaypointEditor
            tripId={trip.id}
            waypoints={waypoints}
            onWaypointsChange={(next) => {
              setWaypoints(next);
              setIsDirty(true);
            }}
            onSaveSuccess={() => {
              setIsDirty(false);
              setElevationRefreshKey((k) => k + 1);
            }}
            maxDayHint={baseDayHint}
            startDateLabelBase={startDateInput || null}
          />

          <h2 className="font-semibold text-slate-100 text-xs md:text-sm">{t("planningTools")}</h2>

          {/* AI daily plan suggestion */}
          <section className="space-y-2 rounded border border-adv-border bg-slate-900/70 p-3 text-xs text-slate-200 shadow-adv-glow" aria-label="AI-generated daily riding plan">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-100 text-xs md:text-sm">{t("aiDailyPlan")}</h2>
              <div className="flex items-center gap-2">
                {aiPlanText && (
                  <button
                    type="button"
                    disabled={aiPlanClearing}
                    onClick={async () => {
                      setAiPlanClearing(true);
                      setAiPlanError(null);
                      try {
                        const res = await fetch(`/api/ai/daily-plan?tripId=${trip.id}`, {
                          method: "DELETE",
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => null);
                          throw new Error(data?.error ?? t("failedToClearPlan"));
                        }
                        setAiPlanText(null);
                        setAiPlanGeneratedAt(null);
                      } catch (err: any) {
                        setAiPlanError(err?.message ?? t("failedToClearPlan"));
                      } finally {
                        setAiPlanClearing(false);
                      }
                    }}
                    className="rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    {aiPlanClearing ? t("clearing") : t("clearPlan")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={aiPlanLoading || waypoints.length < 2}
                  onClick={async () => {
                    setAiPlanError(null);
                    setAiPlanLoading(true);
                    try {
                      const res = await fetch(`/api/ai/daily-plan`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tripId: trip.id, locale }),
                      });

                      if (!res.ok) {
                        const data = await res.json().catch(() => null);
                        throw new Error(data?.error ?? t("failedToGeneratePlan"));
                      }

                      const data = await res.json();
                      setAiPlanText(typeof data.text === "string" ? data.text : "");
                      if (data.generatedAt) {
                        setAiPlanGeneratedAt(new Date(data.generatedAt).toLocaleString());
                      }
                    } catch (err: any) {
                      setAiPlanError(err?.message ?? t("failedToGeneratePlan"));
                    } finally {
                      setAiPlanLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
                >
                  {aiPlanLoading && (
                    <svg
                      className="h-3 w-3 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {aiPlanLoading
                    ? t("thinking")
                    : waypoints.length < 2
                    ? t("addMoreWaypoints")
                    : aiPlanText
                    ? t("regeneratePlan")
                    : t("suggestDailyPlan")}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              {t("aiPlanDescription")}
            </p>
            {aiPlanGeneratedAt && (
              <p className="text-[10px] text-slate-500">
                {t("generatedOn")} {aiPlanGeneratedAt}
              </p>
            )}
            <div aria-live="polite" role="status">
              {aiPlanError && (
                <p className="text-[11px] text-red-400">{aiPlanError}</p>
              )}
            </div>
            {aiPlanLoading && (
              <div className="space-y-3 rounded border border-slate-700 bg-slate-950/70 p-3" aria-label="Loading AI plan">
                {/* Skeleton header */}
                <div className="h-5 w-48 animate-pulse rounded bg-slate-700" />
                {/* Skeleton paragraph lines */}
                <div className="space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-slate-700/70" />
                  <div className="h-3 w-11/12 animate-pulse rounded bg-slate-700/70" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-slate-700/70" />
                </div>
                {/* Skeleton day header */}
                <div className="h-4 w-40 animate-pulse rounded bg-slate-700 mt-4" />
                {/* Skeleton bullet points */}
                <div className="space-y-2 pl-4">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-700/70" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-700/70" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-slate-700/70" />
                </div>
                {/* Skeleton day header 2 */}
                <div className="h-4 w-44 animate-pulse rounded bg-slate-700 mt-4" />
                {/* More skeleton lines */}
                <div className="space-y-2 pl-4">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-700/70" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-700/70" />
                </div>
              </div>
            )}
            {aiPlanText && !aiPlanLoading && (
              <div className="max-h-96 overflow-y-auto rounded border border-slate-700 bg-slate-950/70 p-3 text-slate-200 prose prose-invert prose-sm prose-headings:text-slate-100 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-slate-100 prose-em:text-amber-200 max-w-none">
                <ReactMarkdown>{aiPlanText}</ReactMarkdown>
              </div>
            )}
          </section>

          {/* Motorcycle section */}
          <section className="rounded border border-adv-border bg-slate-900/70 p-3 text-xs text-slate-200 shadow-adv-glow" aria-label="Motorcycle for this trip">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-100 text-xs md:text-sm">{t("motorcycleForTrip")}</h2>
              {trip.motorcycle?.displayName && (
                <span className="text-[11px] text-slate-400">{trip.motorcycle.displayName}</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">{t("selectFromGarage")}</span>
                <select
                  className="min-w-[180px] rounded border border-slate-600 bg-slate-950 p-1 text-[11px] text-slate-200"
                  value={selectedMotorcycleId}
                  onChange={async (e) => {
                    const nextId = e.target.value;
                    setSelectedMotorcycleId(nextId);
                    setBikeStatus(null);
                    setBikeSaving(true);
                    try {
                      const payload: any = {
                        motorcycleId: nextId || null,
                      };
                      if (nextId) {
                        payload.fuelAutoFromMotorcycle = true;
                      }
                      const res = await fetch(`/api/trips/${trip.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });

                      if (!res.ok) {
                        const data = await res.json().catch(() => null);
                        throw new Error(data?.error ?? "Failed to update motorcycle");
                      }

                      setBikeStatus(
                        nextId
                          ? t("motorcycleAttached")
                          : t("motorcycleDetached"),
                      );
                      router.refresh();
                    } catch (err: any) {
                      setBikeStatus(err?.message ?? t("failedToUpdateMotorcycle"));
                    } finally {
                      setBikeSaving(false);
                    }
                  }}
                >
                <option value="">{t("noMotorcycleSelected")}</option>
                  {motorcycles.map((moto: any) => {
                    const baseLabel =
                      moto.displayName ||
                      `${moto.year ?? ""} ${moto.make ?? ""} ${moto.model ?? ""}`.trim() ||
                      "Motorcycle";
                    const suffix = moto.isDefaultForNewTrips ? ` ${t("defaultForNewTrips")}` : "";
                    return (
                      <option key={moto.id} value={moto.id}>
                        {baseLabel}
                        {suffix}
                      </option>
                    );
                  })}
                </select>
              </div>
              <a
                href="/motorcycles"
                className="text-[11px] text-adv-accent hover:text-adv-accentMuted underline-offset-2 hover:underline"
              >
                {t("manageInGarage")}
              </a>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              {t("aiSpecsHint")}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">{t("year")}</span>
                <input
                  type="number"
                  min={1970}
                  max={2100}
                  className="w-20 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                  value={bikeYearInput}
                  onChange={(e) => setBikeYearInput(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">{t("make")}</span>
                <input
                  type="text"
                  className="w-32 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                  placeholder="Yamaha"
                  value={bikeMakeInput}
                  onChange={(e) => setBikeMakeInput(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">{t("model")}</span>
                <input
                  type="text"
                  className="w-40 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                  placeholder="Tenere 700"
                  value={bikeModelInput}
                  onChange={(e) => setBikeModelInput(e.target.value)}
                />
              </label>
              <div className="flex flex-1 items-end justify-end">
                <button
                  type="button"
                  disabled={bikeSaving}
                  onClick={async () => {
                    setBikeStatus(null);
                    setBikeSaving(true);
                    try {
                      const res = await fetch("/api/ai/motorcycle-specs", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          tripId: trip.id,
                          year: bikeYearInput ? Number(bikeYearInput) : null,
                          make: bikeMakeInput,
                          model: bikeModelInput,
                        }),
                      });

                      if (!res.ok) {
                        const data = await res.json().catch(() => null);
                        throw new Error(data?.error ?? "Failed to fetch motorcycle specs");
                      }

                      setBikeStatus(t("specsUpdated"));
                      router.refresh();
                    } catch (err: any) {
                      setBikeStatus(err?.message ?? t("failedToFetchSpecs"));
                    } finally {
                      setBikeSaving(false);
                    }
                  }}
                  className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
                >
                  {bikeSaving ? t("fetchingSpecs") : t("fetchSpecs")}
                </button>
              </div>
            </div>
            {trip.motorcycle && (
              <div className="mt-3 rounded border border-slate-800 bg-slate-950/70 p-2 text-[11px] text-slate-300">
                <p className="font-semibold text-slate-100">
                  {trip.motorcycle.displayName || `${trip.motorcycle.year ?? ""} ${trip.motorcycle.make ?? ""} ${trip.motorcycle.model ?? ""}`.trim()}
                </p>
                <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {typeof trip.motorcycle.engineDisplacementCc === "number" && (
                    <p>{t("engine")}: {trip.motorcycle.engineDisplacementCc} cc</p>
                  )}
                  {typeof trip.motorcycle.wetWeightKg === "number" && (
                    <p>{t("wetWeight")}: {trip.motorcycle.wetWeightKg} kg</p>
                  )}
                  {typeof trip.motorcycle.fuelCapacityLiters === "number" && (
                    <p>{t("fuelCapacity")}: {trip.motorcycle.fuelCapacityLiters.toFixed(1)} L</p>
                  )}
                  {typeof trip.motorcycle.estimatedRangeKm === "number" && (
                    <p>{t("estimatedRange")}: {trip.motorcycle.estimatedRangeKm} km</p>
                  )}
                  {typeof trip.motorcycle.seatHeightMm === "number" && (
                    <p>{t("seatHeight")}: {trip.motorcycle.seatHeightMm} mm</p>
                  )}
                </div>
                {trip.motorcycle.specs?.notes && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    {t("notes")}: {(trip.motorcycle.specs as any).notes}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-slate-500">
                  {t("specsApproximate")}
                </p>
              </div>
            )}
            <div className="mt-1" aria-live="polite" role="status">
              {bikeStatus && <p className="text-[11px] text-slate-300">{bikeStatus}</p>}
            </div>
          </section>

          {/* Fuel accordion */}
          <section className="rounded border border-adv-border bg-slate-900/70 p-3 text-xs text-slate-200 shadow-adv-glow">
            <button
              type="button"
              id="fuel-settings-header"
              className="flex w-full items-center justify-between text-[11px]"
              onClick={() => setFuelPanelOpen((prev) => !prev)}
              aria-expanded={fuelPanelOpen}
              aria-controls="fuel-settings-panel"
            >
              <span className="font-semibold text-slate-100">{t("fuelSettings")}</span>
              <span className="text-slate-400">{fuelPanelOpen ? "−" : "+"}</span>
            </button>
            {fuelPanelOpen && (
              <div
                id="fuel-settings-panel"
                role="region"
                aria-labelledby="fuel-settings-header"
                className="mt-2 space-y-3"
              >
                <div>
                  <p className="text-[11px] text-slate-400">
                    {t("fuelSettingsDescription")}
                  </p>
                  {trip.motorcycle && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Use <span className="font-semibold">Reset to bike defaults</span> to pull range and reserve from the attached
                      motorcycle&apos;s preferred (or estimated) values.
                    </p>
                  )}
                  {trip.motorcycle && (
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                      <input
                        type="checkbox"
                        className="h-3 w-3 accent-adv-accent"
                        checked={fuelAutoSync}
                        onChange={async (e) => {
                          const next = e.target.checked;
                          setFuelAutoSync(next);
                          try {
                            const res = await fetch(`/api/trips/${trip.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                fuelAutoFromMotorcycle: next,
                              }),
                            });
                            if (!res.ok) {
                              const data = await res.json().catch(() => null);
                              throw new Error(data?.error ?? "Failed to update fuel sync setting");
                            }
                            // If turning sync on and a motorcycle is present, backend may recompute fuel
                            // based on the bike. Refresh to pick up any changes.
                            if (next && trip.motorcycle) {
                              router.refresh();
                            }
                          } catch (err: any) {
                            setFuelAutoSync(!next);
                            setFuelStatus(err?.message ?? "Failed to update fuel sync setting");
                          }
                        }}
                      />
                      <span>
                        Keep this trip&apos;s fuel settings in sync with
                        {" "}
                        <span className="font-semibold">
                          {trip.motorcycle.displayName ?? "selected motorcycle"}
                        </span>
                        {" "}
                        when possible.
                      </span>
                    </label>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">{t("rangeKm")}</span>
                      <input
                        type="number"
                        min={0}
                        className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                        value={fuelRangeInput}
                        onChange={(e) => setFuelRangeInput(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">{t("reserveKm")}</span>
                      <input
                        type="number"
                        min={0}
                        className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                        value={fuelReserveInput}
                        onChange={(e) => setFuelReserveInput(e.target.value)}
                      />
                    </label>
                    <div className="flex flex-1 items-end justify-end gap-2">
                      <button
                        type="button"
                        disabled={fuelSaving || !trip.motorcycle}
                        onClick={async () => {
                          if (!trip.motorcycle) return;
                          setFuelStatus(null);
                          setFuelSaving(true);
                          try {
                            const res = await fetch(`/api/trips/${trip.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                resetFuelFromMotorcycle: true,
                              }),
                            });

                            if (!res.ok) {
                              const data = await res.json().catch(() => null);
                              throw new Error(data?.error ?? "Failed to reset fuel from motorcycle");
                            }

                            const data = await res.json().catch(() => null);
                            if (data?.fuelRangeKm != null) {
                              setFuelRangeInput(String(data.fuelRangeKm));
                            }
                            if (data?.fuelReserveKm != null) {
                              setFuelReserveInput(String(data.fuelReserveKm));
                            } else {
                              setFuelReserveInput("");
                            }
                            setFuelAutoSync(true);
                            setFuelStatus(t("fuelResetFromMotorcycle"));
                            router.refresh();
                          } catch (err: any) {
                            setFuelStatus(err.message ?? t("failedToResetFuel"));
                          } finally {
                            setFuelSaving(false);
                          }
                        }}
                        className="rounded border border-slate-500 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                      >
                        {t("resetToDefaults")}
                      </button>
                      <button
                        type="button"
                        disabled={fuelSaving}
                        onClick={async () => {
                          setFuelStatus(null);
                          setFuelSaving(true);
                          try {
                            const rangeVal =
                              fuelRangeInput.trim() === "" ? null : Number(fuelRangeInput);
                            const reserveVal =
                              fuelReserveInput.trim() === "" ? null : Number(fuelReserveInput);

                            const res = await fetch(`/api/trips/${trip.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                fuelRangeKm:
                                  typeof rangeVal === "number" && Number.isFinite(rangeVal)
                                    ? Math.round(rangeVal)
                                    : null,
                                fuelReserveKm:
                                  typeof reserveVal === "number" && Number.isFinite(reserveVal)
                                    ? Math.round(reserveVal)
                                    : null,
                              }),
                            });

                            if (!res.ok) {
                              const data = await res.json().catch(() => null);
                              throw new Error(data?.error ?? "Failed to save fuel settings");
                            }

                            setFuelStatus(t("fuelSettingsSaved"));
                            router.refresh();
                          } catch (err: any) {
                            setFuelStatus(err.message ?? t("failedToSaveFuel"));
                          } finally {
                            setFuelSaving(false);
                          }
                        }}
                        className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
                      >
                        {fuelSaving ? t("savingFuel") : t("saveFuelSettings")}
                      </button>
                    </div>
                  </div>
                  <div aria-live="polite" role="status">
                    {fuelStatus && (
                      <p className="mt-1 text-[11px] text-slate-300">{fuelStatus}</p>
                    )}
                  </div>
                </div>

                {fuelPlan && fuelPlan.legs.length > 0 && (
                  <section className="space-y-2 rounded border border-slate-800 bg-slate-950/70 p-2" aria-label="Fuel legs between fuel waypoints">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-100 text-xs md:text-sm">{t("fuelPlan")}</h3>
                      <p className="text-[11px] text-slate-400">
                        {t("range")}: {trip.fuelRangeKm ? `${trip.fuelRangeKm} km` : t("notSet")}
                        {trip.fuelReserveKm ? ` · ${t("reserve")}: ${trip.fuelReserveKm} km` : ""}
                      </p>
                    </div>
                    {fuelPlan.longestLegKm != null && (
                      <p className="text-[11px] text-slate-300">
                        {t("longestFuelLeg")}: {fuelPlan.longestLegKm.toFixed(0)} km
                      </p>
                    )}
                    {trip.motorcycle && (
                      <p className="text-[11px] text-slate-400">
                        Fuel range for this trip: {trip.fuelRangeKm != null ? `${trip.fuelRangeKm} km` : "not set"}
                        {" "}
                        {trip.motorcycle.preferredRangeKm != null &&
                          trip.fuelRangeKm === trip.motorcycle.preferredRangeKm && (
                            <span className="ml-1 text-emerald-300">
                              (using preferred range from {trip.motorcycle.displayName ?? "motorcycle"})
                            </span>
                          )}
                        {trip.motorcycle.preferredRangeKm == null &&
                          trip.motorcycle.estimatedRangeKm != null &&
                          trip.fuelRangeKm === trip.motorcycle.estimatedRangeKm && (
                            <span className="ml-1 text-emerald-300">
                              (based on estimated range from {trip.motorcycle.displayName ?? "motorcycle"})
                            </span>
                          )}
                      </p>
                    )}
                    <div className="space-y-1">
                      {fuelPlan.legs.map((leg) => (
                        <div
                          key={leg.label}
                          className="flex items-center justify-between text-[11px]"
                        >
                          <span className="text-slate-300">{leg.label}</span>
                          <span
                            className={
                              leg.risk === "high"
                                ? "text-red-400"
                                : leg.risk === "medium"
                                ? "text-amber-300"
                                : "text-slate-300"
                            }
                          >
                            {leg.distanceKm.toFixed(0)} km
                            {leg.risk === "high"
                              ? ` ${t("beyondRange")}`
                              : leg.risk === "medium"
                              ? ` ${t("beyondReserve")}`
                              : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </section>

          {/* Schedule accordion */}
          <section className="rounded border border-adv-border bg-slate-900/70 p-3 text-xs text-slate-200 shadow-adv-glow">
            <button
              type="button"
              id="schedule-settings-header"
              className="flex w-full items-center justify-between text-[11px]"
              onClick={() => setSchedulePanelOpen((prev) => !prev)}
              aria-expanded={schedulePanelOpen}
              aria-controls="schedule-settings-panel"
            >
              <span className="font-semibold text-slate-100">{t("scheduleSettings")}</span>
              <span className="text-slate-400">{schedulePanelOpen ? "−" : "+"}</span>
            </button>
            {schedulePanelOpen && (
              <div
                id="schedule-settings-panel"
                role="region"
                aria-labelledby="schedule-settings-header"
                className="mt-2 space-y-3"
              >
                <div>
                  <p className="text-[11px] text-slate-400">
                    {t("scheduleDescription")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">{t("targetRidingTime")}</span>
                      <input
                        type="number"
                        min={0}
                        className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                        value={scheduleDailyHoursInput}
                        onChange={(e) => setScheduleDailyHoursInput(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">{t("earliestDeparture")}</span>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                        value={scheduleEarliestInput}
                        onChange={(e) => setScheduleEarliestInput(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">{t("latestArrival")}</span>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                        value={scheduleLatestInput}
                        onChange={(e) => setScheduleLatestInput(e.target.value)}
                      />
                    </label>
                    <div className="flex flex-1 items-end justify-end">
                      <button
                        type="button"
                        disabled={scheduleSaving}
                        onClick={async () => {
                          setScheduleStatus(null);
                          setScheduleSaving(true);
                          try {
                            const dailyVal =
                              scheduleDailyHoursInput.trim() === ""
                                ? null
                                : Number(scheduleDailyHoursInput);
                            const earliestVal =
                              scheduleEarliestInput.trim() === ""
                                ? null
                                : Number(scheduleEarliestInput);
                            const latestVal =
                              scheduleLatestInput.trim() === ""
                                ? null
                                : Number(scheduleLatestInput);

                            const res = await fetch(`/api/trips/${trip.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                plannedDailyRideHours:
                                  typeof dailyVal === "number" && Number.isFinite(dailyVal)
                                    ? Math.round(dailyVal)
                                    : null,
                                earliestDepartureHour:
                                  typeof earliestVal === "number" && Number.isFinite(earliestVal)
                                    ? Math.round(earliestVal)
                                    : null,
                                latestArrivalHour:
                                  typeof latestVal === "number" && Number.isFinite(latestVal)
                                    ? Math.round(latestVal)
                                    : null,
                              }),
                            });

                            if (!res.ok) {
                              const data = await res.json().catch(() => null);
                              throw new Error(data?.error ?? "Failed to save schedule settings");
                            }

                            setScheduleStatus(t("scheduleSettingsSaved"));
                            router.refresh();
                          } catch (err: any) {
                            setScheduleStatus(err.message ?? t("failedToSaveSchedule"));
                          } finally {
                            setScheduleSaving(false);
                          }
                        }}
                        className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
                      >
                        {scheduleSaving ? t("savingSchedule") : t("saveScheduleSettings")}
                      </button>
                    </div>
                  </div>
                  <div aria-live="polite" role="status">
                    {scheduleStatus && (
                      <p className="mt-1 text-[11px] text-slate-300">{scheduleStatus}</p>
                    )}
                  </div>
                </div>

                {dailyPlan.length > 0 && (
                  <section className="space-y-2 rounded border border-slate-800 bg-slate-950/70 p-2" aria-label="Planned riding schedule by day">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-100 text-xs md:text-sm">{t("dailySchedule")}</h3>
                    </div>
                    <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                      {dailyPlan.map((day) => {
                        const ride = day.durationHours;
                        const depart = earliestHour;
                        const arrive = depart + ride;
                        const isLate = latestHour != null && arrive > latestHour;
                        const overTarget =
                          targetDailyHours != null && ride > targetDailyHours;
                        const heavy = isLate || overTarget;
                        return (
                          <div
                            key={day.day}
                            className={`flex items-center justify-between rounded px-2 py-1 text-[11px] ${
                              heavy
                                ? "border border-amber-500/70 bg-amber-500/10"
                                : "border border-slate-700 bg-slate-950/60"
                            }`}
                          >
                            <span className="text-slate-300">{t("day")} {day.day}</span>
                            <span className="text-slate-400">
                              {formatTime(depart)} → {formatTime(arrive)} ({ride.toFixed(1)} h)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}
          </section>

          {/* Segment risk & notes accordion */}
          {waypoints.length > 1 && (
            <section className="rounded border border-adv-border bg-slate-900/70 p-3 text-xs text-slate-200 shadow-adv-glow">
              <button
                type="button"
                id="segment-notes-header"
                className="flex w-full items-center justify-between text-[11px]"
                onClick={() => setSegmentPanelOpen((prev) => !prev)}
                aria-expanded={segmentPanelOpen}
                aria-controls="segment-notes-panel"
              >
                <span className="font-semibold text-slate-100">{t("segmentRiskNotes")}</span>
                <span className="text-slate-400">{segmentPanelOpen ? "−" : "+"}</span>
              </button>
              {segmentPanelOpen && (
                <div
                  id="segment-notes-panel"
                  role="region"
                  aria-labelledby="segment-notes-header"
                  className="mt-2 space-y-2"
                >
                  <p className="text-[11px] text-slate-400">
                    {t("segmentDescription")}
                  </p>
                  <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                    {waypoints.slice(0, -1).map((wp, index) => {
                      const next = waypoints[index + 1];
                      const approxKm = haversineKm(
                        { lat: wp.lat, lng: wp.lng },
                        { lat: next.lat, lng: next.lng },
                      );
                      const existing = segmentNotes.find((s) => s.index === index) ?? {
                        index,
                        risk: null as SegmentRiskLevel,
                        note: "",
                      };
                      const labelFrom = wp.name || `#${index + 1}`;
                      const labelTo = next.name || `#${index + 2}`;
                      return (
                        <div
                          key={index}
                          className="rounded border border-slate-700 bg-slate-950/60 p-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-300">
                              {labelFrom} → {labelTo}
                            </span>
                            <span className="text-slate-500">~{approxKm.toFixed(0)} km</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                            <select
                              className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[11px]"
                              value={existing.risk ?? ""}
                              onChange={(e) => {
                                const value = e.target.value as SegmentRiskLevel | "";
                                setSegmentNotes((prev) => {
                                  const without = prev.filter((s) => s.index !== index);
                                  const nextRisk = value === "" ? null : (value as SegmentRiskLevel);
                                  if (!nextRisk && !existing.note) {
                                    return without;
                                  }
                                  return [
                                    ...without,
                                    { index, risk: nextRisk, note: existing.note },
                                  ];
                                });
                              }}
                            >
                              <option value="">{t("riskNone")}</option>
                              <option value="low">{t("riskLow")}</option>
                              <option value="medium">{t("riskMedium")}</option>
                              <option value="high">{t("riskHigh")}</option>
                              <option value="extreme">{t("riskExtreme")}</option>
                            </select>
                            <input
                              type="text"
                              className="min-w-[160px] flex-1 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                              placeholder={t("notesPlaceholder")}
                              value={existing.note}
                              onChange={(e) => {
                                const value = e.target.value;
                                setSegmentNotes((prev) => {
                                  const without = prev.filter((s) => s.index !== index);
                                  const nextNote = value;
                                  if (!nextNote && !existing.risk) {
                                    return without;
                                  }
                                  return [
                                    ...without,
                                    { index, risk: existing.risk, note: nextNote },
                                  ];
                                });
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={segmentNotesSaving}
                      onClick={async () => {
                        setSegmentNotesStatus(null);
                        setSegmentNotesSaving(true);
                        try {
                          const payload = segmentNotes
                            .filter((s) => s.risk || s.note.trim() !== "")
                            .map((s) => ({ index: s.index, risk: s.risk, note: s.note.trim() }));

                          const res = await fetch(`/api/trips/${trip.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ segmentNotes: payload }),
                          });

                          if (!res.ok) {
                            const data = await res.json().catch(() => null);
                            throw new Error(data?.error ?? "Failed to save segment notes");
                          }

                          setSegmentNotesStatus(t("segmentNotesSaved"));
                        } catch (err: any) {
                          setSegmentNotesStatus(err.message ?? t("failedToSaveSegmentNotes"));
                        } finally {
                          setSegmentNotesSaving(false);
                        }
                      }}
                      className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
                    >
                      {segmentNotesSaving ? t("savingSegmentNotes") : t("saveSegmentNotes")}
                    </button>
                    <div aria-live="polite" role="status">
                      {segmentNotesStatus && (
                        <p className="text-[11px] text-slate-300">{segmentNotesStatus}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Checklist accordion */}
          <section className="rounded border border-adv-border bg-slate-900/70 p-3 text-xs text-slate-200 shadow-adv-glow">
            <button
              type="button"
              id="checklist-header"
              className="flex w-full items-center justify-between text-[11px]"
              onClick={() => setChecklistPanelOpen((prev) => !prev)}
              aria-expanded={checklistPanelOpen}
              aria-controls="checklist-panel"
            >
              <span className="font-semibold text-slate-100">{t("preRideChecklist")}</span>
              <span className="text-slate-400">{checklistPanelOpen ? "−" : "+"}</span>
            </button>
            {checklistPanelOpen && (
              <div
                id="checklist-panel"
                role="region"
                aria-labelledby="checklist-header"
                className="mt-2 space-y-2"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <select
                      defaultValue=""
                      className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
                      onChange={(e) => {
                        const value = e.target.value as ChecklistTemplateId | "";
                        if (!value) return;
                        const tpl = CHECKLIST_TEMPLATES.find((tplItem) => tplItem.id === value);
                        if (!tpl) return;
                        setChecklist(
                          tpl.items.map((item) => ({
                            label: item.label,
                            isDone: false,
                          })),
                        );
                        setChecklistStatus(t("templateApplied"));
                      }}
                    >
                      <option value="">{t("applyTemplate")}</option>
                      {CHECKLIST_TEMPLATES.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setChecklist(
                          ADV_DEFAULT_CHECKLIST.map((item) => ({
                            label: item.label,
                            isDone: false,
                          })),
                        );
                        setChecklistStatus(t("resetToAdvDefaults"));
                      }}
                      className="rounded border border-adv-border px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-900"
                    >
                      {t("resetAdvDefaults")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setChecklist((prev) => [
                          ...prev,
                          { label: "", isDone: false },
                        ])
                      }
                      className="rounded border border-adv-border px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-900"
                    >
                      {t("addItem")}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  {t("checklistDescription")}
                </p>

                {/* Demo: sponsored ADV gear block for potential partners */}
                <section
                  className="mt-2 space-y-1 rounded border border-amber-500/60 bg-amber-500/5 p-2 text-[11px] text-slate-100"
                  aria-label="Sponsored ADV gear suggestions demo"
                >
                  <p className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-amber-200">Sponsored gear: Mosko Moto (demo)</span>
                    <span className="rounded border border-amber-400/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                      Demo only
                    </span>
                  </p>
                  <p className="text-[11px] text-amber-100/90">
                    This is a demonstration of how a gear partner&apos;s products could be highlighted directly alongside your
                    trip-specific checklist.
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-amber-100">
                    <li>Waterproof soft luggage systems for multi-day ADV routes.</li>
                    <li>Armored, abrasion-resistant jackets and pants for mixed terrain.</li>
                    <li>Packing cubes and organizers tuned for motorcycle travel.</li>
                  </ul>
                  <p className="mt-1">
                    <a
                      href="https://moskomoto.com"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-semibold text-amber-300 underline hover:text-amber-200"
                    >
                      Visit Mosko Moto (example sponsor link)
                    </a>
                  </p>
                </section>

                <div className="mt-2 space-y-2">
                  {checklist.map((item, index) => (
                    <div
                      key={item.id ?? `${index}-${item.label}`}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3 accent-adv-accent"
                        checked={item.isDone}
                        onChange={(e) =>
                          setChecklist((prev) =>
                            prev.map((it, i) =>
                              i === index ? { ...it, isDone: e.target.checked } : it,
                            ),
                          )
                        }
                      />
                      <input
                        type="text"
                        className="flex-1 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                        placeholder={t("checklistItemPlaceholder")}
                        value={item.label}
                        onChange={(e) =>
                          setChecklist((prev) =>
                            prev.map((it, i) =>
                              i === index ? { ...it, label: e.target.value } : it,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setChecklist((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  ))}
                  {checklist.length === 0 && (
                    <p className="text-[11px] text-slate-500">{t("noChecklistItems")}</p>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={checklistSaving}
                    onClick={async () => {
                      setChecklistStatus(null);
                      setChecklistSaving(true);
                      try {
                        const res = await fetch(`/api/trips/${trip.id}/checklist`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            items: checklist,
                          }),
                        });

                        if (!res.ok) {
                          const data = await res.json().catch(() => null);
                          throw new Error(data?.error ?? "Failed to save checklist");
                        }

                        setChecklistStatus(t("checklistSaved"));
                      } catch (err: any) {
                        setChecklistStatus(err.message ?? t("failedToSaveChecklist"));
                      } finally {
                        setChecklistSaving(false);
                      }
                    }}
                    className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
                  >
                    {checklistSaving ? t("savingChecklist") : t("saveChecklist")}
                  </button>
                  <div aria-live="polite" role="status">
                    {checklistStatus && (
                      <p className="text-[11px] text-slate-300">{checklistStatus}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {sponsorDemoEnabled && (
            <section
              className="rounded border border-amber-500/60 bg-amber-500/5 p-3 text-xs text-slate-100 shadow-adv-glow"
              aria-label="Trip gear plan demo based on season and route"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-amber-200 text-xs md:text-sm">Trip gear plan (Mosko Moto demo)</h2>
                <span className="rounded border border-amber-400/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                  Demo only
                </span>
              </div>
              <p className="mt-1 text-[11px] text-amber-100/90">
                This demo shows how an ADV gear partner&apos;s recommendations could adapt to your trip&apos;s timing and route style.
              </p>
              {tripStartDate && (
                <p className="mt-1 text-[11px] text-amber-100/90">
                  Planned start date:
                  <span className="ml-1 font-semibold">
                    {tripStartDate.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  .
                </p>
              )}
              {tripGearHighlights.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-100">
                  {tripGearHighlights.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
              {tripGearHighlights.length === 0 && (
                <p className="mt-2 text-[11px] text-amber-100">
                  Add a planned start date and a few waypoints (including campgrounds or lodging) to see tailored gear highlights
                  here.
                </p>
              )}
              <p className="mt-2 text-[11px] text-amber-100/90">
                In this demo, highlights are derived from trip distance, days, camping vs lodging mix, season, daily ride hours,
                and longest fuel legs.
              </p>
              <p className="mt-1 text-[11px] text-amber-100/90">
                In a live sponsorship, each highlight could deep-link to specific Mosko Moto luggage or apparel collections tuned
                for this route.
              </p>
              <p className="mt-1">
                <a
                  href="https://moskomoto.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold text-amber-300 underline hover:text-amber-200"
                >
                  Visit Mosko Moto (example sponsor link)
                </a>
              </p>
            </section>
          )}

        </div>
      </section>
    </>
  );
}
