'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import TripPlannerMap, {
  type WaypointPosition,
} from "@/features/map/TripPlannerMap";

export default function NewTripClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [waypoints, setWaypoints] = useState<WaypointPosition[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, waypoints }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "Request failed");
      }

      if (data?.id) {
        // Fire route calculation immediately after trip creation so the detail page
        // is likely to show the route on first load. Ignore failures here; the
        // user can always recalc from the trip page.
        try {
          await fetch("/api/routes/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tripId: data.id }),
          });
        } catch {
          // Swallow errors; the recalc button on the trip page is the fallback.
        }

        router.push(`/trips/${data.id}`);
        return;
      }

      setStatus("Trip created.");
      setName("");
      setDescription("");
      setWaypoints([]);
    } catch (err: any) {
      setStatus(`Error: ${err.message ?? "Failed to create trip"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 space-y-4">
      <header className="max-w-5xl">
        <h1 className="text-2xl font-bold">Plan a new route</h1>
        <p className="mt-2 text-sm text-slate-400">
          Name the leg, add a short note, then start dropping waypoints on the map.
        </p>
      </header>

      <section className="max-w-md rounded border border-adv-border bg-slate-900/80 p-4 shadow-adv-glow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Trip name</label>
            <input
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Description (optional)</label>
            <textarea
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded bg-adv-accent px-4 py-2 text-sm font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Trip"}
          </button>
        </form>

        {status && (
          <p className="mt-3 text-xs text-slate-300">{status}</p>
        )}
      </section>

      <section className="mt-6 space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Planning map</h2>
            <p className="mt-1 text-xs text-slate-400">
              Click on the map to drop waypoints. These are currently stored in
              local state and will be saved with the trip.
            </p>
          </div>
          {waypoints.length > 0 && (
            <button
              type="button"
              onClick={() => setWaypoints([])}
              className="mt-2 rounded border border-adv-border px-3 py-1 text-[10px] text-slate-200 hover:bg-slate-900 md:mt-0"
            >
              Clear all waypoints
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded border border-adv-border bg-slate-950/70 shadow-adv-glow">
          <TripPlannerMap
            waypoints={waypoints}
            onAddWaypoint={(wp) => setWaypoints((prev) => [...prev, wp])}
            onMarkerClick={(index) =>
              setWaypoints((prev) => prev.filter((_, i) => i !== index))
            }
          />
        </div>

        {waypoints.length > 0 && (
          <div className="text-xs text-slate-300">
            <p className="font-semibold">Waypoints on this leg:</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4">
              {waypoints.map((wp, index) => (
                <li key={`${wp.lat}-${wp.lng}-${index}`}>
                  lat: {wp.lat.toFixed(5)}, lng: {wp.lng.toFixed(5)}
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </main>
  );
}
