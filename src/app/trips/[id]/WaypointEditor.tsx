'use client';

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  deriveDaysFromOvernightStops,
  inferOvernightStopsFromDayIndex,
} from "@/lib/dayPlanning";

interface WaypointDto {
  id?: string;
  lat: number;
  lng: number;
  name?: string | null;
  type?: string | null;
  notes?: string | null;
  dayIndex?: number | null;
  isOvernightStop?: boolean | null;
  googlePlaceId?: string | null;
}

interface Props {
  tripId: string;
  waypoints: WaypointDto[];
  onWaypointsChange: (wps: WaypointDto[]) => void;
  onSaveSuccess?: () => void;
  /**
   * Optional hint for the maximum number of logical trip days based on
   * trip dates and/or computed daily plan. The editor will ensure the
   * dropdown always covers at least this many days, plus any higher
   * dayIndex already used on waypoints.
   * @deprecated No longer used - days are derived from overnight stops
   */
  maxDayHint?: number;
  /**
   * Optional ISO-like YYYY-MM-DD string representing the trip start date,
   * used only for labeling day headers (e.g. "Day 1 – Jun 04").
   */
  startDateLabelBase?: string | null;
  /**
   * Index of the currently focused waypoint (for map <-> editor sync).
   */
  focusedWaypointIndex?: number | null;
  /**
   * Callback when user wants to locate a waypoint on the map.
   */
  onLocateWaypoint?: (index: number) => void;
}

const WAYPOINT_TYPES = [
  "CHECKPOINT",
  "FUEL",
  "LODGING",
  "CAMPGROUND",
  "DINING",
  "POI",
  "OTHER",
] as const;

// Types that auto-set as overnight stops
const OVERNIGHT_TYPES = ["LODGING", "CAMPGROUND"];

