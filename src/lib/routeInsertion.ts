/**
 * Utilities for smart waypoint insertion along a route.
 * 
 * When a user adds a new waypoint, these functions help determine the optimal
 * position in the route to minimize detour distance.
 */

export interface PointWithCoords {
  lat: number;
  lng: number;
}

/**
 * Calculate haversine distance between two points in kilometers.
 */
function haversineKm(a: PointWithCoords, b: PointWithCoords): number {
  const R = 6371; // Earth's radius in km
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

/**
 * Calculate the detour distance if a new point is inserted between two existing points.
 * Detour = dist(A, new) + dist(new, B) - dist(A, B)
 * A positive value means the route gets longer; lower is better.
 */
function calculateDetour(
  pointA: PointWithCoords,
  pointB: PointWithCoords,
  newPoint: PointWithCoords
): number {
  const originalDist = haversineKm(pointA, pointB);
  const newDist = haversineKm(pointA, newPoint) + haversineKm(newPoint, pointB);
  return newDist - originalDist;
}

/**
 * Find the optimal index to insert a new waypoint to minimize route detour.
 * 
 * @param waypoints - Current array of waypoints
 * @param newPoint - The new point to insert
 * @returns The index where the new waypoint should be inserted (0 = before first, length = after last)
 */
export function findOptimalInsertIndex(
  waypoints: PointWithCoords[],
  newPoint: PointWithCoords
): number {
  // Edge cases: empty or single waypoint - always append
  if (waypoints.length === 0) {
    return 0;
  }
  if (waypoints.length === 1) {
    return 1;
  }

  let bestIndex = waypoints.length; // Default: append to end
  let bestDetour = Infinity;

  // Check inserting before the first waypoint
  // "Detour" here is just the distance from new point to first waypoint
  // compared to starting from new point instead
  const distToFirst = haversineKm(newPoint, waypoints[0]);
  if (distToFirst < bestDetour) {
    bestDetour = distToFirst;
    bestIndex = 0;
  }

  // Check each segment between consecutive waypoints
  for (let i = 0; i < waypoints.length - 1; i++) {
    const pointA = waypoints[i];
    const pointB = waypoints[i + 1];
    const detour = calculateDetour(pointA, pointB, newPoint);

    if (detour < bestDetour) {
      bestDetour = detour;
      bestIndex = i + 1; // Insert after waypoint at index i
    }
  }

  // Check appending after the last waypoint
  // "Detour" here is just the distance from last waypoint to new point
  const distFromLast = haversineKm(waypoints[waypoints.length - 1], newPoint);
  if (distFromLast < bestDetour) {
    bestIndex = waypoints.length;
  }

  return bestIndex;
}

/**
 * Find the optimal index to insert a new waypoint, considering the route path
 * if available. This can provide more accurate results when the actual driving
 * route differs significantly from straight-line distances.
 * 
 * For now, this delegates to the waypoint-based calculation. In the future,
 * it could use the route polyline for more precise positioning.
 * 
 * @param waypoints - Current array of waypoints
 * @param newPoint - The new point to insert
 * @param routePath - Optional array of points representing the calculated route
 * @returns The index where the new waypoint should be inserted
 */
export function findOptimalInsertIndexWithRoute(
  waypoints: PointWithCoords[],
  newPoint: PointWithCoords,
  routePath?: PointWithCoords[] | null
): number {
  // If we have a route path, we could potentially use it for more accurate
  // insertion. For now, use the simpler waypoint-based calculation.
  // Future enhancement: find the closest point on the route polyline and
  // determine which segment it falls on.
  
  if (!routePath || routePath.length < 2) {
    return findOptimalInsertIndex(waypoints, newPoint);
  }

  // Use waypoint-based calculation
  // The route path could be used here for refinement in the future
  return findOptimalInsertIndex(waypoints, newPoint);
}

/**
 * Find the optimal index to insert a new waypoint within a specific day's bounds.
 * This constrains the search to only consider positions within the specified day.
 * 
 * @param waypoints - Current array of waypoints with day information
 * @param newPoint - The new point to insert
 * @param targetDay - The day number to constrain insertion to
 * @returns The index where the new waypoint should be inserted
 */
export function findOptimalInsertIndexForDay<T extends PointWithCoords & { dayIndex?: number | null; isOvernightStop?: boolean | null }>(
  waypoints: T[],
  newPoint: PointWithCoords,
  targetDay: number
): number {
  if (waypoints.length === 0) {
    return 0;
  }

  // Find the indices that belong to the target day
  // A waypoint belongs to day N if its dayIndex === N
  // The overnight stop at the end of day N has dayIndex === N and marks the end of the day
  const dayIndices: number[] = [];
  for (let i = 0; i < waypoints.length; i++) {
    const wpDay = waypoints[i].dayIndex ?? 1;
    if (wpDay === targetDay) {
      dayIndices.push(i);
    }
  }

  if (dayIndices.length === 0) {
    // No waypoints for this day, fall back to appending
    return waypoints.length;
  }

  if (dayIndices.length === 1) {
    // Only one waypoint in this day - insert after it (but check if overnight)
    const singleIdx = dayIndices[0];
    const wp = waypoints[singleIdx];
    // If it's an overnight stop, insert before it; otherwise after
    return wp.isOvernightStop ? singleIdx : singleIdx + 1;
  }

  // Find the best position within this day's segments
  let bestIndex = dayIndices[dayIndices.length - 1] + 1; // Default: after last waypoint of day
  let bestDetour = Infinity;

  // Check each segment between consecutive waypoints within this day
  for (let i = 0; i < dayIndices.length - 1; i++) {
    const idxA = dayIndices[i];
    const idxB = dayIndices[i + 1];
    const pointA = waypoints[idxA];
    const pointB = waypoints[idxB];
    
    const originalDist = haversineKm(pointA, pointB);
    const newDist = haversineKm(pointA, newPoint) + haversineKm(newPoint, pointB);
    const detour = newDist - originalDist;

    if (detour < bestDetour) {
      bestDetour = detour;
      bestIndex = idxA + 1; // Insert after waypoint at idxA
    }
  }

  // Check inserting before the first waypoint of this day
  // (only if it's not the trip start)
  if (dayIndices[0] > 0) {
    const distToFirst = haversineKm(newPoint, waypoints[dayIndices[0]]);
    if (distToFirst < bestDetour) {
      bestDetour = distToFirst;
      bestIndex = dayIndices[0];
    }
  }

  // Check appending after the last non-overnight waypoint of this day
  const lastDayIdx = dayIndices[dayIndices.length - 1];
  const lastWp = waypoints[lastDayIdx];
  
  if (!lastWp.isOvernightStop) {
    const distFromLast = haversineKm(lastWp, newPoint);
    if (distFromLast < bestDetour) {
      bestIndex = lastDayIdx + 1;
    }
  } else {
    // Last waypoint is overnight - ensure we don't insert after it
    // If best index would be after the overnight stop, put it before instead
    if (bestIndex > lastDayIdx) {
      bestIndex = lastDayIdx;
    }
  }

  return bestIndex;
}

/**
 * Determine the day index for a newly inserted waypoint based on its position.
 * The day is inherited from the waypoint before the insertion point, or Day 1
 * if inserting at the beginning.
 * 
 * @param waypoints - Current waypoints with day information
 * @param insertIndex - Where the new waypoint will be inserted
 * @returns The day index for the new waypoint
 */
export function getDayIndexForInsertPosition<T extends PointWithCoords & { dayIndex?: number | null }>(
  waypoints: T[],
  insertIndex: number
): number {
  if (waypoints.length === 0 || insertIndex === 0) {
    return 1;
  }

  // Get the waypoint before the insertion point
  const prevWaypoint = waypoints[Math.min(insertIndex - 1, waypoints.length - 1)];
  return typeof prevWaypoint.dayIndex === "number" && prevWaypoint.dayIndex >= 1
    ? prevWaypoint.dayIndex
    : 1;
}
