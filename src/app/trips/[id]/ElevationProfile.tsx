"use client";

import { useEffect, useState } from "react";

interface ElevationPoint {
  distanceMeters: number;
  elevationMeters: number;
}

interface Props {
  tripId: string;
  /**
   * When this value changes, the elevation profile will be re-fetched even if
   * the trip id stays the same. This lets parent components explicitly signal
   * that the route has changed.
   */
  refreshKey?: number;
}

export default function ElevationProfile({ tripId, refreshKey }: Props) {
  const [profile, setProfile] = useState<ElevationPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    totalAscentMeters: number;
    totalDescentMeters: number;
    maxElevationMeters: number;
  } | null>(null);
  const [climbs, setClimbs] = useState<
    { startKm: number; endKm: number; gainMeters: number }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/routes/elevation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to load elevation profile");
        }
        const data = await res.json();
        if (cancelled) return;
        const prof = data.elevationProfile as ElevationPoint[];
        setProfile(prof);
        setSummary({
          totalAscentMeters: data.totalAscentMeters ?? 0,
          totalDescentMeters: data.totalDescentMeters ?? 0,
          maxElevationMeters: data.maxElevationMeters ?? 0,
        });

        // Simple climb detection: look for stretches with cumulative gain
        // above a threshold over a moving window.
        const CLIMB_GAIN_THRESHOLD = 300; // meters
        const CLIMB_MIN_LENGTH_M = 5000; // meters
        const detected: { startKm: number; endKm: number; gainMeters: number }[] = [];
        let windowStartIndex = 0;

        while (windowStartIndex < prof.length - 1) {
          let gain = 0;
          const startDist = prof[windowStartIndex].distanceMeters;
          let i = windowStartIndex;

          while (i < prof.length - 1) {
            const cur = prof[i].elevationMeters;
            const next = prof[i + 1].elevationMeters;
            const diff = next - cur;
            if (diff > 0) gain += diff;

            const curDist = prof[i + 1].distanceMeters;
            const climbedEnough = gain >= CLIMB_GAIN_THRESHOLD;
            const longEnough = curDist - startDist >= CLIMB_MIN_LENGTH_M;

            if (climbedEnough && longEnough) {
              detected.push({
                startKm: startDist / 1000,
                endKm: curDist / 1000,
                gainMeters: gain,
              });
              // move window past this climb
              windowStartIndex = i + 1;
              break;
            }

            i++;
          }

          if (i >= prof.length - 1) {
            break;
          }
        }

        setClimbs(detected);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Failed to load elevation profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tripId, refreshKey]);

  if (loading && !profile) {
    return (
      <div className="mt-4 text-xs text-slate-400">Fetching elevation profile...</div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 text-xs text-red-400">Elevation: {error}</div>
    );
  }

  if (!profile || profile.length === 0) {
    return null;
  }

  const minElev = Math.min(...profile.map((p) => p.elevationMeters));
  const maxElev = Math.max(...profile.map((p) => p.elevationMeters));
  const span = Math.max(1, maxElev - minElev);
  const maxDist = Math.max(1, profile[profile.length - 1].distanceMeters);

  const points = profile.map((p) => {
    const x = (p.distanceMeters / maxDist) * 100;
    const y = 40 - ((p.elevationMeters - minElev) / span) * 30; // leave some padding
    return { x, y };
  });

  const pathD = points
    .map((pt, idx) => `${idx === 0 ? "M" : "L"}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`)
    .join(" ");

  return (
    <div className="mt-4 space-y-2 rounded border border-adv-border bg-slate-900/70 p-3 text-xs text-slate-200 shadow-adv-glow">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-100">Elevation profile</p>
        {summary && (
          <p className="text-[11px] text-slate-400">
            Ascent: {(summary.totalAscentMeters / 1000).toFixed(1)} km · Max: {" "}
            {summary.maxElevationMeters.toFixed(0)} m
          </p>
        )}
      </div>
      <div className="mt-1">
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className="h-24 w-full text-adv-accent"
        >
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
          />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>0 km</span>
          <span>{(maxDist / 1000).toFixed(0)} km</span>
        </div>
      </div>
      {summary && (
        <p className="text-[11px] text-slate-400">
          Total ascent {summary.totalAscentMeters.toFixed(0)} m, descent {" "}
          {summary.totalDescentMeters.toFixed(0)} m.
        </p>
      )}
      {climbs.length > 0 && (
        <div className="mt-1 text-[11px] text-slate-400">
          <p className="font-semibold text-slate-200">Notable climbs</p>
          <ul className="mt-1 space-y-0.5">
            {climbs.map((c, idx) => (
              <li key={`${c.startKm}-${c.endKm}-${idx}`}>
                {c.gainMeters.toFixed(0)} m gain over {c.startKm.toFixed(1)}–
                {c.endKm.toFixed(1)} km
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