export default function WaypointEditor({
  tripId,
  waypoints,
  onWaypointsChange,
  onSaveSuccess,
  startDateLabelBase,
  focusedWaypointIndex,
  onLocateWaypoint,
}: Props) {
  const t = useTranslations("tripDetail");
  const locale = useLocale();
  const router = useRouter();
  const [saving, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Refs for scroll-into-view when a waypoint is focused
  const waypointRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  
  // Scroll to focused waypoint when it changes
  useEffect(() => {
    if (focusedWaypointIndex !== null && focusedWaypointIndex !== undefined) {
      const el = waypointRefs.current.get(focusedWaypointIndex);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [focusedWaypointIndex]);

  // On first render, infer overnight stops from existing dayIndex if needed
  useEffect(() => {
    if (initialized || waypoints.length === 0) return;
    
    // Check if any waypoints have isOvernightStop explicitly set
    const hasOvernightData = waypoints.some((wp) => wp.isOvernightStop === true);
    
    // If no overnight data but we have dayIndex data, infer overnight stops
    if (!hasOvernightData) {
      const hasDayIndexData = waypoints.some(
        (wp) => typeof wp.dayIndex === "number" && wp.dayIndex > 1
      );
      
      if (hasDayIndexData) {
        const inferred = inferOvernightStopsFromDayIndex(waypoints);
        onWaypointsChange(inferred);
      }
    }
    
    setInitialized(true);
  }, [waypoints, initialized, onWaypointsChange]);

  // Derive days from overnight stops for display grouping, preserving original index
  const waypointsWithDays = useMemo(
    () => deriveDaysFromOvernightStops(waypoints).map((wp, idx) => ({
      ...wp,
      originalIndex: idx,
    })),
    [waypoints]
  );

  // Derive a base Date object for labeling days when we have a start date.
  const startDateForLabels = useMemo(() => {
    if (!startDateLabelBase || typeof startDateLabelBase !== "string") return null;
    const parts = startDateLabelBase.split("-");
    if (parts.length !== 3) return null;
    const year = Number(parts[0]);
    const monthIndex = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) {
      return null;
    }
    return new Date(year, monthIndex, day);
  }, [startDateLabelBase]);

  function formatDayLabel(day: number): string {
    if (!startDateForLabels) {
      return t("dayHeader", { day });
    }
    const d = new Date(startDateForLabels.getTime());
    d.setDate(d.getDate() + (day - 1));
    const dateLabel = d.toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return t("dayOptionLabel", { day, date: dateLabel });
  }

  function updateWaypoint(index: number, patch: Partial<WaypointDto>) {
    onWaypointsChange(
      waypoints.map((wp, i) => {
        if (i !== index) return wp;
        const updated = { ...wp, ...patch };
        
        // Auto-set overnight for lodging/campground types (unless it's the last waypoint)
        if (patch.type && i < waypoints.length - 1) {
          const typeUpper = patch.type.toUpperCase();
          if (OVERNIGHT_TYPES.includes(typeUpper)) {
            updated.isOvernightStop = true;
          }
        }
        
        return updated;
      }),
    );
  }

  function toggleOvernight(index: number) {
    // Don't allow setting the first waypoint as overnight (it's the trip start)
    if (index === 0) return;
    
    const wp = waypoints[index];
    const newValue = !wp.isOvernightStop;
    
    onWaypointsChange(
      waypoints.map((w, i) => (i === index ? { ...w, isOvernightStop: newValue } : w)),
    );
  }

  function removeWaypoint(index: number) {
    onWaypointsChange(waypoints.filter((_, i) => i !== index));
  }

  function moveWaypoint(index: number, direction: "up" | "down") {
    const next = [...waypoints];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    onWaypointsChange(next);
  }

  async function handleSave() {
    setStatus(null);
    startTransition(async () => {
      try {
        // Derive day indices from overnight stops for backward compatibility
        const withDerivedDays = deriveDaysFromOvernightStops(waypoints);

        const res = await fetch(`/api/trips/${tripId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            waypoints: withDerivedDays.map((wp) => ({
              id: wp.id,
              lat: wp.lat,
              lng: wp.lng,
              name: wp.name ?? undefined,
              type: wp.type ?? undefined,
              notes: wp.notes ?? undefined,
              dayIndex: wp.effectiveDayIndex,
              isOvernightStop: wp.isOvernightStop === true,
              googlePlaceId: wp.googlePlaceId ?? undefined,
            })),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? t("failedToSaveDates"));
        }

        // Recalculate route after waypoint changes, then refresh elevation
        // profile when route recalculation succeeds.
        let recalcMessage = t("waypointsSaved");
        let routeOk = false;
        try {
          const recalcRes = await fetch("/api/routes/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tripId }),
          });

          if (!recalcRes.ok) {
            const data = await recalcRes.json().catch(() => null);
            const rawError = (data?.error as string | undefined) ?? "Failed to recalculate route";
            let friendly = rawError;

            if (rawError.includes("Directions API returned status ZERO_RESULTS")) {
              friendly = t("routingError");
            } else if (rawError.startsWith("Failed to fetch directions (HTTP")) {
              friendly = t("networkError");
            }

            recalcMessage = `${t("waypointsSavedRouteError")}: ${friendly}`;
          } else {
            routeOk = true;
          }
        } catch {
          recalcMessage = `${t("waypointsSavedRouteError")}: ${t("networkError")}`;
        }

        // If route recalculation succeeded, refresh elevation profile as well.
        if (routeOk) {
          try {
            const elevRes = await fetch("/api/routes/elevation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tripId }),
            });

            if (!elevRes.ok) {
              const data = await elevRes.json().catch(() => null);
              const rawError = (data?.error as string | undefined) ?? "Failed to calculate elevation profile";
              recalcMessage =
                "Waypoints saved and route recalculated, but elevation could not be updated: " + rawError;
            }
          } catch {
            recalcMessage =
              "Waypoints saved and route recalculated, but we couldn't update the elevation profile. " +
              "You can try again later by refreshing the page.";
          }
        }

        setStatus(recalcMessage);
        onSaveSuccess?.();
        router.refresh();
      } catch (err: any) {
        setStatus(`Error: ${err.message ?? "Failed to save waypoints"}`);
      }
    });
  }

  // Group waypoints by day for rendering with headers
  const waypointGroups = useMemo(() => {
    type WpWithIndex = (typeof waypointsWithDays)[number];
    const groups: { day: number; waypoints: WpWithIndex[]; startingFromName?: string }[] = [];
    let currentDay = 0;
    let currentGroup: WpWithIndex[] = [];
    let lastOvernightWaypointName: string | undefined;

    for (const wp of waypointsWithDays) {
      if (wp.effectiveDayIndex !== currentDay) {
        if (currentGroup.length > 0) {
          groups.push({
            day: currentDay,
            waypoints: currentGroup,
            // Day 2+ starts from the previous overnight stop
            startingFromName: currentDay > 1 ? lastOvernightWaypointName : undefined,
          });
          // Track the last waypoint of this group as the overnight stop for the next day
          const lastWp = currentGroup[currentGroup.length - 1];
          if (lastWp?.isOvernightStop) {
            lastOvernightWaypointName = lastWp.name || undefined;
          }
        }
        currentDay = wp.effectiveDayIndex;
        currentGroup = [];
      }
      currentGroup.push(wp);
    }
    if (currentGroup.length > 0) {
      groups.push({
        day: currentDay,
        waypoints: currentGroup,
        startingFromName: currentDay > 1 ? lastOvernightWaypointName : undefined,
      });

      // If the last waypoint is an overnight stop, add an empty next day section
      const lastWp = currentGroup[currentGroup.length - 1];
      if (lastWp?.isOvernightStop) {
        groups.push({
          day: currentDay + 1,
          waypoints: [],
          startingFromName: lastWp.name || undefined,
        });
      }
    }

    return groups;
  }, [waypointsWithDays]);

  // Check if a waypoint type auto-sets overnight
  function isAutoOvernightType(type?: string | null): boolean {
    if (!type) return false;
    return OVERNIGHT_TYPES.includes(type.toUpperCase());
  }

  return (
    <div className="mt-6 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100 text-xs md:text-sm">{t("editWaypoints")}</h2>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-adv-accent px-3 py-1 text-xs font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
        >
          {saving ? t("savingWaypoints") : t("saveChangesRecalc")}
        </button>
      </div>

      {/* Pivot waypoint hint */}
      <p className="text-[11px] text-slate-400">
        {t("pivotWaypointHint")}
      </p>

      {status && <p className="text-slate-300">{status}</p>}

      <div className="rounded border border-adv-border bg-slate-900/70 shadow-adv-glow">
        {waypoints.length === 0 ? (
          <div className="p-3 text-[11px] text-slate-400">
            {t("noWaypoints")}
          </div>
        ) : (
          waypointGroups.map((group) => (
            <div key={`day-${group.day}`}>
              {/* Day header */}
              <div className="sticky top-0 z-10 flex flex-col gap-0.5 bg-slate-800/90 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm">
                <span className="text-adv-accent">{formatDayLabel(group.day)}</span>
                {group.startingFromName && (
                  <span className="text-[10px] font-normal text-slate-400">
                    {t("startingFrom", { name: group.startingFromName })}
                  </span>
                )}
              </div>

              {/* Waypoints for this day */}
              <div className="divide-y divide-slate-800">
                {group.waypoints.length === 0 && (
                  <div className="p-3 text-[11px] text-slate-500 italic">
                    {t("addWaypointsToDay")}
                  </div>
                )}
                {group.waypoints.map((wpWithDay) => {
                  const index = wpWithDay.originalIndex;
                  const wp = waypoints[index];
                  if (!wp) return null;

                  const isOvernight = wp.isOvernightStop === true;
                  const isAutoOvernight = isAutoOvernightType(wp.type);
                  const isFirstWaypoint = index === 0;
                  // Only middle waypoints can be overnight stops (not first or last)
                  const canBeOvernight = !isFirstWaypoint && waypoints.length > 1;
                  const isFocused = focusedWaypointIndex === index;

                  return (
                    <div
                      key={wp.id ?? `${wp.lat}-${wp.lng}-${index}`}
                      id={`waypoint-row-${index}`}
                      ref={(el) => {
                        if (el) waypointRefs.current.set(index, el);
                        else waypointRefs.current.delete(index);
                      }}
                      className={`flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between transition-colors ${
                        isFocused
                          ? "border-l-4 border-l-cyan-400 bg-cyan-900/50 ring-2 ring-cyan-400/70 shadow-[inset_0_0_12px_rgba(34,211,238,0.15)] animate-pulse-once"
                          : isOvernight && canBeOvernight
                            ? "border-l-2 border-l-amber-500 bg-amber-950/20"
                            : ""
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-slate-400">
                          <span className="font-mono">lat:</span> {wp.lat.toFixed(5)}{" "}
                          <span className="font-mono">lng:</span> {wp.lng.toFixed(5)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {/* Starting point badge for first waypoint */}
                          {isFirstWaypoint && (
                            <span className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white">
                              📍 {t("startingPoint")}
                            </span>
                          )}
                          <input
                            className="w-40 rounded border border-slate-600 bg-slate-950 p-1 text-xs"
                            placeholder={t("nameOptional")}
                            value={wp.name ?? ""}
                            onChange={(e) => updateWaypoint(index, { name: e.target.value })}
                          />
                          <select
                            className="rounded border border-slate-600 bg-slate-950 p-1 text-xs"
                            value={wp.type ?? "CHECKPOINT"}
                            onChange={(e) => updateWaypoint(index, { type: e.target.value })}
                          >
                            {WAYPOINT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {t(`waypointTypes.${type.toLowerCase()}`)}
                              </option>
                            ))}
                          </select>
                          {/* Overnight toggle - only show for middle waypoints */}
                          {canBeOvernight && (
                            <button
                              type="button"
                              onClick={() => toggleOvernight(index)}
                              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors ${
                                isOvernight
                                  ? "bg-amber-600 text-black hover:bg-amber-500"
                                  : "border border-slate-600 text-slate-300 hover:bg-slate-800"
                              }`}
                              title={
                                isAutoOvernight && isOvernight
                                  ? t("overnightAutoSet")
                                  : isOvernight
                                    ? t("removeOvernight")
                                    : t("markAsOvernight")
                              }
                            >
                              🌙
                              {isOvernight ? t("overnightStop") : t("markAsOvernight")}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2 md:mt-0">
                        {onLocateWaypoint && (
                          <button
                            type="button"
                            onClick={() => onLocateWaypoint(index)}
                            className="rounded border border-cyan-600 px-2 py-1 text-[10px] text-cyan-300 hover:bg-cyan-900/50"
                            title={t("locateOnMap")}
                          >
                            📍
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => moveWaypoint(index, "up")}
                          className="rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveWaypoint(index, "down")}
                          className="rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeWaypoint(index)}
                          className="rounded bg-red-600 px-2 py-1 text-[10px] text-white hover:bg-red-500"
                        >
                          {t("remove")}
                        </button>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
