export type WaypointType =
  | "FUEL"
  | "LODGING"
  | "CAMPGROUND"
  | "DINING"
  | "POI"
  | "CHECKPOINT"
  | "OTHER";

export interface Waypoint {
  id: string;
  tripId: string;
  orderIndex: number;
  lat: number;
  lng: number;
  name?: string;
  type: WaypointType;
  notes?: string;
  googlePlaceId?: string | null;
}

export interface RouteSegment {
  id: string;
  tripId: string;
  startWaypointId?: string;
  endWaypointId?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  polyline?: string;
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  totalDistanceMeters?: number;
  totalDurationSeconds?: number;
  waypoints?: Waypoint[];
  routeSegments?: RouteSegment[];
}
