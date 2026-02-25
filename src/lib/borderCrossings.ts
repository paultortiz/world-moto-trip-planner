/**
 * Border crossing utilities for CBP wait times and document requirements.
 */

// CBP API response types
export interface CBPPort {
  port_number: string;
  border: string; // "Canadian Border" or "Mexican Border"
  port_name: string;
  crossing_name: string;
  hours: string;
  date: string;
  time: string;
  // Passenger vehicle data
  passenger_vehicle_lanes?: {
    standard_lanes?: CBPLaneData;
    ready_lanes?: CBPLaneData;
    NEXUS_SENTRI_lanes?: CBPLaneData;
  };
  // Pedestrian data
  pedestrian_lanes?: {
    standard_lanes?: CBPLaneData;
    ready_lanes?: CBPLaneData;
  };
  // Commercial data
  commercial_vehicle_lanes?: {
    standard_lanes?: CBPLaneData;
    FAST_lanes?: CBPLaneData;
  };
}

export interface CBPLaneData {
  lanes_open: string;
  delay_minutes: string;
  update_time: string;
  operational_status?: string;
  maximum_lanes?: string;
}

// Normalized port data for our app
export interface BorderPort {
  portNumber: string;
  portName: string;
  crossingName: string;
  border: "canada" | "mexico";
  hours: string;
  lastUpdated: string;
  // Coordinates (we'll need to maintain a lookup table)
  lat?: number;
  lng?: number;
  // Wait times
  passengerWaitMinutes: number | null;
  passengerLanesOpen: number;
  pedestrianWaitMinutes: number | null;
  pedestrianLanesOpen: number;
}

// Wait time severity levels
export type WaitTimeSeverity = "low" | "medium" | "high" | "unknown";

/**
 * Get severity level based on wait time in minutes.
 * - low: < 15 minutes (green)
 * - medium: 15-45 minutes (yellow)
 * - high: > 45 minutes (red)
 */
export function getWaitTimeSeverity(minutes: number | null): WaitTimeSeverity {
  if (minutes === null || minutes < 0) return "unknown";
  if (minutes < 15) return "low";
  if (minutes <= 45) return "medium";
  return "high";
}

/**
 * Get Tailwind color classes for wait time severity.
 */
export function getWaitTimeColorClasses(severity: WaitTimeSeverity): {
  bg: string;
  text: string;
  border: string;
} {
  switch (severity) {
    case "low":
      return {
        bg: "bg-green-500/20",
        text: "text-green-400",
        border: "border-green-500/50",
      };
    case "medium":
      return {
        bg: "bg-amber-500/20",
        text: "text-amber-400",
        border: "border-amber-500/50",
      };
    case "high":
      return {
        bg: "bg-red-500/20",
        text: "text-red-400",
        border: "border-red-500/50",
      };
    default:
      return {
        bg: "bg-slate-500/20",
        text: "text-slate-400",
        border: "border-slate-500/50",
      };
  }
}

/**
 * Haversine distance between two points in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Known CBP port coordinates.
 * This is a subset of major crossings - coordinates sourced from public data.
 * Port numbers match CBP API port_number field.
 */
