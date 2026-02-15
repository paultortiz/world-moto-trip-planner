import type { HelpArticle } from "../types";
import { getArticleMeta } from "./articles";

// Article content stored as plain strings (could be migrated to MDX later)
// Using a record allows for lazy loading and locale support
type ArticleContent = Record<string, string>;

const articleContent: Record<string, ArticleContent> = {
  "getting-started": {
    en: `## Welcome to World Moto Trip Planner

Planning a cross-continent motorcycle adventure? You're in the right place. This guide will help you get started with the basics.

### What You Can Do

- **Plan routes** across multiple days with waypoints for fuel, lodging, and points of interest
- **Track your motorcycle's** fuel range to plan smart fuel stops
- **Generate AI daily plans** that account for your riding style and preferences
- **Export trip details** for offline reference

### Quick Start

1. **Sign in** with your Google account
2. **Create a trip** from the Trips page
3. **Add waypoints** by clicking on the map or searching for locations
4. **Generate an AI plan** to get day-by-day riding suggestions

### Keyboard Shortcuts

- **?** — Open this help panel
- **Escape** — Close panels and dialogs

### Need More Help?

Browse the topics on the left, or use the search bar to find specific answers.`,

    es: `## Bienvenido a World Moto Trip Planner

¿Planeas una aventura en moto por varios continentes? Estás en el lugar correcto. Esta guía te ayudará a comenzar con lo básico.

### Lo Que Puedes Hacer

- **Planificar rutas** de varios días con paradas para combustible, alojamiento y puntos de interés
- **Registrar el alcance** de tu moto para planificar paradas de combustible inteligentes
- **Generar planes diarios con IA** que consideren tu estilo de conducción y preferencias
- **Exportar detalles del viaje** para referencia sin conexión

### Inicio Rápido

1. **Inicia sesión** con tu cuenta de Google
2. **Crea un viaje** desde la página de Viajes
3. **Añade puntos de referencia** haciendo clic en el mapa o buscando ubicaciones
4. **Genera un plan con IA** para obtener sugerencias día a día`,
  },

  "creating-trips": {
    en: `## Creating & Managing Trips

Every adventure starts with a trip. Here's how to create and manage your trip plans.

### Creating a New Trip

1. Click **"New Trip"** in the navigation bar
2. Enter a **trip name** (required)
3. Add an optional **description** to remember the purpose
4. Select a **start date** if you have one planned
5. Choose a **motorcycle** from your garage (optional but recommended for fuel planning)
6. Click **"Create Trip"**

### Trip Details Page

Once created, you'll be taken to the trip editor where you can:

- **Add waypoints** to your route
- **Reorder waypoints** by dragging them in the list
- **Set day assignments** for multi-day trips
- **View distance and time estimates** as you build your route
- **Generate an AI daily plan** for detailed itinerary suggestions

### Editing Trip Info

Click the trip name or description to edit them inline. Changes save automatically.

### Deleting a Trip

From the Trips list, each trip card has a delete option. This action cannot be undone.`,
  },

  "waypoints": {
    en: `## Working with Waypoints

Waypoints are the building blocks of your route. They mark where you want to go and what you want to do there.

### Waypoint Types

- **Start** — Your departure point
- **End** — Your final destination
- **Fuel** — Gas stations and fuel stops
- **Lodging** — Hotels, motels, hostels
- **Campground** — Camping spots
- **Dining** — Restaurants and food stops
- **POI** — Points of interest, viewpoints, attractions
- **Via** — Pass-through points to shape your route

### Adding Waypoints

**From the map:**
- Click anywhere on the map to add a waypoint at that location
- Use the search box to find a specific place

**From nearby places:**
- Enable "Show nearby places" to see fuel, lodging, and dining options
- Click a place marker, then confirm to add it as a waypoint

### Reordering Waypoints

Drag and drop waypoints in the sidebar list to change the route order.

### Day Assignments

For multi-day trips, assign waypoints to specific days. The AI daily plan will use these assignments when generating your itinerary.`,
  },

  "ai-daily-plan": {
    en: `## AI Daily Plan

Let AI generate a detailed day-by-day itinerary based on your route and preferences.

### What the AI Generates

For each day of your trip, the AI provides:

- **Route summary** — Start and end points, total distance and time
- **Terrain breakdown** — Percentage of paved, gravel, and dirt roads
- **Elevation profile** — Climb, descent, and maximum altitude
- **Scenic & difficulty ratings** — 5-star scale
- **Best time to ride** — Weather and traffic considerations
- **Highlights** — Must-see attractions along the way
- **Local tips** — Insider knowledge from experienced travelers
- **Photo opportunities** — Best spots for pictures
- **Water crossings** — River fords and stream crossings (if any)
- **Alternate routes** — Options for bad weather or different skill levels
- **Emergency info** — Nearest hospitals, fuel gaps, cell coverage

### Generating a Plan

1. Create a trip with at least a few waypoints
2. Scroll to the **AI Daily Plan** section
3. Click **"Generate AI Daily Plan"**
4. Wait for the AI to analyze your route (usually 10-30 seconds)

### Personalizing Recommendations

The AI uses your **Profile Preferences** to customize suggestions:

- **Riding style** — Touring, adventure, off-road, sport touring
- **Pace preference** — Relaxed, moderate, aggressive
- **Terrain preference** — Pavement only, mixed, off-road focused
- **Experience level** — Beginner to expert
- **Interests** — Scenic routes, local cuisine, photography, etc.

Set these in your Profile for better recommendations.`,
  },

  "profile-preferences": {
    en: `## Profile & Preferences

Your profile settings help the AI personalize trip recommendations to your riding style.

### Riding Style

Choose the type of riding you prefer:

- **Touring** — Long-distance highway riding, comfort-focused
- **Adventure** — Mix of on and off-road, versatile
- **Off-road** — Dirt, gravel, and trails
- **Sport Touring** — Fast-paced road riding

### Experience Level

Be honest about your skill level for appropriate route suggestions:

- **Beginner** — New to motorcycling or adventure riding
- **Intermediate** — Comfortable with varied conditions
- **Advanced** — Experienced in challenging terrain
- **Expert** — Highly skilled, seeks difficult routes

### Pace Preference

How do you like to ride?

- **Relaxed** — Frequent stops, short daily distances
- **Moderate** — Balanced riding and rest
- **Aggressive** — Maximum miles, minimal stops

### Terrain Preference

What surfaces do you prefer?

- **Pavement only** — Stick to paved roads
- **Mixed** — Comfortable with some gravel and dirt
- **Off-road focused** — Prefer unpaved routes

### Interests

Select what you enjoy discovering on trips:

- Scenic routes, local cuisine, historic sites, photography, camping, twisty roads, wildlife, beaches, mountains, deserts

### Other Preferences

- **Avoid highways** — Prefer back roads over motorways
- **Prefer camping** — Suggest campgrounds over hotels
- **Dietary restrictions** — Noted for restaurant suggestions`,
  },

  "map-features": {
    en: `## Map Features

The trip planner map has several tools to help you plan your route.

### Search

Use the search box in the top-left corner to find any location. Click a result to center the map there, then click the map to add a waypoint.

### Nearby Places

Toggle "Show nearby" to display:

- **Fuel stations** — Plan your fuel stops
- **Lodging** — Hotels and accommodations
- **Campgrounds** — Camping options
- **Dining** — Restaurants and cafes

Click any marker to see details, then add it as a waypoint.

### Measure Tool

Click the **📏 Measure** button to measure distances:

1. Click your starting point on the map
2. Click your destination
3. See the road distance and estimated time
4. Multiple route options are shown when available

Press Escape or click the button again to exit measure mode.

### Fullscreen

Click the fullscreen button to expand the map. Nearby places controls appear in fullscreen mode.

### Fit to Route

Click **"Fit route"** to zoom the map to show your entire route.`,
  },

  "garage": {
    en: `## Managing Your Garage

Your garage stores information about your motorcycles for use in trip planning.

### Adding a Motorcycle

1. Go to the **Garage** page from the navigation
2. Enter the **year**, **make**, and **model**
3. Click **"Add motorcycle"**
4. The AI will attempt to fetch specifications automatically

### Motorcycle Specs

The AI can retrieve specs including:

- Engine displacement, type, and power
- Fuel capacity and estimated range
- Weight and dimensions
- Suspension and brake details
- Features like ABS, cruise control, etc.

### Setting a Default

Click **"Set as default"** on any motorcycle to use it automatically for new trips. This helps with fuel planning calculations.

### Why It Matters

When you associate a motorcycle with a trip:

- **Fuel range** is used to suggest appropriate fuel stops
- **AI recommendations** consider your bike's capabilities
- **Trip estimates** account for typical riding speeds

### Editing Specs

If the AI-fetched specs are incorrect, you can manually edit the preferred range and reserve values.`,
  },
};

/**
 * Load article content for a given article ID and locale.
 * Falls back to English if the locale-specific content is not available.
 */
export async function loadArticleContent(
  articleId: string,
  locale: string = "en"
): Promise<HelpArticle | null> {
  const meta = getArticleMeta(articleId);
  if (!meta) {
    return null;
  }

  const contentByLocale = articleContent[articleId];
  if (!contentByLocale) {
    return null;
  }

  // Try requested locale, fall back to English
  const content = contentByLocale[locale] ?? contentByLocale["en"];
  if (!content) {
    return null;
  }

  return {
    ...meta,
    content,
  };
}

/**
 * Get all available article IDs
 */
export function getArticleIds(): string[] {
  return Object.keys(articleContent);
}
