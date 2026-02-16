import type { Tour } from "../types";

// Extended tour type with context paths
export interface TourWithContext extends Tour {
  /** URL path patterns where this tour should be available. Empty = always available */
  contextPaths?: string[];
}

/**
 * Tour definitions for guided walkthroughs.
 * 
 * Each tour targets specific UI elements by CSS selector.
 * Tour step titles and content are i18n keys that resolve to translations.
 */

/**
 * New User Tour - Introduction to the app
 * Shown on first visit or triggered from Help drawer
 */
export const newUserTour: TourWithContext = {
  id: "new-user",
  name: "tours.newUser",
  description: "tours.newUserDesc",
  // No contextPaths = always available
  steps: [
    {
      id: "welcome",
      targetSelector: "[data-tour-welcome]", // Won't match - centers the card
      title: "tourSteps.newUser.welcome.title",
      content: "tourSteps.newUser.welcome.content",
      placement: "bottom",
      highlightPadding: 0,
    },
    {
      id: "nav-trips",
      targetSelector: "header nav a[href='/trips']",
      title: "tourSteps.newUser.trips.title",
      content: "tourSteps.newUser.trips.content",
      placement: "bottom",
      highlightPadding: 8,
    },
    {
      id: "nav-new-trip",
      targetSelector: "header nav a[href='/trips/new']",
      title: "tourSteps.newUser.newTrip.title",
      content: "tourSteps.newUser.newTrip.content",
      placement: "bottom",
      highlightPadding: 8,
    },
    {
      id: "nav-garage",
      targetSelector: "header nav a[href='/motorcycles']",
      title: "tourSteps.newUser.garage.title",
      content: "tourSteps.newUser.garage.content",
      placement: "bottom",
      highlightPadding: 8,
    },
    {
      id: "nav-profile",
      targetSelector: "header nav a[href='/profile']",
      title: "tourSteps.newUser.profile.title",
      content: "tourSteps.newUser.profile.content",
      placement: "bottom",
      highlightPadding: 8,
    },
    {
      id: "help-button",
      targetSelector: "[data-tour-help-button]", // Will add this attribute to HelpButton
      title: "tourSteps.newUser.help.title",
      content: "tourSteps.newUser.help.content",
      placement: "top",
      highlightPadding: 8,
    },
  ],
};

/**
 * Trip Planning Tour - Comprehensive guide to planning a trip
 * Flows top-to-bottom through left column, then right column
 */
