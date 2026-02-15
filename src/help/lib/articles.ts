import type { HelpArticleMeta, HelpCategory } from "../types";

/**
 * Registry of all help articles with metadata.
 * Content is loaded separately to enable lazy loading.
 */
export const helpArticles: HelpArticleMeta[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of planning your motorcycle adventure",
    keywords: ["start", "begin", "intro", "basics", "new", "first"],
    category: "getting-started",
    relatedArticles: ["creating-trips", "waypoints"],
  },
  {
    id: "creating-trips",
    title: "Creating & Managing Trips",
    description: "How to create, edit, and organize your trip plans",
    keywords: ["trip", "create", "new", "plan", "route", "manage", "delete"],
    category: "trips",
    relatedArticles: ["waypoints", "ai-daily-plan"],
  },
  {
    id: "waypoints",
    title: "Working with Waypoints",
    description: "Add fuel stops, lodging, points of interest, and more",
    keywords: ["waypoint", "stop", "fuel", "gas", "lodging", "hotel", "camping", "poi", "marker"],
    category: "map",
    relatedArticles: ["creating-trips", "nearby-places"],
  },
  {
    id: "ai-daily-plan",
    title: "AI Daily Plan",
    description: "Let AI generate a detailed day-by-day riding itinerary",
    keywords: ["ai", "daily", "plan", "itinerary", "generate", "automatic", "smart"],
    category: "ai-features",
    relatedArticles: ["profile-preferences", "creating-trips"],
  },
  {
    id: "profile-preferences",
    title: "Profile & Preferences",
    description: "Customize your riding style, pace, and interests for personalized AI recommendations",
    keywords: ["profile", "preferences", "settings", "riding", "style", "pace", "terrain", "experience"],
    category: "profile",
    relatedArticles: ["ai-daily-plan"],
  },
  {
    id: "map-features",
    title: "Map Features",
    description: "Search, measure distances, find nearby places, and navigate the map",
    keywords: ["map", "search", "measure", "distance", "nearby", "places", "fullscreen"],
    category: "map",
    relatedArticles: ["waypoints"],
  },
  {
    id: "garage",
    title: "Managing Your Garage",
    description: "Add motorcycles, track specs, and set defaults for trip planning",
    keywords: ["garage", "motorcycle", "bike", "specs", "fuel", "range"],
    category: "garage",
    relatedArticles: ["creating-trips"],
  },
];

/**
 * Get articles grouped by category
 */
export function getArticlesByCategory(): Record<HelpCategory, HelpArticleMeta[]> {
  const grouped: Record<HelpCategory, HelpArticleMeta[]> = {
    "getting-started": [],
    trips: [],
    map: [],
    "ai-features": [],
    profile: [],
    garage: [],
  };

  for (const article of helpArticles) {
    grouped[article.category].push(article);
  }

  return grouped;
}

/**
 * Get article metadata by ID
 */
export function getArticleMeta(id: string): HelpArticleMeta | undefined {
  return helpArticles.find((a) => a.id === id);
}

/**
 * Search articles by query (searches title, description, keywords)
 */
export function searchArticles(query: string): HelpArticleMeta[] {
  if (!query.trim()) {
    return helpArticles;
  }

  const lowerQuery = query.toLowerCase();
  const terms = lowerQuery.split(/\s+/).filter(Boolean);

  return helpArticles.filter((article) => {
    const searchText = [
      article.title,
      article.description,
      ...article.keywords,
    ]
      .join(" ")
      .toLowerCase();

    return terms.every((term) => searchText.includes(term));
  });
}

/**
 * Category display names (for i18n, these should come from translations)
 */
export const categoryOrder: HelpCategory[] = [
  "getting-started",
  "trips",
  "map",
  "ai-features",
  "profile",
  "garage",
];
