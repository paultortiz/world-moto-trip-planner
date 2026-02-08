import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const body = await req.json();
    const { tripId, locale } = body as { tripId?: string; locale?: string };

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
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const waypoints = trip.waypoints.map((wp, index) => ({
      index,
      name: wp.name ?? null,
      type: wp.type,
      lat: wp.lat,
      lng: wp.lng,
      dayIndex: wp.dayIndex ?? null,
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

    // Map locale codes to language names for the prompt
    const languageMap: Record<string, string> = {
      en: "English",
      es: "Spanish",
      de: "German",
      fr: "French",
      pt: "Portuguese",
    };
    const targetLanguage = languageMap[locale ?? "en"] ?? "English";

    const userContent = [
      {
        type: "input_text" as const,
        text:
          `Create a detailed daily riding plan for this motorcycle trip. **Write all text content in ${targetLanguage}.**

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
      "suggestedStops": [
        {
          "name": "Gas Station Name",
          "type": "FUEL",
          "lat": 45.123,
          "lng": -122.456,
          "reason": "Good fuel stop after mountain section"
        }
      ],
      "highlights": ["Scenic mountain pass", "Historic town center"],
      "warnings": ["Rough gravel section for 20km"]
    }
  ]
}

Rules:
- waypointIndices: array of 0-based indices from the waypoints list that belong to this day
- suggestedStops: optional fuel, lodging, or POI suggestions with approximate lat/lng coordinates
- type must be one of: FUEL, LODGING, CAMPGROUND, DINING, POI
- Focus on realistic daily distances (200-400 km for ADV riding)
- Include fuel stop suggestions based on the motorcycle's range
- All text (title, summary, highlights, warnings, reason) must be in ${targetLanguage}

---

**Trip Details:**

Trip name: ${trip.name}
` +
          (trip.description ? `Description: ${trip.description}\n` : "") +
          motorcycleContext +
          scheduleContext +
          (totalKm != null ? `Total distance: ~${totalKm.toFixed(0)} km\n` : "") +
          (totalHours != null ? `Estimated riding time: ~${totalHours.toFixed(1)} hours\n` : "") +
          (trip.startDate ? `Start date: ${new Date(trip.startDate).toLocaleDateString()}\n` : "") +
          `\nWaypoints (in route order, 0-indexed):\n` +
          waypoints
            .map((wp) =>
              `${wp.index}. ${wp.name || "Unnamed"} (${wp.type}, lat: ${wp.lat.toFixed(4)}, lng: ${wp.lng.toFixed(4)})`,
            )
            .join("\n"),
      },
    ];

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are an expert adventure motorcycle route planner. Return ONLY valid JSON with no markdown formatting, no code fences, and no extra text. Create practical daily riding plans that consider fuel range, scenic routes, rest stops, and points of interest. Focus on realistic daily distances (typically 200-400 km for ADV riding).",
        },
        { role: "user", content: userContent },
      ],
    });

    const rawText = (response.output_text ?? "").trim();

    // Parse the JSON response
    let structured: {
      days: Array<{
        day: number;
        title: string;
        summary: string;
        distanceKm: number;
        durationHours: number;
        waypointIndices: number[];
        suggestedStops?: Array<{
          name: string;
          type: string;
          lat: number;
          lng: number;
          reason?: string;
        }>;
        highlights?: string[];
        warnings?: string[];
      }>;
    };

    try {
      // Try to extract JSON from the response (handle potential markdown code fences)
      let jsonStr = rawText;
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
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
      markdownLines.push(`## Day ${day.day}: ${day.title}`);
      markdownLines.push("");
      markdownLines.push(`**~${day.distanceKm} km** · **~${day.durationHours.toFixed(1)} hours**`);
      markdownLines.push("");
      markdownLines.push(day.summary);
      markdownLines.push("");

      if (day.highlights && day.highlights.length > 0) {
        markdownLines.push("**Highlights:**");
        for (const h of day.highlights) {
          markdownLines.push(`- *${h}*`);
        }
        markdownLines.push("");
      }

      if (day.warnings && day.warnings.length > 0) {
        markdownLines.push("**⚠️ Notes:**");
        for (const w of day.warnings) {
          markdownLines.push(`- ${w}`);
        }
        markdownLines.push("");
      }

      if (day.suggestedStops && day.suggestedStops.length > 0) {
        markdownLines.push("**Suggested stops:**");
        for (const stop of day.suggestedStops) {
          markdownLines.push(`- **${stop.name}** (${stop.type})${stop.reason ? ` – ${stop.reason}` : ""}`);
        }
        markdownLines.push("");
      }

      markdownLines.push("---");
      markdownLines.push("");
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
