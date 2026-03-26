/**
 * Terrain classification types, UI metadata, and helpers.
 *
 * Used by the /api/routes/terrain endpoint and rendered in AiDayCard +
 * ElevationProfile.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const TERRAIN_TYPES = [
  "mountain_pass",
  "alpine",
  "highland",
  "desert",
  "tropical",
  "coastal",
  "plains",
  "forest",
  "canyon",
  "urban",
  "tundra",
  "wetland",
] as const;

export type TerrainType = (typeof TERRAIN_TYPES)[number];

export interface TerrainSegment {
  startKm: number;
  endKm: number;
  type: TerrainType;
  label: string;
  avgElevationM: number;
  maxElevationM: number;
  notes?: string;
}

export interface TerrainClassificationData {
  segments: TerrainSegment[];
  generatedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// UI metadata per terrain type
// ---------------------------------------------------------------------------

export interface TerrainMeta {
  emoji: string;
  /** Tailwind background + text classes for badges */
  bgClass: string;
  textClass: string;
  /** SVG fill color for the elevation profile overlay */
  svgColor: string;
  i18nKey: string;
}

export const terrainMeta: Record<TerrainType, TerrainMeta> = {
  mountain_pass: {
    emoji: "\u{1F3D4}\uFE0F",
    bgClass: "bg-purple-600/25",
    textClass: "text-purple-300",
    svgColor: "rgba(147, 51, 234, 0.25)",
    i18nKey: "terrain.mountain_pass",
  },
  alpine: {
    emoji: "\u26F0\uFE0F",
    bgClass: "bg-indigo-600/25",
    textClass: "text-indigo-300",
    svgColor: "rgba(99, 102, 241, 0.25)",
    i18nKey: "terrain.alpine",
  },
  highland: {
    emoji: "\u{1F304}",
    bgClass: "bg-violet-600/25",
    textClass: "text-violet-300",
    svgColor: "rgba(139, 92, 246, 0.25)",
    i18nKey: "terrain.highland",
  },
  desert: {
    emoji: "\u{1F3DC}\uFE0F",
    bgClass: "bg-amber-600/25",
    textClass: "text-amber-300",
    svgColor: "rgba(217, 119, 6, 0.25)",
    i18nKey: "terrain.desert",
  },
  tropical: {
    emoji: "\u{1F334}",
    bgClass: "bg-emerald-600/25",
    textClass: "text-emerald-300",
    svgColor: "rgba(16, 185, 129, 0.25)",
    i18nKey: "terrain.tropical",
  },
  coastal: {
    emoji: "\u{1F30A}",
    bgClass: "bg-cyan-600/25",
    textClass: "text-cyan-300",
    svgColor: "rgba(6, 182, 212, 0.25)",
    i18nKey: "terrain.coastal",
  },
  plains: {
    emoji: "\u{1F33E}",
    bgClass: "bg-lime-600/25",
    textClass: "text-lime-300",
    svgColor: "rgba(132, 204, 22, 0.25)",
    i18nKey: "terrain.plains",
  },
  forest: {
    emoji: "\u{1F332}",
    bgClass: "bg-green-600/25",
    textClass: "text-green-300",
    svgColor: "rgba(22, 163, 74, 0.25)",
    i18nKey: "terrain.forest",
  },
  canyon: {
    emoji: "\u{1F3DC}\uFE0F",
    bgClass: "bg-orange-600/25",
    textClass: "text-orange-300",
    svgColor: "rgba(234, 88, 12, 0.25)",
    i18nKey: "terrain.canyon",
  },
  urban: {
    emoji: "\u{1F3D9}\uFE0F",
    bgClass: "bg-slate-600/25",
    textClass: "text-slate-300",
    svgColor: "rgba(100, 116, 139, 0.25)",
    i18nKey: "terrain.urban",
  },
  tundra: {
    emoji: "\u2744\uFE0F",
    bgClass: "bg-sky-600/25",
    textClass: "text-sky-300",
    svgColor: "rgba(14, 165, 233, 0.25)",
    i18nKey: "terrain.tundra",
  },
  wetland: {
    emoji: "\u{1F33F}",
    bgClass: "bg-teal-600/25",
    textClass: "text-teal-300",
    svgColor: "rgba(20, 184, 166, 0.25)",
    i18nKey: "terrain.wetland",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter terrain segments that overlap a given distance range (km). */
export function getDayTerrainTags(
  segments: TerrainSegment[],
  dayStartKm: number,
  dayEndKm: number,
): TerrainSegment[] {
  return segments.filter(
    (seg) => seg.endKm > dayStartKm && seg.startKm < dayEndKm,
  );
}

/** De-duplicate terrain types for badge display, preserving order. */
export function uniqueTerrainTypes(
  segments: TerrainSegment[],
): { type: TerrainType; label: string }[] {
  const seen = new Set<string>();
  const result: { type: TerrainType; label: string }[] = [];
  for (const seg of segments) {
    if (!seen.has(seg.type)) {
      seen.add(seg.type);
      result.push({ type: seg.type, label: seg.label });
    }
  }
  return result;
}
