import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { auth } from "@/auth";

interface MaintenanceSchedule {
  serviceIntervals?: Array<{
    intervalMiles?: number;
    intervalKm?: number;
    name?: string;
    tasks?: string[];
    estimatedCostUsd?: number;
  }>;
  wearItems?: Array<{
    item?: string;
    intervalMiles?: number;
    intervalKm?: number;
    notes?: string;
  }>;
  fluidCapacities?: {
    engineOilLiters?: number;
    coolantLiters?: number;
    forkOilMlPerLeg?: number;
    brakeFluidMl?: number;
  };
  notes?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const body = await req.json();
    const { motorcycleId } = body ?? {};

    if (!motorcycleId || typeof motorcycleId !== "string") {
      return NextResponse.json(
        { error: "motorcycleId is required" },
        { status: 400 },
      );
    }

    if (!openai) {
      return NextResponse.json(
        { error: "AI is not configured. Set OPENAI_API_KEY on the server." },
        { status: 500 },
      );
    }

    // Use an untyped Prisma client view for the motorcycle delegate
    const prismaAny = prisma as any;

    // Find the motorcycle
    const motorcycle = await prismaAny.motorcycle.findFirst({
      where: { id: motorcycleId, userId },
    });

    if (!motorcycle) {
      return NextResponse.json({ error: "Motorcycle not found" }, { status: 404 });
    }

    // If we already have maintenance schedule, return it
    if (motorcycle.maintenanceSchedule) {
      return NextResponse.json({
        maintenanceSchedule: motorcycle.maintenanceSchedule,
      });
    }

    // Build display name
    const displayName = motorcycle.displayName ||
      `${motorcycle.year ?? ""} ${motorcycle.make ?? ""} ${motorcycle.model ?? ""}`.trim();

    if (!displayName) {
      return NextResponse.json(
        { error: "Motorcycle must have year, make, and model to fetch maintenance schedule" },
        { status: 400 },
      );
    }

    const userContent = [
      {
        type: "input_text" as const,
        text:
          `You are an expert on motorcycle maintenance and service schedules. ` +
          `Given a motorcycle described as: ${displayName}. ` +
          `Provide the manufacturer's recommended maintenance schedule. Return a single JSON object with these keys:\n` +
          `{\n` +
          `  "serviceIntervals": [\n` +
          `    { "intervalMiles": number, "intervalKm": number, "name": string, "tasks": string[], "estimatedCostUsd": number }\n` +
          `  ],\n` +
          `  "wearItems": [\n` +
          `    { "item": string, "intervalMiles": number, "intervalKm": number, "notes": string }\n` +
          `  ],\n` +
          `  "fluidCapacities": { "engineOilLiters": number, "coolantLiters": number, "forkOilMlPerLeg": number, "brakeFluidMl": number },\n` +
          `  "notes": string\n` +
          `}\n\n` +
          `Include typical service intervals like:\n` +
          `- Break-in service (600mi/1000km): initial inspection, oil change\n` +
          `- Minor service (4000mi/6000km): oil and filter change, chain lubrication, basic inspection\n` +
          `- Major service (8000mi/12000km): oil change, air filter, spark plugs inspection, full inspection\n` +
          `- Valve check (16000mi/24000km or as specified): valve clearance check/adjustment\n\n` +
          `Include common wear items like: tires, brake pads (front/rear), chain and sprockets, air filter, spark plugs, coolant, brake fluid.\n` +
          `Be accurate where possible based on manufacturer recommendations. Output only valid JSON, no other text.`,
      },
    ];

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You provide motorcycle maintenance schedules based on manufacturer recommendations. You output strict JSON only, no extra text.",
        },
        { role: "user", content: userContent },
      ],
    });

    const raw = (response.output_text ?? "").trim();

    // Extract JSON from potential markdown code fences
    let jsonText = raw;
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
      jsonText = fenceMatch[1].trim();
    }

    let maintenanceSchedule: MaintenanceSchedule;
    try {
      maintenanceSchedule = JSON.parse(jsonText);
    } catch (err) {
      console.error("Failed to parse motorcycle maintenance JSON", err, raw);
      return NextResponse.json(
        { error: "AI returned invalid maintenance schedule. Please try again." },
        { status: 502 },
      );
    }

    // Update motorcycle with maintenance schedule
    await prismaAny.motorcycle.update({
      where: { id: motorcycleId },
      data: {
        maintenanceSchedule: maintenanceSchedule as any,
      },
    });

    return NextResponse.json({
      maintenanceSchedule,
    });
  } catch (err: any) {
    console.error("AI motorcycle maintenance error", err);
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
      { error: err?.message ?? "Failed to fetch maintenance schedule" },
      { status: 500 },
    );
  }
}
