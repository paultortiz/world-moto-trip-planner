"use client";

import { useState } from "react";

export interface SuggestedStop {
  name: string;
  type: string;
  lat: number;
  lng: number;
  reason?: string;
}

export interface AiDayData {
  day: number;
  title: string;
  summary: string;
  distanceKm: number;
  durationHours: number;
  waypointIndices: number[];
  suggestedStops?: SuggestedStop[];
  highlights?: string[];
  warnings?: string[];
}

interface WaypointInfo {
  index: number;
  name: string | null;
  type: string;
}

interface AiDayCardProps {
  day: AiDayData;
  waypoints: WaypointInfo[];
  onAddWaypoint?: (stop: SuggestedStop) => void;
  isStopAdded?: (stop: SuggestedStop) => boolean;
  t: (key: string) => string;
}

export default function AiDayCard({
  day,
  waypoints,
  onAddWaypoint,
  isStopAdded,
  t,
}: AiDayCardProps) {
  const [expanded, setExpanded] = useState(true);

  // Get waypoint names for this day
  const dayWaypoints = day.waypointIndices
    .map((idx) => waypoints.find((wp) => wp.index === idx))
    .filter(Boolean) as WaypointInfo[];

  return (
    <div className="rounded border border-slate-700 bg-slate-900/50 overflow-hidden">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-adv-accent text-black text-xs font-bold">
            {day.day}
          </span>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">{day.title}</h3>
            <p className="text-[11px] text-slate-400">
              <span className="font-medium text-slate-300">~{day.distanceKm} km</span>
              {" · "}
              <span className="font-medium text-slate-300">~{day.durationHours.toFixed(1)} {t("hours")}</span>
              {" · "}
              {dayWaypoints.length} {t("waypoints")}
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-slate-700 p-3 space-y-3">
          {/* Summary */}
          <p className="text-[11px] text-slate-300">{day.summary}</p>

          {/* Waypoints for this day */}
          {dayWaypoints.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                {t("waypointsForDay")}
              </h4>
              <ul className="space-y-1">
                {dayWaypoints.map((wp, idx) => (
                  <li
                    key={wp.index}
                    className="flex items-center gap-2 text-[11px] text-slate-300"
                  >
                    <span className="w-4 h-4 flex items-center justify-center rounded bg-slate-700 text-[9px] font-medium">
                      {idx + 1}
                    </span>
                    <span>{wp.name || t("unnamed")}</span>
                    <span className="text-slate-500 text-[10px]">({wp.type})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Highlights */}
          {day.highlights && day.highlights.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                {t("highlights")}
              </h4>
              <ul className="space-y-0.5">
                {day.highlights.map((h, idx) => (
                  <li key={idx} className="text-[11px] text-amber-200 italic">
                    • {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {day.warnings && day.warnings.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-orange-400 uppercase tracking-wide mb-1">
                ⚠️ {t("notes")}
              </h4>
              <ul className="space-y-0.5">
                {day.warnings.map((w, idx) => (
                  <li key={idx} className="text-[11px] text-slate-300">
                    • {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested stops */}
          {day.suggestedStops && day.suggestedStops.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                {t("suggestedStops")}
              </h4>
              <ul className="space-y-2">
                {day.suggestedStops.map((stop, idx) => (
                  <li
                    key={idx}
                    className="flex items-start justify-between gap-2 text-[11px] p-2 rounded bg-slate-800/50"
                  >
                    <div>
                      <span className="font-medium text-slate-200">{stop.name}</span>
                      <span className="ml-1 text-[10px] text-slate-500">({stop.type})</span>
                      {stop.reason && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{stop.reason}</p>
                      )}
                    </div>
                    {onAddWaypoint && (
                      isStopAdded?.(stop) ? (
                        <span className="shrink-0 text-[10px] px-2 py-1 rounded bg-green-900/50 text-green-400 font-medium">
                          ✓ {t("added")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddWaypoint(stop)}
                          className="shrink-0 text-[10px] px-2 py-1 rounded bg-adv-accent/20 text-adv-accent hover:bg-adv-accent/30 font-medium"
                        >
                          + {t("addWaypoint")}
                        </button>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
