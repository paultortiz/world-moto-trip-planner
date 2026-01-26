import type { Trip, RouteSegment } from "./models";

export function computeTripTotals(segments: RouteSegment[]): Pick<
  Trip,
  "totalDistanceMeters" | "totalDurationSeconds"
> {
  const totalDistanceMeters = segments.reduce(
    (sum, s) => sum + (s.distanceMeters ?? 0),
    0,
  );
  const totalDurationSeconds = segments.reduce(
    (sum, s) => sum + (s.durationSeconds ?? 0),
    0,
  );

  return { totalDistanceMeters, totalDurationSeconds };
}