export const CBP_PORT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // US-Mexico Border (West to East)
  "250401": { lat: 32.5423, lng: -117.0297 }, // San Ysidro
  "250601": { lat: 32.5515, lng: -116.9366 }, // Otay Mesa Passenger
  "250602": { lat: 32.5495, lng: -116.9322 }, // Otay Mesa Commercial
  "250301": { lat: 32.6714, lng: -115.4991 }, // Calexico East
  "250302": { lat: 32.6736, lng: -115.4986 }, // Calexico West
  "250201": { lat: 32.7207, lng: -114.7231 }, // Andrade
  "260801": { lat: 32.4872, lng: -114.7818 }, // San Luis I
  "260802": { lat: 32.4901, lng: -114.7649 }, // San Luis II
  "260401": { lat: 31.3398, lng: -110.9422 }, // Nogales Deconcini
  "260402": { lat: 31.3315, lng: -110.9557 }, // Nogales Mariposa
  "260101": { lat: 31.3390, lng: -109.5449 }, // Douglas
  "240201": { lat: 31.7587, lng: -106.4869 }, // El Paso Bridge of the Americas (BOTA)
  "240202": { lat: 31.7610, lng: -106.4867 }, // El Paso Paso Del Norte (PDN)
  "240203": { lat: 31.6931, lng: -106.3019 }, // El Paso Ysleta
  "240204": { lat: 31.7654, lng: -106.4553 }, // El Paso Stanton DCL
  "240301": { lat: 29.5610, lng: -104.4022 }, // Presidio
  "230201": { lat: 29.3708, lng: -100.9178 }, // Del Rio
  "230301": { lat: 28.7031, lng: -100.4628 }, // Eagle Pass Bridge I
  "230302": { lat: 28.7091, lng: -100.4995 }, // Eagle Pass Bridge II
  "230401": { lat: 27.5063, lng: -99.5067 }, // Laredo Bridge I
  "230402": { lat: 27.5063, lng: -99.5067 }, // Laredo Bridge II
  "230403": { lat: 27.4112, lng: -99.5939 }, // Laredo Colombia Solidarity
  "230404": { lat: 27.4984, lng: -99.5044 }, // Laredo World Trade Bridge
  "230501": { lat: 26.0978, lng: -98.2304 }, // Hidalgo
  "230502": { lat: 26.1943, lng: -98.1700 }, // Pharr
  "230901": { lat: 26.0730, lng: -97.9577 }, // Progreso International
  "535501": { lat: 25.9001, lng: -97.5016 }, // Brownsville B&M
  "535502": { lat: 25.8966, lng: -97.4836 }, // Brownsville Veterans
  "535504": { lat: 25.9017, lng: -97.4975 }, // Brownsville Gateway

  // US-Canada Border (West to East)
  "300401": { lat: 49.0021, lng: -122.7340 }, // Blaine Pacific Highway
  "300402": { lat: 49.0023, lng: -122.7564 }, // Blaine Peace Arch
  "300403": { lat: 48.9881, lng: -123.0582 }, // Blaine Point Roberts
  "300901": { lat: 49.0006, lng: -122.2651 }, // Sumas
  "302301": { lat: 48.9981, lng: -122.4579 }, // Lynden
  "331001": { lat: 48.9989, lng: -111.9561 }, // Sweetgrass
  "340101": { lat: 48.9987, lng: -97.2383 }, // Pembina
  "360401": { lat: 48.6011, lng: -93.4103 }, // International Falls
  "380301": { lat: 46.5436, lng: -84.3601 }, // Sault Ste. Marie
  "380201": { lat: 42.9988, lng: -82.4240 }, // Port Huron Bluewater Bridge
  "380001": { lat: 42.3110, lng: -83.0750 }, // Detroit Ambassador Bridge
  "380002": { lat: 42.3200, lng: -83.0400 }, // Detroit Windsor Tunnel
  "090101": { lat: 43.0865, lng: -79.0639 }, // Buffalo/Niagara Falls Peace Bridge
  "090102": { lat: 43.0926, lng: -79.0460 }, // Buffalo/Niagara Falls Rainbow Bridge
  "090103": { lat: 43.0926, lng: -79.0460 }, // Buffalo/Niagara Falls Whirlpool Bridge
  "090104": { lat: 43.1456, lng: -79.0398 }, // Buffalo/Niagara Falls Lewiston Bridge
  "070801": { lat: 44.3316, lng: -75.9091 }, // Alexandria Bay Thousand Islands Bridge
  "071201": { lat: 44.9860, lng: -73.4500 }, // Champlain
  "021201": { lat: 44.9766, lng: -73.1149 }, // Highgate Springs
  "020901": { lat: 45.0058, lng: -72.1086 }, // Derby Line I-91
  "011501": { lat: 45.1175, lng: -67.2792 }, // Calais Ferry Point
  "011503": { lat: 45.1811, lng: -67.2694 }, // Calais International Avenue
  "010601": { lat: 46.1261, lng: -67.8342 }, // Houlton
  "010401": { lat: 45.6304, lng: -70.2563 }, // Jackman
  "L01901": { lat: 47.3556, lng: -68.3317 }, // Madawaska
};

