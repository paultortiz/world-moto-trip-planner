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
    const { tripId } = body as { tripId?: string };

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

    const userContent = [
      {
        type: "input_text" as const,
        text:
          `Plan a daily riding itinerary for this motorcycle trip and highlight interesting points of interest (POIs) near the route. ` +
          `Focus on realistic daily distances, scenic sections, and optional stops.
` +
          `Return concise, rider-focused text (no JSON), grouped by day.

` +
          `Trip name: ${trip.name}\n` +
          (trip.description ? `Description: ${trip.description}\n` : "") +
          (totalKm != null ? `Approx total distance: ${totalKm.toFixed(0)} km\n` : "") +
          (totalHours != null ? `Approx total riding time: ${totalHours.toFixed(1)} h\n` : "") +
          `Waypoints (in order):\n` +
          waypoints
            .map((wp) =>
              `  ${wp.index + 1}. ${wp.name ?? "Unnamed"} ` +
              `(type: ${wp.type}, lat: ${wp.lat.toFixed(3)}, lng: ${wp.lng.toFixed(3)}, ` +
              `dayIndex: ${wp.dayIndex ?? "?"})`,
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
            "You are an expert motorcycle route planner. You design safe, scenic daily plans with realistic fuel and rest stops.",
        },
        { role: "user", content: userContent },
      ],
    });

    const text = (response.output_text ?? "").trim();

    return NextResponse.json({ text });
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
