/**
 * Day planning utilities for deriving trip days from overnight stops.
 */

export interface WaypointForDayPlanning {
  lat: number;
  lng: number;
  type?: string | null;
  dayIndex?: number | null;
  isOvernightStop?: boolean | null;
}

export interface WaypointWithDerivedDay extends WaypointForDayPlanning {
  effectiveDayIndex: number;
}

/**
 * Derives effective day indices from overnight stops.
 * 
 * Logic:
 * - Day 1 starts at the first waypoint
 * - After each overnight stop, the day increments
 * - The overnight waypoint belongs to the day that ends there
 * - The next waypoint starts the new day
 * 
 * @param waypoints - Array of waypoints with optional isOvernightStop flag
 * @returns Waypoints with computed effectiveDayIndex
 */
export function deriveDaysFromOvernightStops<T extends WaypointForDayPlanning>(
  waypoints: T[]
): (T & { effectiveDayIndex: number })[] {
  if (!waypoints || waypoints.length === 0) {
    return [];
  }

  const result: (T & { effectiveDayIndex: number })[] = [];
  let currentDay = 1;

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    
    // This waypoint belongs to the current day
    result.push({
      ...wp,
      effectiveDayIndex: currentDay,
    });

    // If this is an overnight stop, increment day for the next waypoint
    if (wp.isOvernightStop && i < waypoints.length - 1) {
      currentDay++;
    }
  }

  return result;
}

/**
 * Computes per-day statistics from waypoints with derived day indices.
 * 
 * @param waypoints - Waypoints with effectiveDayIndex
 * @param totalDistanceMeters - Optional total route distance for proportional calculation
 * @param totalDurationSeconds - Optional total route duration for proportional calculation
 * @returns Array of day entries with distance and duration
 */
export function computeDailyPlanFromOvernightStops(
  waypoints: WaypointWithDerivedDay[],
  totalDistanceMeters?: number | null,
  totalDurationSeconds?: number | null
): { day: number; distanceKm: number; durationHours: number; waypointCount: number }[] {
  if (!waypoints || waypoints.length < 2) {
    return [];
  }

  const totalDistanceKm =
    (totalDistanceMeters ?? 0) > 0 ? (totalDistanceMeters as number) / 1000 : null;
  const totalDurationHrs =
    (totalDurationSeconds ?? 0) > 0 ? (totalDurationSeconds as number) / 3600 : null;

  // Group waypoints by day and compute straight-line distances
  const perDayDistance = new Map<number, number>();
  const perDayWaypointCount = new Map<number, number>();

  for (let i = 0; i < waypoints.length; i++) {
    const day = waypoints[i].effectiveDayIndex;
    perDayWaypointCount.set(day, (perDayWaypointCount.get(day) ?? 0) + 1);

    // Calculate distance to next waypoint (if exists and same day or transition)
    if (i < waypoints.length - 1) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const distanceKm = haversineKm(a, b);
      
      // Distance belongs to the day of the starting waypoint
      perDayDistance.set(day, (perDayDistance.get(day) ?? 0) + distanceKm);
    }
  }

  const maxDay = Math.max(...waypoints.map((wp) => wp.effectiveDayIndex), 1);
  const entries: { day: number; distanceKm: number; durationHours: number; waypointCount: number }[] = [];

  for (let day = 1; day <= maxDay; day++) {
    const distKm = perDayDistance.get(day) ?? 0;
    const waypointCount = perDayWaypointCount.get(day) ?? 0;
    
    let hours = 0;
    if (totalDistanceKm && totalDurationHrs && totalDistanceKm > 0) {
      const fraction = distKm / totalDistanceKm;
      hours = totalDurationHrs * fraction;
    }
    
    entries.push({
      day,
      distanceKm: distKm,
      durationHours: hours,
      waypointCount,
    });
  }

  return entries;
}

/**
 * Infers isOvernightStop from existing dayIndex values.
 * Used for backward compatibility with trips that have dayIndex but not isOvernightStop.
 * 
 * A waypoint is an overnight stop if:
 * - It's the last waypoint of its day (i.e., the next waypoint has a higher dayIndex)
 * - It's a LODGING or CAMPGROUND type
 * 
 * @param waypoints - Waypoints with dayIndex values
 * @returns Waypoints with isOvernightStop inferred
 */
export function inferOvernightStopsFromDayIndex<T extends WaypointForDayPlanning>(
  waypoints: T[]
): (T & { isOvernightStop: boolean })[] {
  if (!waypoints || waypoints.length === 0) {
    return [];
  }

  const result: (T & { isOvernightStop: boolean })[] = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const nextWp = waypoints[i + 1];
    
    // Infer overnight stop if:
    // 1. Already marked as overnight
    // 2. Day index changes at this point (this is last of its day)
    // 3. Is a lodging/campground type (and not the last waypoint)
    let isOvernight = wp.isOvernightStop === true;
    
    if (!isOvernight && nextWp) {
      const currentDay = wp.dayIndex ?? 1;
      const nextDay = nextWp.dayIndex ?? currentDay;
      
      if (nextDay > currentDay) {
        isOvernight = true;
      }
    }
    
    // Also mark lodging/campground as overnight (unless it's the last waypoint)
    if (!isOvernight && i < waypoints.length - 1) {
      const type = wp.type?.toUpperCase();
      if (type === 'LODGING' || type === 'CAMPGROUND') {
        isOvernight = true;
      }
    }
    
    result.push({
      ...wp,
      isOvernightStop: isOvernight,
    });
  }

  return result;
}

/**
 * Calculate haversine distance between two points in kilometers.
 */
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371; // km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}
