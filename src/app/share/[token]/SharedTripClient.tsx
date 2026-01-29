'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import TripPlannerMap, { type WaypointPosition } from "@/features/map/TripPlannerMap";

interface SharedTripClientProps {
  tripId: string;
  token: string;
  name: string;
  description: string | null;
  totalDistanceMeters: number | null;
  totalDurationSeconds: number | null;
  waypoints: WaypointPosition[];
  routePath?: WaypointPosition[];
}

export default function SharedTripClient({
  tripId,
  token,
  name,
  description,
  totalDistanceMeters,
  totalDurationSeconds,
  waypoints,
  routePath,
}: SharedTripClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClone() {
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(token)}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.status === 401) {
        // Not signed in; send to sign-in page.
        router.push("/api/auth/signin");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to clone trip");
      }

      const data = await res.json();
      if (data?.id) {
        router.push(`/trips/${data.id}`);
        return;
      }

      setStatus("Trip cloned, but no ID returned.");
    } catch (err: any) {
      setStatus(err.message ?? "Failed to clone trip");
    } finally {
      setLoading(false);
    }
  }

  const [showFuelPlaces, setShowFuelPlaces] = useState(false);
  const [showLodgingPlaces, setShowLodgingPlaces] = useState(false);
  const [showCampgroundPlaces, setShowCampgroundPlaces] = useState(false);
  const [showDiningPlaces, setShowDiningPlaces] = useState(false);
  const [showPoiPlaces, setShowPoiPlaces] = useState(false);
  const [minPlaceRating, setMinPlaceRating] = useState<string>("any");
  const [onlyOpenNow, setOnlyOpenNow] = useState(false);

  return (
    <main className="min-h-screen p-6 space-y-6">
      <header className="max-w-5xl">
        <p className="mb-1 inline-flex items-center rounded-full border border-adv-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-adv-accent">
          Shared route
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">{name}</h1>
            {description && (
              <p className="mt-2 text-sm text-slate-300">{description}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Distance: {totalDistanceMeters != null
                ? `${(totalDistanceMeters / 1000).toFixed(1)} km`
                : "--"}
              {" · "}
              Duration: {totalDurationSeconds != null
                ? `${(totalDurationSeconds / 3600).toFixed(1)} h`
                : "--"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClone}
            disabled={loading}
            className="mt-2 rounded bg-adv-accent px-4 py-2 text-xs font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50 sm:mt-0"
          >
            {loading ? "Cloning..." : "Clone to my routes"}
          </button>
        </div>
        {status && (
          <p className="mt-2 text-xs text-slate-300">{status}</p>
        )}
      </header>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Route map</h2>
          <p className="mt-1 text-xs text-slate-400">
            View this route and clone it into your own account to edit waypoints, fuel plan, and schedule.
          </p>
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
            waypoints={waypoints}
            routePath={routePath}
            showFuelPlaces={showFuelPlaces}
            showLodgingPlaces={showLodgingPlaces}
            showCampgroundPlaces={showCampgroundPlaces}
            showDiningPlaces={showDiningPlaces}
            showPoiPlaces={showPoiPlaces}
            minPlaceRating={minPlaceRating === "any" ? null : Number(minPlaceRating)}
            onlyOpenNow={onlyOpenNow}
          />
        </div>
      </section>
    </main>
  );
}
