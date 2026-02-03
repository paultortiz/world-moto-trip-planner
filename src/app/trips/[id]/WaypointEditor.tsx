'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
   */
  maxDayHint?: number;
  /**
   * Optional ISO-like YYYY-MM-DD string representing the trip start date,
   * used only for labeling day options (e.g. "5 – Jun 04").
   */
  startDateLabelBase?: string | null;
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

export default function WaypointEditor({
  tripId,
  waypoints,
  onWaypointsChange,
  onSaveSuccess,
  maxDayHint,
  startDateLabelBase,
}: Props) {
  const router = useRouter();
  const [saving, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const maxExistingDay = waypoints.reduce((max, wp) => {
    const d = typeof wp.dayIndex === "number" && wp.dayIndex > 0 ? wp.dayIndex : 0;
    return d > max ? d : max;
  }, 0);

  const baseHint = typeof maxDayHint === "number" && Number.isFinite(maxDayHint) ? maxDayHint : 0;
  const rawMaxDay = Math.max(10, baseHint, maxExistingDay);
  const MAX_DAY_CAP = 60;
  const maxDayForDropdown = Math.min(MAX_DAY_CAP, rawMaxDay);
  const dayOptions = Array.from({ length: maxDayForDropdown }, (_, i) => i + 1);

  // Derive a base Date object for labeling days when we have a start date.
  let startDateForLabels: Date | null = null;
  if (startDateLabelBase && typeof startDateLabelBase === "string") {
    const parts = startDateLabelBase.split("-");
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const monthIndex = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      if (Number.isFinite(year) && Number.isFinite(monthIndex) && Number.isFinite(day)) {
        startDateForLabels = new Date(year, monthIndex, day);
      }
    }
  }

  function formatDayOptionLabel(day: number): string {
    if (!startDateForLabels) return String(day);
    const d = new Date(startDateForLabels.getTime());
    d.setDate(d.getDate() + (day - 1));
    const dateLabel = d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `${day} – ${dateLabel}`;
  }

  function updateWaypoint(index: number, patch: Partial<WaypointDto>) {
    onWaypointsChange(
      waypoints.map((wp, i) => (i === index ? { ...wp, ...patch } : wp)),
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
        // Derive an effective dayIndex sequence so that trips with partially
        // assigned days still behave as expected. We walk forward, carrying
        // the last explicitly set dayIndex, defaulting to 1 for the first
        // waypoint.
        const withEffectiveDay: WaypointDto[] = [];
        let currentDay = 1;
        for (let i = 0; i < waypoints.length; i++) {
          const raw = waypoints[i].dayIndex;
          if (typeof raw === "number" && raw >= 1) {
            currentDay = raw;
          }
          withEffectiveDay.push({ ...waypoints[i], dayIndex: currentDay });
        }

        const res = await fetch(`/api/trips/${tripId}`, {
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

        // Recalculate route after waypoint changes.
        await fetch("/api/routes/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId }),
        }).catch(() => {
          // Ignore route calc errors here; user can retry from the button.
        });

        setStatus("Waypoints saved and route recalculation triggered.");
        onSaveSuccess?.();
        router.refresh();
      } catch (err: any) {
        setStatus(`Error: ${err.message ?? "Failed to save waypoints"}`);
      }
    });
  }

  return (
    <div className="mt-6 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100 text-xs md:text-sm">Edit waypoints</h2>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-adv-accent px-3 py-1 text-xs font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes & recalc"}
        </button>
      </div>

      {status && <p className="text-slate-300">{status}</p>}

      <div className="divide-y divide-slate-800 rounded border border-adv-border bg-slate-900/70 shadow-adv-glow">
        {waypoints.length === 0 ? (
          <div className="p-3 text-[11px] text-slate-400">
            No waypoints for this trip yet. Use the planning map or search box to add points, then save to
            update the route.
          </div>
        ) : (
          waypoints.map((wp, index) => (
            <div
              key={wp.id ?? `${wp.lat}-${wp.lng}-${index}`}
              className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p>
                  <span className="font-mono">lat:</span> {wp.lat.toFixed(5)}{" "}
                  <span className="font-mono">lng:</span> {wp.lng.toFixed(5)}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <input
                    className="w-40 rounded border border-slate-600 bg-slate-950 p-1 text-xs"
                    placeholder="Name (optional)"
                    value={wp.name ?? ""}
                    onChange={(e) => updateWaypoint(index, { name: e.target.value })}
                  />
                  <select
                    className="rounded border border-slate-600 bg-slate-950 p-1 text-xs"
                    value={wp.type ?? "CHECKPOINT"}
                    onChange={(e) => updateWaypoint(index, { type: e.target.value })}
                  >
                    {WAYPOINT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase text-slate-500">Day</span>
                    <select
                      className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                      value={wp.dayIndex ?? 1}
                      onChange={(e) =>
                        updateWaypoint(index, {
                          dayIndex: Number(e.target.value) || null,
                        })
                      }
                    >
                      {dayOptions.map((d) => (
                        <option key={d} value={d}>
                          {formatDayOptionLabel(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 md:mt-0">
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
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}