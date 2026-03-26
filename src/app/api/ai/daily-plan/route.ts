import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { auth } from "@/auth";
import { logActivityAsync, ActivityActions } from "@/lib/activity";
import {
  deriveDaysFromOvernightStops,
  inferOvernightStopsFromDayIndex,
} from "@/lib/dayPlanning";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const body = await req.json();
    const { tripId, locale, stream: useStreaming } = body as {
      tripId?: string;
      locale?: string;
      stream?: boolean;
    };

    if (!tripId || typeof tripId !== "string") {
      return NextResponse.json({ error: "tripId is required" }, { status: 400 });
    }

    if (!openai) {
      return NextResponse.json(
        { error: "AI is not configured. Set OPENAI_API_KEY on the server." },
        { status: 500 },
      );
    }

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
      include: {
        waypoints: { orderBy: { orderIndex: "asc" } },
        routeSegments: true,
        motorcycle: true,
        user: {
          select: {
            ridingStyle: true,
            pacePreference: true,
            terrainPreference: true,
            experienceLevel: true,
            dailyDistanceKm: true,
            interests: true,
            avoidHighways: true,
            preferCamping: true,
            dietaryRestrictions: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const rawWaypoints = trip.waypoints.map((wp, index) => ({
      index,
      name: wp.name ?? null,
      type: wp.type,
      lat: wp.lat,
      lng: wp.lng,
      dayIndex: wp.dayIndex ?? null,
      isOvernightStop: wp.isOvernightStop ?? null,
    }));

    // Derive effective day indices using the same logic as the waypoint editor.
    const hasOvernightData = rawWaypoints.some((wp) => wp.isOvernightStop === true);
    const waypointsForDays = hasOvernightData
      ? rawWaypoints
      : inferOvernightStopsFromDayIndex(rawWaypoints);
    const withDays = deriveDaysFromOvernightStops(waypointsForDays);
    const waypoints = withDays.map((wp) => ({
      ...wp,
      dayIndex: wp.effectiveDayIndex,
    }));

    const totalKm = trip.totalDistanceMeters ? trip.totalDistanceMeters / 1000 : null;
    const totalHours = trip.totalDurationSeconds ? trip.totalDurationSeconds / 3600 : null;

    // Build context about the motorcycle if available
    let motorcycleContext = "";
    if (trip.motorcycle) {
      const m = trip.motorcycle;
      const bikeName = m.displayName || `${m.year ?? ""} ${m.make ?? ""} ${m.model ?? ""}`.trim();
      motorcycleContext = `Motorcycle: ${bikeName}\n`;
      if (m.estimatedRangeKm) {
        motorcycleContext += `Fuel range: ~${m.estimatedRangeKm} km\n`;
      }
    }

    // Build context about schedule preferences
    let scheduleContext = "";
    if (trip.plannedDailyRideHours) {
      scheduleContext += `Preferred daily riding: ${trip.plannedDailyRideHours} hours\n`;
    }
    if (trip.earliestDepartureHour != null) {
      scheduleContext += `Earliest departure: ${trip.earliestDepartureHour}:00\n`;
    }
    if (trip.latestArrivalHour != null) {
      scheduleContext += `Latest arrival: ${trip.latestArrivalHour}:00\n`;
    }

    // Build rider preferences context
    let riderPrefsContext = "";
    const user = trip.user;
    if (user) {
      if (user.ridingStyle) {
        const styleMap: Record<string, string> = {
          TOURING: "long-distance touring",
          ADVENTURE: "adventure/dual-sport riding",
          OFFROAD: "off-road focused",
          SPORT_TOURING: "sport touring",
        };
        riderPrefsContext += `Riding style: ${styleMap[user.ridingStyle] || user.ridingStyle}\n`;
      }
      if (user.pacePreference) {
        const paceMap: Record<string, string> = {
          RELAXED: "relaxed pace with frequent stops",
          MODERATE: "moderate pace",
          AGGRESSIVE: "fast-paced, minimize stops",
        };
        riderPrefsContext += `Pace: ${paceMap[user.pacePreference] || user.pacePreference}\n`;
      }
      if (user.terrainPreference) {
        const terrainMap: Record<string, string> = {
          PAVEMENT_ONLY: "paved roads only",
          MIXED: "mix of pavement and gravel/dirt",
          OFFROAD_FOCUSED: "prefers off-road and unpaved routes",
        };
        riderPrefsContext += `Terrain: ${terrainMap[user.terrainPreference] || user.terrainPreference}\n`;
      }
      if (user.experienceLevel) {
        riderPrefsContext += `Experience: ${user.experienceLevel.toLowerCase()}\n`;
      }
      if (user.dailyDistanceKm) {
        riderPrefsContext += `Preferred daily distance: ${user.dailyDistanceKm} km\n`;
      }
      if (user.avoidHighways) {
        riderPrefsContext += `Prefers to avoid highways/motorways\n`;
      }
      if (user.preferCamping) {
        riderPrefsContext += `Prefers camping over hotels\n`;
      }
      if (user.dietaryRestrictions) {
        riderPrefsContext += `Dietary needs: ${user.dietaryRestrictions}\n`;
      }
      if (user.interests && Array.isArray(user.interests) && user.interests.length > 0) {
        const interestLabels: Record<string, string> = {
          scenicRoutes: "scenic routes",
          localCuisine: "local cuisine",
          historicSites: "historic sites",
          photography: "photography spots",
          camping: "camping",
          twistyRoads: "twisty roads",
          wildlife: "wildlife viewing",
          beaches: "beaches",
          mountains: "mountains",
          deserts: "deserts",
        };
        const labels = (user.interests as string[]).map((i) => interestLabels[i] || i);
        riderPrefsContext += `Interests: ${labels.join(", ")}\n`;
      }
    }

    // Map locale codes to language names for the prompt
    const languageMap: Record<string, string> = {
      en: "English",
      es: "Spanish",
      de: "German",
      fr: "French",
      pt: "Portuguese",
    };
    const targetLanguage = languageMap[locale ?? "en"] ?? "English";

    // Day count derived from overnight stops (matches the waypoint editor sidebar).
    const dayCount = waypoints.length > 0
      ? Math.max(...waypoints.map((wp) => wp.dayIndex), 1)
      : 1;

    const userContent = [
      {
        type: "input_text" as const,
        text:
          `Create a detailed adventure-focused daily riding plan for this motorcycle trip. **Write all text content in ${targetLanguage}.**

Return a JSON object with this exact structure (no markdown, just JSON):
{
  "days": [
    {
      "day": 1,
      "title": "Start Location → End Location",
      "summary": "Brief description of the day's ride",
      "distanceKm": 250,
      "durationHours": 4.5,
      "waypointIndices": [0, 1, 2],
      "terrain": {
        "pavedPercent": 80,
        "gravelPercent": 15,
        "dirtPercent": 5,
        "conditions": "Mostly good pavement with some gravel sections in mountain passes"
      },
      "elevationProfile": {
        "gainMeters": 1200,
        "lossMeters": 800,
        "maxAltitudeMeters": 2400,
        "notableClimbs": ["Col du Galibier (2642m)", "Steep switchbacks near km 120"]
      },
      "scenicRating": 4,
      "difficultyRating": 3,
      "bestTimeToRide": "Early morning departure recommended to avoid afternoon thunderstorms",
      "suggestedStops": [
        {
          "name": "Mountain View Gas Station",
          "type": "FUEL",
          "lat": 45.123,
          "lng": -122.456,
          "reason": "Last fuel for 80km, great espresso"
        }
      ],
      "highlights": ["Stunning alpine scenery", "Historic medieval village"],
      "warnings": ["Rough gravel section for 20km", "Limited cell coverage"],
      "localTips": ["Stop at the bakery in village X for famous pastries", "Locals recommend the north route for better views"],
      "photoOpportunities": [
        {
          "name": "Overlook Point",
          "description": "Panoramic valley view, best at golden hour",
          "lat": 45.234,
          "lng": -122.567
        }
      ],
      "waterCrossings": [
        {
          "name": "River Ford at km 85",
          "depth": "Usually 15-30cm",
          "difficulty": "Easy when dry, moderate after rain",
          "lat": 45.345,
          "lng": -122.678
        }
      ],
      "alternateRoutes": [
        {
          "name": "Paved bypass",
          "description": "Adds 20km but avoids gravel section",
          "reason": "Use if weather is poor or tires unsuitable"
        }
      ],
      "emergencyInfo": {
        "nearestHospital": "Hospital Name, Town (45km)",
        "gasStationGaps": "Longest gap: 95km between Town A and Town B",
        "cellCoverage": "Spotty in mountain sections km 60-90",
        "notes": "Mountain rescue available via 112"
      }
    }
  ]
}

Rules:
- CRITICAL: The trip has exactly ${dayCount} days. You MUST return exactly ${dayCount} day objects, numbered 1 through ${dayCount}. Each waypoint's day assignment is shown above — respect it.
- waypointIndices: array of 0-based indices from the waypoints list that belong to this day (use the day assignments shown above)
- suggestedStops type must be one of: FUEL, LODGING, CAMPGROUND, DINING, POI
- scenicRating and difficultyRating: 1-5 scale (1=low, 5=high)
- terrain percentages should sum to ~100
- Include elevation data for mountain/hilly routes
- Focus on adventure-relevant details: road conditions, water crossings, remote sections
- Provide practical local tips and emergency info
- All text must be in ${targetLanguage}

---

**Trip Details:**

Trip name: ${trip.name}
` +
          (trip.description ? `Description: ${trip.description}\n` : "") +
          motorcycleContext +
          scheduleContext +
          (riderPrefsContext ? `\n**Rider Preferences:**\n${riderPrefsContext}` : "") +
          (totalKm != null ? `\nTotal distance: ~${totalKm.toFixed(0)} km\n` : "") +
          (totalHours != null ? `Estimated riding time: ~${totalHours.toFixed(1)} hours\n` : "") +
          (trip.startDate ? `Start date: ${new Date(trip.startDate).toLocaleDateString()}\n` : "") +
          `\nTrip is organized into ${dayCount} days.\n` +
          `\nWaypoints (in route order, 0-indexed):\n` +
          waypoints
            .map((wp) =>
              `${wp.index}. ${wp.name || "Unnamed"} (${wp.type}, day ${wp.dayIndex ?? "?"}, lat: ${wp.lat.toFixed(4)}, lng: ${wp.lng.toFixed(4)})`,
            )
            .join("\n"),
      },
    ];

    const systemPrompt = `You are an expert adventure motorcycle travel guide with deep knowledge of:
- Road conditions, terrain types, and seasonal variations worldwide
- Border crossings, visa requirements, and carnet procedures
- Remote area riding: fuel planning, water crossings, altitude effects
- Weather patterns and best riding seasons by region
- Camping spots, wild camping regulations, and lodging options
- Local customs, food specialties, and cultural points of interest
- Emergency services, hospitals, and rescue procedures
- Photography opportunities and scenic viewpoints

Return ONLY valid JSON with no markdown formatting, no code fences, and no extra text.

Adapt your recommendations to the rider's preferences when provided (experience level, pace, terrain preference, interests).
Provide practical, safety-conscious advice while maintaining the spirit of adventure.
Include specific local knowledge that only experienced travelers would know.`;

    // For longer trips, instruct the model to be concise so we stay within output limits.
    const conciseHint =
      dayCount > 5
        ? `\n\nIMPORTANT: This is a ${dayCount}-day trip. To fit all days, keep each day concise:
- suggestedStops: max 2 per day
- highlights, warnings, localTips: max 2 items each
- photoOpportunities, waterCrossings, alternateRoutes: include only if truly notable (max 1 each)
- emergencyInfo: only nearestHospital and gasStationGaps
Do NOT truncate — you MUST include ALL ${dayCount} days.`
        : "";

    // Streaming mode
    if (useStreaming) {
      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent[0].text + conciseHint },
        ],
        max_tokens: 16384,
        stream: true,
      });

      const encoder = new TextEncoder();
      let fullText = "";

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                fullText += content;
                // Send chunk as SSE data
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ chunk: content })}\n\n`)
                );
              }
            }

            // Helper to fix common JSON issues from LLM output
            const sanitizeJson = (str: string): string => {
              // Remove trailing commas before ] or }
              return str.replace(/,\s*([\]}])/g, '$1');
            };

            // Stream complete - parse and save
            let structured = null;
            let text = fullText.trim();
            try {
              let jsonStr = text;
              const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
              if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
              }
              jsonStr = sanitizeJson(jsonStr);
              structured = JSON.parse(jsonStr);

              // Generate markdown from structured data using helper
              // Note: redefine helper inline for streaming context
              const starRatingStream = (rating: number | undefined): string => {
                if (!rating || rating < 1 || rating > 5) return "";
                return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
              };
              const markdownLines: string[] = [];
              for (const day of structured.days) {
                markdownLines.push(`## Day ${day.day}: ${day.title}`);
                markdownLines.push("");
                let statsLine = `**~${day.distanceKm} km** \u00b7 **~${day.durationHours.toFixed(1)} hours**`;
                if (day.scenicRating) statsLine += ` \u00b7 Scenic: ${starRatingStream(day.scenicRating)}`;
                if (day.difficultyRating) statsLine += ` \u00b7 Difficulty: ${starRatingStream(day.difficultyRating)}`;
                markdownLines.push(statsLine);
                markdownLines.push("");
                markdownLines.push(day.summary);
                markdownLines.push("");
                if (day.terrain) {
                  const t = day.terrain;
                  let terrainStr = "**\ud83d\udee3\ufe0f Terrain:**";
                  const parts: string[] = [];
                  if (t.pavedPercent) parts.push(`${t.pavedPercent}% paved`);
                  if (t.gravelPercent) parts.push(`${t.gravelPercent}% gravel`);
                  if (t.dirtPercent) parts.push(`${t.dirtPercent}% dirt`);
                  if (parts.length > 0) terrainStr += " " + parts.join(", ");
                  markdownLines.push(terrainStr);
                  if (t.conditions) markdownLines.push(`> ${t.conditions}`);
                  markdownLines.push("");
                }
                if (day.elevationProfile) {
                  const e = day.elevationProfile;
                  let elevStr = "**\u26f0\ufe0f Elevation:**";
                  const elevParts: string[] = [];
                  if (e.gainMeters) elevParts.push(`\u2191${e.gainMeters}m`);
                  if (e.lossMeters) elevParts.push(`\u2193${e.lossMeters}m`);
                  if (e.maxAltitudeMeters) elevParts.push(`max ${e.maxAltitudeMeters}m`);
                  if (elevParts.length > 0) elevStr += " " + elevParts.join(" \u00b7 ");
                  markdownLines.push(elevStr);
                  if (e.notableClimbs?.length > 0) {
                    for (const climb of e.notableClimbs) markdownLines.push(`- ${climb}`);
                  }
                  markdownLines.push("");
                }
                if (day.bestTimeToRide) {
                  markdownLines.push(`**\ud83d\udd50 Best time:** ${day.bestTimeToRide}`);
                  markdownLines.push("");
                }
                if (day.highlights?.length > 0) {
                  markdownLines.push("**\u2728 Highlights:**");
                  for (const h of day.highlights) markdownLines.push(`- *${h}*`);
                  markdownLines.push("");
                }
                if (day.localTips?.length > 0) {
                  markdownLines.push("**\ud83d\udca1 Local Tips:**");
                  for (const tip of day.localTips) markdownLines.push(`- ${tip}`);
                  markdownLines.push("");
                }
                if (day.photoOpportunities?.length > 0) {
                  markdownLines.push("**\ud83d\udcf8 Photo Spots:**");
                  for (const photo of day.photoOpportunities) {
                    markdownLines.push(`- **${photo.name}**${photo.description ? ` \u2013 ${photo.description}` : ""}`);
                  }
                  markdownLines.push("");
                }
                if (day.waterCrossings?.length > 0) {
                  markdownLines.push("**\ud83c\udf0a Water Crossings:**");
                  for (const wc of day.waterCrossings) {
                    let wcLine = `- **${wc.name}**`;
                    if (wc.depth) wcLine += ` (${wc.depth})`;
                    if (wc.difficulty) wcLine += ` \u2013 ${wc.difficulty}`;
                    markdownLines.push(wcLine);
                  }
                  markdownLines.push("");
                }
                if (day.warnings?.length > 0) {
                  markdownLines.push("**\u26a0\ufe0f Warnings:**");
                  for (const w of day.warnings) markdownLines.push(`- ${w}`);
                  markdownLines.push("");
                }
                if (day.suggestedStops?.length > 0) {
                  markdownLines.push("**\ud83d\udccd Suggested Stops:**");
                  for (const stop of day.suggestedStops) {
                    markdownLines.push(`- **${stop.name}** (${stop.type})${stop.reason ? ` \u2013 ${stop.reason}` : ""}`);
                  }
                  markdownLines.push("");
                }
                if (day.alternateRoutes?.length > 0) {
                  markdownLines.push("**\ud83d\udd00 Alternate Routes:**");
                  for (const alt of day.alternateRoutes) {
                    let altLine = `- **${alt.name}**`;
                    if (alt.description) altLine += ` \u2013 ${alt.description}`;
                    if (alt.reason) altLine += ` *(${alt.reason})*`;
                    markdownLines.push(altLine);
                  }
                  markdownLines.push("");
                }
                if (day.emergencyInfo) {
                  const em = day.emergencyInfo;
                  markdownLines.push("**\ud83d\udea8 Emergency Info:**");
                  if (em.nearestHospital) markdownLines.push(`- Hospital: ${em.nearestHospital}`);
                  if (em.gasStationGaps) markdownLines.push(`- Fuel gaps: ${em.gasStationGaps}`);
                  if (em.cellCoverage) markdownLines.push(`- Cell coverage: ${em.cellCoverage}`);
                  if (em.notes) markdownLines.push(`- ${em.notes}`);
                  markdownLines.push("");
                }
                markdownLines.push("---");
                markdownLines.push("");
              }
              text = markdownLines.join("\n").trim();
            } catch {
              // JSON parse failed, use raw text
              structured = null;
            }

            // Save to database
            const updatedTrip = await prisma.trip.update({
              where: { id: tripId },
              data: {
                aiDailyPlan: text,
                aiDailyPlanStructured: structured ? (structured as Prisma.InputJsonValue) : Prisma.DbNull,
                aiDailyPlanGeneratedAt: new Date(),
              },
            });

            // Send final message with complete data
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  text,
                  structured,
                  generatedAt: updatedTrip.aiDailyPlanGeneratedAt?.toISOString() ?? null,
                })}\n\n`
              )
            );
            controller.close();
          } catch (err) {
            console.error("Streaming error:", err);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming mode (original behavior)
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: [{ type: "input_text" as const, text: userContent[0].text + conciseHint }] },
      ],
      max_output_tokens: 16384,
    });

    const rawText = (response.output_text ?? "").trim();

    // Adventure day plan types
    interface DayPlan {
      day: number;
      title: string;
      summary: string;
      distanceKm: number;
      durationHours: number;
      waypointIndices: number[];
      terrain?: {
        pavedPercent?: number;
        gravelPercent?: number;
        dirtPercent?: number;
        conditions?: string;
      };
      elevationProfile?: {
        gainMeters?: number;
        lossMeters?: number;
        maxAltitudeMeters?: number;
        notableClimbs?: string[];
      };
      scenicRating?: number;
      difficultyRating?: number;
      bestTimeToRide?: string;
      suggestedStops?: Array<{
        name: string;
        type: string;
        lat: number;
        lng: number;
        reason?: string;
      }>;
      highlights?: string[];
      warnings?: string[];
      localTips?: string[];
      photoOpportunities?: Array<{
        name: string;
        description?: string;
        lat?: number;
        lng?: number;
      }>;
      waterCrossings?: Array<{
        name: string;
        depth?: string;
        difficulty?: string;
        lat?: number;
        lng?: number;
      }>;
      alternateRoutes?: Array<{
        name: string;
        description?: string;
        reason?: string;
      }>;
      emergencyInfo?: {
        nearestHospital?: string;
        gasStationGaps?: string;
        cellCoverage?: string;
        notes?: string;
      };
    }

    // Helper to generate star rating
    const starRating = (rating: number | undefined): string => {
      if (!rating || rating < 1 || rating > 5) return "";
      return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
    };

    // Helper to generate markdown from structured day data
    const generateDayMarkdown = (day: DayPlan): string[] => {
      const lines: string[] = [];
      lines.push(`## Day ${day.day}: ${day.title}`);
      lines.push("");

      // Basic stats with ratings
      let statsLine = `**~${day.distanceKm} km** · **~${day.durationHours.toFixed(1)} hours**`;
      if (day.scenicRating) statsLine += ` · Scenic: ${starRating(day.scenicRating)}`;
      if (day.difficultyRating) statsLine += ` · Difficulty: ${starRating(day.difficultyRating)}`;
      lines.push(statsLine);
      lines.push("");

      lines.push(day.summary);
      lines.push("");

      // Terrain info
      if (day.terrain) {
        const t = day.terrain;
        let terrainStr = "**🛣️ Terrain:**";
        const parts: string[] = [];
        if (t.pavedPercent) parts.push(`${t.pavedPercent}% paved`);
        if (t.gravelPercent) parts.push(`${t.gravelPercent}% gravel`);
        if (t.dirtPercent) parts.push(`${t.dirtPercent}% dirt`);
        if (parts.length > 0) terrainStr += " " + parts.join(", ");
        lines.push(terrainStr);
        if (t.conditions) lines.push(`> ${t.conditions}`);
        lines.push("");
      }

      // Elevation profile
      if (day.elevationProfile) {
        const e = day.elevationProfile;
        let elevStr = "**⛰️ Elevation:**";
        const elevParts: string[] = [];
        if (e.gainMeters) elevParts.push(`↑${e.gainMeters}m`);
        if (e.lossMeters) elevParts.push(`↓${e.lossMeters}m`);
        if (e.maxAltitudeMeters) elevParts.push(`max ${e.maxAltitudeMeters}m`);
        if (elevParts.length > 0) elevStr += " " + elevParts.join(" · ");
        lines.push(elevStr);
        if (e.notableClimbs && e.notableClimbs.length > 0) {
          for (const climb of e.notableClimbs) lines.push(`- ${climb}`);
        }
        lines.push("");
      }

      // Best time to ride
      if (day.bestTimeToRide) {
        lines.push(`**🕐 Best time:** ${day.bestTimeToRide}`);
        lines.push("");
      }

      // Highlights
      if (day.highlights && day.highlights.length > 0) {
        lines.push("**✨ Highlights:**");
        for (const h of day.highlights) lines.push(`- *${h}*`);
        lines.push("");
      }

      // Local tips
      if (day.localTips && day.localTips.length > 0) {
        lines.push("**💡 Local Tips:**");
        for (const tip of day.localTips) lines.push(`- ${tip}`);
        lines.push("");
      }

      // Photo opportunities
      if (day.photoOpportunities && day.photoOpportunities.length > 0) {
        lines.push("**📸 Photo Spots:**");
        for (const photo of day.photoOpportunities) {
          lines.push(`- **${photo.name}**${photo.description ? ` – ${photo.description}` : ""}`);
        }
        lines.push("");
      }

      // Water crossings
      if (day.waterCrossings && day.waterCrossings.length > 0) {
        lines.push("**🌊 Water Crossings:**");
        for (const wc of day.waterCrossings) {
          let wcLine = `- **${wc.name}**`;
          if (wc.depth) wcLine += ` (${wc.depth})`;
          if (wc.difficulty) wcLine += ` – ${wc.difficulty}`;
          lines.push(wcLine);
        }
        lines.push("");
      }

      // Warnings
      if (day.warnings && day.warnings.length > 0) {
        lines.push("**⚠️ Warnings:**");
        for (const w of day.warnings) lines.push(`- ${w}`);
        lines.push("");
      }

      // Suggested stops
      if (day.suggestedStops && day.suggestedStops.length > 0) {
        lines.push("**📍 Suggested Stops:**");
        for (const stop of day.suggestedStops) {
          lines.push(`- **${stop.name}** (${stop.type})${stop.reason ? ` – ${stop.reason}` : ""}`);
        }
        lines.push("");
      }

      // Alternate routes
      if (day.alternateRoutes && day.alternateRoutes.length > 0) {
        lines.push("**🔀 Alternate Routes:**");
        for (const alt of day.alternateRoutes) {
          let altLine = `- **${alt.name}**`;
          if (alt.description) altLine += ` – ${alt.description}`;
          if (alt.reason) altLine += ` *(${alt.reason})*`;
          lines.push(altLine);
        }
        lines.push("");
      }

      // Emergency info
      if (day.emergencyInfo) {
        const em = day.emergencyInfo;
        lines.push("**🚨 Emergency Info:**");
        if (em.nearestHospital) lines.push(`- Hospital: ${em.nearestHospital}`);
        if (em.gasStationGaps) lines.push(`- Fuel gaps: ${em.gasStationGaps}`);
        if (em.cellCoverage) lines.push(`- Cell coverage: ${em.cellCoverage}`);
        if (em.notes) lines.push(`- ${em.notes}`);
        lines.push("");
      }

      lines.push("---");
      lines.push("");
      return lines;
    };

    // Helper to fix common JSON issues from LLM output
    const sanitizeJson = (str: string): string => {
      // Remove trailing commas before ] or }
      return str.replace(/,\s*([\]}])/g, '$1');
    };

    // Parse the JSON response
    let structured: { days: DayPlan[] };

    try {
      // Try to extract JSON from the response (handle potential markdown code fences)
      let jsonStr = rawText;
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      jsonStr = sanitizeJson(jsonStr);
      structured = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI JSON response:", rawText);
      // Fall back to storing just the raw text if parsing fails
      const updatedTrip = await prisma.trip.update({
        where: { id: tripId },
        data: {
          aiDailyPlan: rawText,
          aiDailyPlanStructured: Prisma.DbNull,
          aiDailyPlanGeneratedAt: new Date(),
        },
      });
      return NextResponse.json({
        text: rawText,
        structured: null,
        generatedAt: updatedTrip.aiDailyPlanGeneratedAt?.toISOString() ?? null,
      });
    }

    // Generate markdown from the structured data for display
    const markdownLines: string[] = [];
    for (const day of structured.days) {
      markdownLines.push(...generateDayMarkdown(day));
    }

    const text = markdownLines.join("\n").trim();

    // Persist the generated plan to the database
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        aiDailyPlan: text,
        aiDailyPlanStructured: structured as any,
        aiDailyPlanGeneratedAt: new Date(),
      },
    });

    // Log activity (fire and forget)
    logActivityAsync({
      userId,
      action: ActivityActions.AI_PLAN_GENERATED,
      metadata: { tripId, dayCount: structured.days?.length ?? 0 },
      request: req,
    });

    return NextResponse.json({
      text,
      structured,
      generatedAt: updatedTrip.aiDailyPlanGeneratedAt?.toISOString() ?? null,
    });
  } catch (err: any) {
    console.error("AI daily plan error", err);

    const code = err?.code ?? err?.error?.code;
    if (code === "insufficient_quota" || code === "rate_limit_exceeded") {
      return NextResponse.json(
        {
          error:
            "AI quota exceeded or rate limited. Check your OpenAI plan/billing, then try again.",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: err?.message ?? "Failed to generate AI daily plan" },
      { status: 500 },
    );
  }
}

// DELETE endpoint to clear the saved AI plan
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");

    if (!tripId) {
      return NextResponse.json({ error: "tripId is required" }, { status: 400 });
    }

    // Verify ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        aiDailyPlan: null,
        aiDailyPlanStructured: Prisma.DbNull,
        aiDailyPlanGeneratedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Clear AI plan error", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to clear AI plan" },
      { status: 500 },
    );
  }
}
