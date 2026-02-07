import { NextRequest, NextResponse } from "next/server";
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
          `Create a detailed daily riding plan for this motorcycle trip. **Write your entire response in ${targetLanguage}.** Format your response in **Markdown** with the following structure:

## Formatting Requirements:
- Use **## Day N: Start Location → End Location** for each day header
- Include **bold** for distances and times (e.g., **~250 km**, **~4 hours**)
- Use bullet points for waypoints and suggested stops
- Use *italics* for POI recommendations and scenic highlights
- Add a brief summary paragraph for each day
- Include fuel stop recommendations based on the route
- Note any challenging sections or road conditions to be aware of

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
          `\nWaypoints (in route order):\n` +
          waypoints
            .map((wp) =>
              `${wp.index + 1}. **${wp.name || "Unnamed"}** (${wp.type}${wp.dayIndex ? `, Day ${wp.dayIndex}` : ""})`,
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
            "You are an expert adventure motorcycle route planner. You create detailed, practical daily riding plans that consider fuel range, scenic routes, rest stops, and points of interest. Your plans are formatted in clean Markdown for easy reading. Focus on realistic daily distances (typically 200-400 km for ADV riding) and include specific recommendations for fuel stops, food, and overnight stays.",
        },
        { role: "user", content: userContent },
      ],
    });

    const text = (response.output_text ?? "").trim();

    // Persist the generated plan to the database
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        aiDailyPlan: text,
        aiDailyPlanGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({
      text,
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
