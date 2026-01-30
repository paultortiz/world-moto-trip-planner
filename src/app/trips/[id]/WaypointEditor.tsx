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
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function WaypointEditor({
  tripId,
  waypoints,
  onWaypointsChange,
  onSaveSuccess,
}: Props) {
  const router = useRouter();
  const [saving, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

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
        <p className="font-semibold text-slate-100">Edit waypoints</p>
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
                      className="w-16 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
                      value={wp.dayIndex ?? 1}
                      onChange={(e) =>
                        updateWaypoint(index, {
                          dayIndex: Number(e.target.value) || null,
                        })
                      }
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
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