/**
 * Find the closest CBP port to given coordinates.
 * Returns null if no port within maxDistanceKm (default 50km).
 */
export function findClosestPort(
  lat: number,
  lng: number,
  ports: BorderPort[],
  maxDistanceKm: number = 50
): { port: BorderPort; distanceKm: number } | null {
  let closest: { port: BorderPort; distanceKm: number } | null = null;

  for (const port of ports) {
    // First check if we have coordinates for this port
    const coords = CBP_PORT_COORDINATES[port.portNumber];
    if (!coords) continue;

    const distance = haversineDistanceKm(lat, lng, coords.lat, coords.lng);
    if (distance <= maxDistanceKm) {
      if (!closest || distance < closest.distanceKm) {
        closest = { port, distanceKm: distance };
      }
    }
  }

  return closest;
}

/**
 * Parse a delay string from CBP API into number or null.
 */
function parseDelayMinutes(value: string | undefined): number | null {
  if (!value || value === "" || value === "N/A") return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

/**
 * Parse lanes open string from CBP API into number.
 */
function parseLanesOpen(value: string | undefined): number {
  if (!value || value === "" || value === "N/A") return 0;
  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse CBP API response into normalized BorderPort array.
 */
export function parseCBPResponse(data: CBPPort[]): BorderPort[] {
  return data.map((port) => {
    // Extract passenger vehicle wait time (most relevant for motorcycles)
    const passengerStandard = port.passenger_vehicle_lanes?.standard_lanes;
    const passengerReady = port.passenger_vehicle_lanes?.ready_lanes;

    // Use standard lanes wait time, fall back to ready lanes
    const passengerWaitStd = parseDelayMinutes(passengerStandard?.delay_minutes);
    const passengerWaitReady = parseDelayMinutes(passengerReady?.delay_minutes);
    const passengerWait = passengerWaitStd ?? passengerWaitReady;
    const passengerLanes =
      parseLanesOpen(passengerStandard?.lanes_open) + parseLanesOpen(passengerReady?.lanes_open);

    // Pedestrian data (useful if rider needs to walk across)
    const pedestrianStandard = port.pedestrian_lanes?.standard_lanes;
    const pedestrianReady = port.pedestrian_lanes?.ready_lanes;
    const pedestrianWaitStd = parseDelayMinutes(pedestrianStandard?.delay_minutes);
    const pedestrianWaitReady = parseDelayMinutes(pedestrianReady?.delay_minutes);
    const pedestrianWait = pedestrianWaitStd ?? pedestrianWaitReady;
    const pedestrianLanes =
      parseLanesOpen(pedestrianStandard?.lanes_open) + parseLanesOpen(pedestrianReady?.lanes_open);

    return {
      portNumber: port.port_number,
      portName: port.port_name,
      crossingName: port.crossing_name,
      border: port.border.toLowerCase().includes("canada") ? "canada" : "mexico",
      hours: port.hours,
      lastUpdated: `${port.date} ${port.time}`,
      passengerWaitMinutes: passengerWait,
      passengerLanesOpen: passengerLanes,
      pedestrianWaitMinutes: pedestrianWait,
      pedestrianLanesOpen: pedestrianLanes,
    };
  });
}

// Document requirement types
export interface BorderRequirement {
  category: "passport" | "visa" | "vehicle" | "insurance" | "health" | "customs" | "tips";
  title: string;
  description: string;
  required: boolean;
  countrySpecific?: string; // Which country this applies to
}

export interface BorderRequirementsResult {
  originCountry: string;
  destinationCountry: string;
  requirements: BorderRequirement[];
  generatedAt: string;
  warnings?: string[];
}
