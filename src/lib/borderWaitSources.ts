/**
 * Border wait time data source registry.
 *
 * Maps (fromCountry, toCountry) pairs to the appropriate real-time data source.
 * This decouples the wait-times API from any single provider (CBP, CBSA, etc.)
 * and makes it easy to add new sources in the future.
 */

export type WaitTimeSourceType = "cbp" | "cbsa" | "ai-estimate" | "unavailable";

export interface WaitTimeSource {
  /** Which data source to query */
  type: WaitTimeSourceType;
  /** Human-readable source label (e.g., "US CBP") */
  sourceLabel: string;
  /** Direction label (e.g., "Entering United States") */
  directionLabel: string;
  /** Country being entered (ISO 3166-1 alpha-2) */
  enteringCountry: string;
  /** Whether this source provides real-time live data */
  isLive: boolean;
}

/**
 * Country name lookup for common codes used in direction labels.
 * Falls back to the code itself for unknown countries.
 */
const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  MX: "Mexico",
  GT: "Guatemala",
  BZ: "Belize",
  HN: "Honduras",
  SV: "El Salvador",
  NI: "Nicaragua",
  CR: "Costa Rica",
  PA: "Panama",
  CO: "Colombia",
  EC: "Ecuador",
  PE: "Peru",
  BO: "Bolivia",
  CL: "Chile",
  AR: "Argentina",
  BR: "Brazil",
  UY: "Uruguay",
  PY: "Paraguay",
  GB: "United Kingdom",
  FR: "France",
  DE: "Germany",
  ES: "Spain",
  PT: "Portugal",
  IT: "Italy",
  CH: "Switzerland",
  AT: "Austria",
  NL: "Netherlands",
  BE: "Belgium",
  PL: "Poland",
  CZ: "Czech Republic",
  SK: "Slovakia",
  HU: "Hungary",
  RO: "Romania",
  BG: "Bulgaria",
  HR: "Croatia",
  SI: "Slovenia",
  GR: "Greece",
  TR: "Turkey",
  MA: "Morocco",
  DZ: "Algeria",
  TN: "Tunisia",
  EG: "Egypt",
  ZA: "South Africa",
  NA: "Namibia",
  BW: "Botswana",
  MZ: "Mozambique",
  TZ: "Tanzania",
  KE: "Kenya",
  ET: "Ethiopia",
  TH: "Thailand",
  VN: "Vietnam",
  KH: "Cambodia",
  LA: "Laos",
  MM: "Myanmar",
  MY: "Malaysia",
  SG: "Singapore",
  ID: "Indonesia",
  IN: "India",
  NP: "Nepal",
  PK: "Pakistan",
  CN: "China",
  MN: "Mongolia",
  RU: "Russia",
  KZ: "Kazakhstan",
  UZ: "Uzbekistan",
  KG: "Kyrgyzstan",
  TJ: "Tajikistan",
  AU: "Australia",
  NZ: "New Zealand",
  JP: "Japan",
  KR: "South Korea",
  NO: "Norway",
  SE: "Sweden",
  FI: "Finland",
  DK: "Denmark",
  IS: "Iceland",
  IE: "Ireland",
};

/**
 * Get a human-readable country name from an ISO 3166-1 alpha-2 code.
 */
export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}

/**
 * Determine the appropriate wait time data source for a border crossing direction.
 *
 * @param fromCountry ISO 3166-1 alpha-2 code of the country being departed
 * @param toCountry   ISO 3166-1 alpha-2 code of the country being entered
 */
export function getWaitTimeSource(fromCountry: string, toCountry: string): WaitTimeSource {
  const from = fromCountry.toUpperCase();
  const to = toCountry.toUpperCase();
  const enteringName = getCountryName(to);

  // Entering the US from Canada or Mexico → CBP API
  if (to === "US" && (from === "CA" || from === "MX")) {
    return {
      type: "cbp",
      sourceLabel: "US CBP",
      directionLabel: `Entering ${enteringName}`,
      enteringCountry: to,
      isLive: true,
    };
  }

  // Entering Canada from the US → CBSA CSV
  if (to === "CA" && from === "US") {
    return {
      type: "cbsa",
      sourceLabel: "Canada CBSA",
      directionLabel: `Entering ${enteringName}`,
      enteringCountry: to,
      isLive: true,
    };
  }

  // All other crossings — no known live data source
  return {
    type: "unavailable",
    sourceLabel: "",
    directionLabel: `Entering ${enteringName}`,
    enteringCountry: to,
    isLive: false,
  };
}

/**
 * Check whether any live data source exists for a given country pair.
 */
export function hasLiveSource(fromCountry: string, toCountry: string): boolean {
  return getWaitTimeSource(fromCountry, toCountry).isLive;
}
