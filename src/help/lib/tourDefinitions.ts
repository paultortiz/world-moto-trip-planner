import type { Tour } from "../types";

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
export const newUserTour: Tour = {
  id: "new-user",
  name: "tours.newUser",
  description: "tours.newUserDesc",
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
 * Trip Planning Tour - How to plan a trip
 * Best triggered from the trip detail page
 */
export const tripPlanningTour: Tour = {
  id: "trip-planning",
  name: "tours.tripPlanning",
  description: "tours.tripPlanningDesc",
  steps: [
    {
      id: "map-overview",
      targetSelector: "#trip-map-container",
      title: "tourSteps.tripPlanning.map.title",
      content: "tourSteps.tripPlanning.map.content",
      placement: "left",
      highlightPadding: 0,
    },
    {
      id: "waypoint-editor",
      targetSelector: "#waypoint-editor-section",
      title: "tourSteps.tripPlanning.waypoints.title",
      content: "tourSteps.tripPlanning.waypoints.content",
      placement: "top",
      highlightPadding: 8,
    },
    {
      id: "ai-daily-plan",
      targetSelector: "[aria-label*='AI-generated'], [aria-label*='daily']",
      title: "tourSteps.tripPlanning.aiPlan.title",
      content: "tourSteps.tripPlanning.aiPlan.content",
      placement: "top",
      highlightPadding: 8,
    },
  ],
};

/**
 * Map Features Tour - How to use the map
 * Best triggered from any page with the map visible
 */
export const mapFeaturesTour: Tour = {
  id: "map-features",
  name: "tours.mapFeatures",
  description: "tours.mapFeaturesDesc",
  steps: [
    {
      id: "map-search",
      targetSelector: "[placeholder*='Search'], input[type='text'][class*='map']",
      title: "tourSteps.mapFeatures.search.title",
      content: "tourSteps.mapFeatures.search.content",
      placement: "bottom",
      highlightPadding: 8,
    },
    {
      id: "map-measure",
      targetSelector: "[aria-label*='Measure'], button[title*='Measure']",
      title: "tourSteps.mapFeatures.measure.title",
      content: "tourSteps.mapFeatures.measure.content",
      placement: "left",
      highlightPadding: 8,
    },
    {
      id: "map-fullscreen",
      targetSelector: "[aria-label*='Fullscreen'], button[title*='Fullscreen']",
      title: "tourSteps.mapFeatures.fullscreen.title",
      content: "tourSteps.mapFeatures.fullscreen.content",
      placement: "left",
      highlightPadding: 8,
    },
  ],
};

/**
 * All available tours
 */
export const tours: Tour[] = [
  newUserTour,
  tripPlanningTour,
  mapFeaturesTour,
];

/**
 * Get a tour by ID
 */
export function getTour(id: string): Tour | undefined {
  return tours.find((t) => t.id === id);
}

/**
 * Get all tours
 */
export function getAllTours(): Tour[] {
  return tours;
}