export const tripPlanningTour: TourWithContext = {
  id: "trip-planning",
  name: "tours.tripPlanning",
  description: "tours.tripPlanningDesc",
  contextPaths: ["/trips/"], // Only on trip detail pages
  steps: [
    // 1. Trip dates (header area)
    {
      id: "trip-dates",
      targetSelector: "[data-tour-trip-dates]",
      title: "tourSteps.tripPlanning.dates.title",
      content: "tourSteps.tripPlanning.dates.content",
      placement: "bottom",
      highlightPadding: 8,
    },
    // 2. Map overview (left column)
    {
      id: "map-overview",
      targetSelector: "#trip-map-container",
      title: "tourSteps.tripPlanning.map.title",
      content: "tourSteps.tripPlanning.map.content",
      placement: "left",
      highlightPadding: 0,
    },
    // 3. Search for places
    {
      id: "map-search",
      targetSelector: "#trip-map-container input[placeholder]",
      title: "tourSteps.tripPlanning.search.title",
      content: "tourSteps.tripPlanning.search.content",
      placement: "bottom",
      highlightPadding: 8,
    },
    // 4. Click to add waypoints
    {
      id: "click-to-add",
      targetSelector: "label:has(input[type='checkbox']):has(span.text-amber-300)",
      title: "tourSteps.tripPlanning.clickToAdd.title",
      content: "tourSteps.tripPlanning.clickToAdd.content",
      placement: "bottom",
      highlightPadding: 8,
    },
    // 5. Nearby places filtering
    {
      id: "nearby-places",
      targetSelector: "[data-tour-nearby-filters]",
      title: "tourSteps.tripPlanning.nearbyPlaces.title",
      content: "tourSteps.tripPlanning.nearbyPlaces.content",
      placement: "bottom",
      highlightPadding: 8,
    },
    // 6. Map tools (measure, fit route, fullscreen)
    {
      id: "map-tools",
      targetSelector: "[data-tour-map-tools]",
      title: "tourSteps.tripPlanning.mapTools.title",
      content: "tourSteps.tripPlanning.mapTools.content",
      placement: "left",
      highlightPadding: 8,
    },
    // 7. Elevation profile and route stats
    {
      id: "elevation-profile",
      targetSelector: "[data-tour-elevation-section]",
      title: "tourSteps.tripPlanning.elevation.title",
      content: "tourSteps.tripPlanning.elevation.content",
      placement: "top",
      highlightPadding: 8,
    },
    // 8. Daily plan summary
    {
      id: "daily-plan",
      targetSelector: "[data-tour-daily-plan]",
      title: "tourSteps.tripPlanning.dailyPlan.title",
      content: "tourSteps.tripPlanning.dailyPlan.content",
      placement: "top",
      highlightPadding: 8,
    },
    // 9. Export options
    {
      id: "export-options",
      targetSelector: "[data-tour-export]",
      title: "tourSteps.tripPlanning.export.title",
      content: "tourSteps.tripPlanning.export.content",
      placement: "top",
      highlightPadding: 8,
    },
    // 10. Trip sharing (right column)
    {
      id: "trip-sharing",
      targetSelector: "section[aria-label*='sharing'], section[aria-label*='Sharing']",
      title: "tourSteps.tripPlanning.sharing.title",
      content: "tourSteps.tripPlanning.sharing.content",
      placement: "left",
      highlightPadding: 8,
    },
    // 11. Waypoint editor
    {
      id: "waypoint-editor",
      targetSelector: "#waypoint-editor-section",
      title: "tourSteps.tripPlanning.waypoints.title",
      content: "tourSteps.tripPlanning.waypoints.content",
      placement: "top",
      highlightPadding: 8,
    },
    // 12. AI daily plan
    {
      id: "ai-daily-plan",
      targetSelector: "section[aria-label*='AI-generated'], section[aria-label*='AI']",
      title: "tourSteps.tripPlanning.aiPlan.title",
      content: "tourSteps.tripPlanning.aiPlan.content",
      placement: "top",
      highlightPadding: 8,
    },
    // 13. Motorcycle for this trip
    {
      id: "motorcycle",
      targetSelector: "[data-tour-motorcycle]",
      title: "tourSteps.tripPlanning.motorcycle.title",
      content: "tourSteps.tripPlanning.motorcycle.content",
      placement: "top",
      highlightPadding: 8,
    },
    // 14. Fuel settings and plan
    {
      id: "fuel",
      targetSelector: "[data-tour-fuel]",
      title: "tourSteps.tripPlanning.fuel.title",
      content: "tourSteps.tripPlanning.fuel.content",
      placement: "top",
      highlightPadding: 8,
    },
    // 15. Schedule settings and daily schedule
    {
      id: "schedule",
      targetSelector: "[data-tour-schedule]",
      title: "tourSteps.tripPlanning.schedule.title",
      content: "tourSteps.tripPlanning.schedule.content",
      placement: "top",
      highlightPadding: 8,
    },
    // 16. Pre-ride checklist
    {
      id: "checklist",
      targetSelector: "[data-tour-checklist]",
      title: "tourSteps.tripPlanning.checklist.title",
      content: "tourSteps.tripPlanning.checklist.content",
      placement: "top",
      highlightPadding: 8,
    },
  ],
};

/**
 * All available tours
 */
export const tours: TourWithContext[] = [
  newUserTour,
  tripPlanningTour,
];

/**
 * Get a tour by ID
 */
export function getTour(id: string): TourWithContext | undefined {
  return tours.find((t) => t.id === id);
}

/**
 * Get all tours
 */
export function getAllTours(): TourWithContext[] {
  return tours;
}

/**
 * Get tours available for a given path
 */
export function getToursForPath(pathname: string): TourWithContext[] {
  return tours.filter((tour) => {
    // If no contextPaths specified, tour is always available
    if (!tour.contextPaths || tour.contextPaths.length === 0) {
      return true;
    }
    // Check if current path matches any of the tour's context paths
    return tour.contextPaths.some((contextPath) => {
      // For trip detail pages, match /trips/[id] but not /trips/new or /trips
      if (contextPath === "/trips/") {
        // Must have something after /trips/ that's not "new"
        const match = pathname.match(/^\/trips\/([^/]+)/);
        return match !== null && match[1] !== "new";
      }
      return pathname.includes(contextPath);
    });
  });
}
