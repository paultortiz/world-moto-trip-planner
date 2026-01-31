"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
}: TripDetailClientProps) {
  const router = useRouter();
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
  const [aiPlanText, setAiPlanText] = useState<string | null>(null);
  const [aiPlanError, setAiPlanError] = useState<string | null>(null);

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

  return (
    <>
      <header className="max-w-5xl">
        <h1 className="text-2xl font-bold">{trip.name}</h1>
        {trip.description && (
          <p className="mt-2 text-sm text-slate-300">{trip.description}</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          Trip ID: <span className="font-mono">{trip.id}</span>
        </p>
      </header>

      <section className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)]">
        {/* Left column: map, elevation, daily plan */}
        <div className="space-y-3">
          {waypoints.length === 0 && (
            <div className="rounded border border-adv-border bg-slate-900/80 p-2 text-[11px] text-slate-200 shadow-adv-glow">
              <p className="font-semibold text-slate-100">Start planning this route</p>
              <p className="mt-1 text-slate-300">
                Drop your first waypoint directly on the map below, or use the &quot;Search address or place...&quot; box
                to add a location. Then you can turn on nearby fuel, lodging, dining, and POI overlays.
              </p>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold">Trip overview map</h2>
            <p className="mt-1 text-xs text-slate-400">
              Saved waypoints and the calculated route for this trip are shown below.
              <span className="ml-1 font-semibold text-amber-300">
                Turn on &quot;Add waypoints by clicking the map&quot; to place new points,
              </span>
              {" "}
              or use the search box above the map.
            </p>
            {showClickToAddHint && (
              <div className="mt-2 flex items-start justify-between gap-2 rounded border border-amber-400/70 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100">
                <p className="pr-2">
                  Tip: When you want to lay down waypoints, enable
                  <span className="mx-1 font-semibold">&quot;Add waypoints by clicking map&quot;</span>
                  below. Turn it off again to pan and explore without creating points.
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
                  Dismiss
                </button>
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" />
                <span>Fuel</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#60a5fa]" />
                <span>Lodging</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#14b8a6]" />
                <span>Campground</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#fb7185]" />
                <span>Dining</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#eab308]" />
                <span>POI</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={showFuelPlaces}
                    onChange={(e) => setShowFuelPlaces(e.target.checked)}
                  />
                  <span>Nearby fuel</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={showLodgingPlaces}
                    onChange={(e) => setShowLodgingPlaces(e.target.checked)}
                  />
                  <span>Nearby lodging</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={showCampgroundPlaces}
                    onChange={(e) => setShowCampgroundPlaces(e.target.checked)}
                  />
                  <span>Nearby campgrounds</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={showDiningPlaces}
                    onChange={(e) => setShowDiningPlaces(e.target.checked)}
                  />
                  <span>Nearby dining</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={showPoiPlaces}
                    onChange={(e) => setShowPoiPlaces(e.target.checked)}
                  />
                  <span>Nearby POIs</span>
                </label>
                <label className="flex items-center gap-1 rounded-full border border-amber-400/70 bg-amber-500/10 px-2 py-1">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-adv-accent"
                    checked={enableClickToAdd}
                    onChange={(e) => setEnableClickToAdd(e.target.checked)}
                  />
                  <span className="font-semibold text-amber-300">Add waypoints by clicking map</span>
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-slate-500">Min rating</span>
                  <select
                    className="rounded border border-slate-600 bg-slate-950 px-1 py-0.5 text-[11px]"
                    value={minPlaceRating}
                    onChange={(e) => setMinPlaceRating(e.target.value)}
                  >
                    <option value="any">Any</option>
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
                  <span>Open now only</span>
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
            <p className="text-[11px] text-amber-400">
              You have unsaved waypoint changes. The route line reflects the last saved version and
              will update after saving.
            </p>
          )}

          <ElevationProfile tripId={trip.id} />

          <div className="flex items-center justify-between text-xs text-slate-300">
            <div>
              <p>
                Total distance: {trip.totalDistanceMeters != null
                  ? `${(trip.totalDistanceMeters / 1000).toFixed(1)} km`
                  : "--"}
              </p>
              <p>
                Total duration: {trip.totalDurationSeconds != null
                  ? `${(trip.totalDurationSeconds / 3600).toFixed(1)} h`
                  : "--"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <RecalculateRouteButton tripId={trip.id} />
              <a
                href={`/api/trips/${trip.id}/gpx`}
                className="rounded border border-adv-border px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900"
              >
                Export GPX
              </a>
              <DeleteTripButton tripId={trip.id} />
            </div>
          </div>

          {dailyPlan.length > 0 && (
            <section className="space-y-2 rounded border border-adv-border bg-slate-900/70 p-3 text-xs text-slate-200 shadow-adv-glow" aria-label="Daily distance and duration plan by day">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-100 text-xs md:text-sm">Daily plan</h2>
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
                      <span className="text-slate-300">Day {day.day}</span>
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
              <h2 className="font-semibold text-slate-100 text-xs md:text-sm">Sharing</h2>
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
                          data.isPublic ? "Sharing enabled." : "Sharing disabled.",
                        );
                      } catch (err: any) {
                        setShareStatus(err.message ?? "Failed to update sharing");
                      } finally {
                        setShareSaving(false);
                      }
                    }}
                  />
                  <span>{shareEnabled ? "Anyone with the link can view" : "Sharing disabled"}</span>
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
                        setShareStatus("Share link copied to clipboard.");
                      } catch {
                        setShareStatus("Unable to copy link; please copy it manually.");
                      }
                    }}
                    className="rounded border border-adv-border px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-900"
                  >
                    Copy link
                  </button>
                )}
              </div>
            </div>
            {shareEnabled && shareToken && (
              <div className="mt-1">
                <p className="text-[11px] text-slate-400">Share URL</p>
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
            }}
          />

          <h2 className="font-semibold text-slate-100 text-xs md:text-sm">Planning tools</h2>

          {/* AI daily plan suggestion */}
          <section className="space-y-2 rounded border border-adv-border bg-slate-900/70 p-3 text-xs text-slate-200 shadow-adv-glow" aria-label="AI-generated daily riding plan">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-100 text-xs md:text-sm">AI daily plan suggestion</h2>
              <button
                type="button"
                disabled={aiPlanLoading || waypoints.length < 2}
                onClick={async () => {
                  setAiPlanError(null);
                  setAiPlanText(null);
                  setAiPlanLoading(true);
                  try {
                    const res = await fetch(`/api/ai/daily-plan`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ tripId: trip.id }),
                    });

                    if (!res.ok) {
                      const data = await res.json().catch(() => null);
                      throw new Error(data?.error ?? "Failed to generate plan");
                    }

                    const data = await res.json();
                    setAiPlanText(typeof data.text === "string" ? data.text : "");
                  } catch (err: any) {
                    setAiPlanError(err?.message ?? "Failed to generate AI plan");
                  } finally {
                    setAiPlanLoading(false);
                  }
                }}
                className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
              >
                {aiPlanLoading
                  ? "Thinking..."
                  : waypoints.length < 2
                  ? "Add more waypoints"
                  : "Suggest daily plan"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Get a suggested multi-day riding plan that calls out scenic legs and nearby points of interest
              along your waypoints.
            </p>
            <div aria-live="polite" role="status">
              {aiPlanError && (
                <p className="text-[11px] text-red-400">{aiPlanError}</p>
              )}
            </div>
            {aiPlanText && (
              <div className="max-h-64 overflow-y-auto rounded border border-slate-700 bg-slate-950/70 p-2 text-[11px] text-slate-200">
                <pre className="whitespace-pre-wrap font-sans text-[11px]">
{aiPlanText}
                </pre>
              </div>
            )}
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
              <span className="font-semibold text-slate-100">Fuel settings & plan</span>
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
                    Set your bike&apos;s comfortable range between fuel stops. We&apos;ll use this to flag risky legs
                    between FUEL waypoints.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">Range (km)</span>
                      <input
                        type="number"
                        min={0}
                        className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                        value={fuelRangeInput}
                        onChange={(e) => setFuelRangeInput(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">Reserve (km, optional)</span>
                      <input
                        type="number"
                        min={0}
                        className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                        value={fuelReserveInput}
                        onChange={(e) => setFuelReserveInput(e.target.value)}
                      />
                    </label>
                    <div className="flex flex-1 items-end justify-end">
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

                            setFuelStatus("Fuel settings saved.");
                            router.refresh();
                          } catch (err: any) {
                            setFuelStatus(err.message ?? "Failed to save fuel settings");
                          } finally {
                            setFuelSaving(false);
                          }
                        }}
                        className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
                      >
                        {fuelSaving ? "Saving..." : "Save fuel settings"}
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
                      <h3 className="font-semibold text-slate-100 text-xs md:text-sm">Fuel plan</h3>
                      <p className="text-[11px] text-slate-400">
                        Range: {trip.fuelRangeKm ? `${trip.fuelRangeKm} km` : "not set"}
                        {trip.fuelReserveKm ? ` · Reserve: ${trip.fuelReserveKm} km` : ""}
                      </p>
                    </div>
                    {fuelPlan.longestLegKm != null && (
                      <p className="text-[11px] text-slate-300">
                        Longest distance between fuel stops: {fuelPlan.longestLegKm.toFixed(0)} km
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
                              ? " (beyond range)"
                              : leg.risk === "medium"
                              ? " (beyond reserve)"
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
              <span className="font-semibold text-slate-100">Schedule settings & daily schedule</span>
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
                    Configure your ideal riding day to see when arrivals might push past your comfort window.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">Target riding time (h/day)</span>
                      <input
                        type="number"
                        min={0}
                        className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                        value={scheduleDailyHoursInput}
                        onChange={(e) => setScheduleDailyHoursInput(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400">Earliest departure (hour)</span>
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
                      <span className="text-[11px] text-slate-400">Latest arrival (hour)</span>
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

                            setScheduleStatus("Schedule settings saved.");
                            router.refresh();
                          } catch (err: any) {
                            setScheduleStatus(err.message ?? "Failed to save schedule settings");
                          } finally {
                            setScheduleSaving(false);
                          }
                        }}
                        className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
                      >
                        {scheduleSaving ? "Saving..." : "Save schedule settings"}
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
                      <h3 className="font-semibold text-slate-100 text-xs md:text-sm">Daily schedule</h3>
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
                            <span className="text-slate-300">Day {day.day}</span>
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
                <span className="font-semibold text-slate-100">Segment risk & notes</span>
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
                    Annotate tricky legs between waypoints: exposure, remoteness, weather risks, or surface changes.
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
                              <option value="">Risk: none</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="extreme">Extreme</option>
                            </select>
                            <input
                              type="text"
                              className="min-w-[160px] flex-1 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                              placeholder="Notes (sand, cliffs, no services, etc.)"
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

                          setSegmentNotesStatus("Segment notes saved.");
                        } catch (err: any) {
                          setSegmentNotesStatus(err.message ?? "Failed to save segment notes");
                        } finally {
                          setSegmentNotesSaving(false);
                        }
                      }}
                      className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
                    >
                      {segmentNotesSaving ? "Saving..." : "Save segment notes"}
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
              <span className="font-semibold text-slate-100">Pre-ride checklist</span>
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
                        const tpl = CHECKLIST_TEMPLATES.find((t) => t.id === value);
                        if (!tpl) return;
                        setChecklist(
                          tpl.items.map((item) => ({
                            label: item.label,
                            isDone: false,
                          })),
                        );
                        setChecklistStatus("Template applied (not yet saved).");
                      }}
                    >
                      <option value="">Apply template...</option>
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
                        setChecklistStatus("Reset to ADV defaults (not yet saved).");
                      }}
                      className="rounded border border-adv-border px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-900"
                    >
                      Reset ADV defaults
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
                      Add item
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Capture the things you want to confirm before rolling out on this specific route.
                </p>
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
                        placeholder="Checklist item"
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
                        Remove
                      </button>
                    </div>
                  ))}
                  {checklist.length === 0 && (
                    <p className="text-[11px] text-slate-500">No checklist items yet. Add a few above.</p>
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

                        setChecklistStatus("Checklist saved.");
                      } catch (err: any) {
                        setChecklistStatus(err.message ?? "Failed to save checklist");
                      } finally {
                        setChecklistSaving(false);
                      }
                    }}
                    className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
                  >
                    {checklistSaving ? "Saving..." : "Save checklist"}
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

        </div>
      </section>
    </>
  );
}
