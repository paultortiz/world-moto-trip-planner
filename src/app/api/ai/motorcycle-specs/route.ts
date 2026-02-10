import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { auth } from "@/auth";

interface SpecPayload {
  engineDisplacementCc?: number;
  wetWeightKg?: number;
  fuelCapacityLiters?: number;
  estimatedRangeKm?: number;
  seatHeightMm?: number;
  offroadBias?: number;
  highwayComfort?: number;
  notes?: string;
}

function coerceNumber(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function clamp01(value: unknown): number | undefined {
  const n = coerceNumber(value);
  if (n == null) return undefined;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const body = await req.json();
    const { tripId, motorcycleId, year, make, model } = body ?? {};

    // Use an untyped Prisma client view for the motorcycle delegate so builds dont
    // depend on generated Prisma types being perfectly in sync.
    const prismaAny = prisma as any;

    const yearNum = year != null ? Number(year) : undefined;
    const makeStr = typeof make === "string" ? make.trim() : "";
    const modelStr = typeof model === "string" ? model.trim() : "";

    if (!yearNum || !makeStr || !modelStr) {
      return NextResponse.json(
        { error: "year, make, and model are required to look up motorcycle specs" },
        { status: 400 },
      );
    }

    if (!openai) {
      return NextResponse.json(
        { error: "AI is not configured. Set OPENAI_API_KEY on the server." },
        { status: 500 },
      );
    }

    let trip: any | null = null;
    if (tripId && typeof tripId === "string") {
      trip = await prisma.trip.findFirst({
        where: { id: tripId, userId },
      });

      if (!trip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }
    }

    // Try to find an existing motorcycle for this user. Prefer an explicit motorcycleId when provided.
    let motorcycle = await prismaAny.motorcycle.findFirst({
      where: {
        userId,
        ...(motorcycleId && typeof motorcycleId === "string"
          ? { id: motorcycleId }
          : { year: yearNum, make: makeStr, model: modelStr }),
      },
    });

    let specs: SpecPayload | null = null;

    if (motorcycle?.specs) {
      specs = motorcycle.specs as SpecPayload;
    }

    if (!specs) {
      const displayName = `${yearNum} ${makeStr} ${modelStr}`.trim();

      const userContent = [
        {
          type: "input_text" as const,
          text:
            `You are an expert on motorcycle specifications. ` +
            `Given a motorcycle described as: ${displayName}. ` +
            `Provide comprehensive specifications. Return a single JSON object with these keys (use null if unknown):\n` +
            `{\n` +
            `  "engineDisplacementCc": number,\n` +
            `  "engineType": string (e.g. "parallel twin", "V-twin", "inline-4", "single"),\n` +
            `  "engineCooling": string (e.g. "liquid", "air", "oil"),\n` +
            `  "horsepower": number (peak HP),\n` +
            `  "torqueNm": number (peak torque),\n` +
            `  "transmissionType": string (e.g. "6-speed manual", "DCT"),\n` +
            `  "finalDrive": string (e.g. "chain", "belt", "shaft"),\n` +
            `  "wetWeightKg": number,\n` +
            `  "dryWeightKg": number,\n` +
            `  "fuelCapacityLiters": number,\n` +
            `  "estimatedRangeKm": number,\n` +
            `  "fuelConsumptionLper100km": number,\n` +
            `  "seatHeightMm": number,\n` +
            `  "seatHeightLowMm": number (if adjustable/low option),\n` +
            `  "groundClearanceMm": number,\n` +
            `  "wheelbaseMm": number,\n` +
            `  "frontSuspension": string,\n` +
            `  "rearSuspension": string,\n` +
            `  "frontSuspensionTravelMm": number,\n` +
            `  "rearSuspensionTravelMm": number,\n` +
            `  "frontBrake": string,\n` +
            `  "rearBrake": string,\n` +
            `  "absType": string (e.g. "standard", "cornering ABS", "off-road mode", "none"),\n` +
            `  "tractionControl": boolean,\n` +
            `  "ridingModes": string[] (e.g. ["Road", "Rain", "Off-road"]),\n` +
            `  "cruiseControl": boolean,\n` +
            `  "quickshifter": boolean,\n` +
            `  "frontTireSize": string,\n` +
            `  "rearTireSize": string,\n` +
            `  "frontWheelSizeInches": number,\n` +
            `  "rearWheelSizeInches": number,\n` +
            `  "wheelType": string (e.g. "spoked", "cast alloy", "tubeless spoked"),\n` +
            `  "windscreen": string (e.g. "tall adjustable", "sport", "none"),\n` +
            `  "handguards": boolean,\n` +
            `  "centerStand": boolean,\n` +
            `  "heatedGrips": boolean,\n` +
            `  "heatedSeats": boolean,\n` +
            `  "luggageSystem": string (e.g. "hard panniers included", "optional", "none"),\n` +
            `  "usbCharging": boolean,\n` +
            `  "dashDisplay": string (e.g. "TFT", "LCD", "analog"),\n` +
            `  "bluetooth": boolean,\n` +
            `  "navigationReady": boolean,\n` +
            `  "offroadBias": number 0-1 (0=street, 1=full offroad),\n` +
            `  "highwayComfort": number 0-1,\n` +
            `  "passengerComfort": number 0-1,\n` +
            `  "category": string (e.g. "adventure", "sport-touring", "dual-sport"),\n` +
            `  "msrpUsd": number (MSRP when new),\n` +
            `  "yearIntroduced": number,\n` +
            `  "yearDiscontinued": number,\n` +
            `  "notes": string (caveats or estimation notes)\n` +
            `}\n` +
            `Be accurate where possible. Output only valid JSON, no other text.`,
        },
      ];

      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You estimate motorcycle specs for trip planning. You output strict JSON only, no extra text.",
          },
          { role: "user", content: userContent },
        ],
      });

      const raw = (response.output_text ?? "").trim();

      // Some models occasionally wrap JSON in markdown code fences. If so, extract the fenced block.
      let jsonText = raw;
      const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenceMatch && fenceMatch[1]) {
        jsonText = fenceMatch[1].trim();
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonText);
      } catch (err) {
        console.error("Failed to parse motorcycle specs JSON", err, raw);
        return NextResponse.json(
          { error: "AI returned invalid motorcycle specs. Please try again." },
          { status: 502 },
        );
      }

      // Coerce core numeric fields, but preserve all other fields from AI response
      specs = {
        ...parsed,
        engineDisplacementCc: coerceNumber(parsed.engineDisplacementCc),
        wetWeightKg: coerceNumber(parsed.wetWeightKg),
        fuelCapacityLiters: coerceNumber(parsed.fuelCapacityLiters),
        estimatedRangeKm: coerceNumber(parsed.estimatedRangeKm),
        seatHeightMm: coerceNumber(parsed.seatHeightMm),
        offroadBias: clamp01(parsed.offroadBias),
        highwayComfort: clamp01(parsed.highwayComfort),
        notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
      };

      // Create or update motorcycle record with specs.
      if (!motorcycle) {
        motorcycle = await prismaAny.motorcycle.create({
          data: {
            userId,
            year: yearNum,
            make: makeStr,
            model: modelStr,
            displayName,
            engineDisplacementCc: specs.engineDisplacementCc ?? null,
            wetWeightKg: specs.wetWeightKg ?? null,
            fuelCapacityLiters: specs.fuelCapacityLiters ?? null,
            estimatedRangeKm: specs.estimatedRangeKm ?? null,
            seatHeightMm: specs.seatHeightMm ?? null,
            offroadBias: specs.offroadBias ?? null,
            highwayComfort: specs.highwayComfort ?? null,
            specs: specs as any,
          },
        });
      } else {
        motorcycle = await prismaAny.motorcycle.update({
          where: { id: motorcycle.id },
          data: {
            year: yearNum,
            make: makeStr,
            model: modelStr,
            displayName,
            engineDisplacementCc: specs.engineDisplacementCc ?? null,
            wetWeightKg: specs.wetWeightKg ?? null,
            fuelCapacityLiters: specs.fuelCapacityLiters ?? null,
            estimatedRangeKm: specs.estimatedRangeKm ?? null,
            seatHeightMm: specs.seatHeightMm ?? null,
            offroadBias: specs.offroadBias ?? null,
            highwayComfort: specs.highwayComfort ?? null,
            specs: specs as any,
          },
        });
      }
    }

    // If a trip is provided, attach motorcycle to the trip and optionally seed fuel range from estimatedRangeKm.
    if (trip) {
      const updatedTrip = await prisma.trip.update({
        where: { id: trip.id },
        data: {
          motorcycleId: motorcycle!.id,
          fuelRangeKm:
            trip.fuelRangeKm != null
              ? trip.fuelRangeKm
              : (motorcycle!.estimatedRangeKm ?? trip.fuelRangeKm ?? null),
        },
        include: {
          motorcycle: true,
        },
      });

      return NextResponse.json({
        motorcycle: {
          id: updatedTrip.motorcycle!.id,
          year: updatedTrip.motorcycle!.year,
          make: updatedTrip.motorcycle!.make,
          model: updatedTrip.motorcycle!.model,
          displayName: updatedTrip.motorcycle!.displayName,
          engineDisplacementCc: updatedTrip.motorcycle!.engineDisplacementCc,
          wetWeightKg: updatedTrip.motorcycle!.wetWeightKg,
          fuelCapacityLiters: updatedTrip.motorcycle!.fuelCapacityLiters,
          estimatedRangeKm: updatedTrip.motorcycle!.estimatedRangeKm,
          seatHeightMm: updatedTrip.motorcycle!.seatHeightMm,
          offroadBias: updatedTrip.motorcycle!.offroadBias,
          highwayComfort: updatedTrip.motorcycle!.highwayComfort,
          specs: updatedTrip.motorcycle!.specs,
        },
      });
    }

    // No trip provided: just return the updated motorcycle with specs.
    return NextResponse.json({
      motorcycle: {
        id: motorcycle!.id,
        year: motorcycle!.year,
        make: motorcycle!.make,
        model: motorcycle!.model,
        displayName: motorcycle!.displayName,
        engineDisplacementCc: motorcycle!.engineDisplacementCc,
        wetWeightKg: motorcycle!.wetWeightKg,
        fuelCapacityLiters: motorcycle!.fuelCapacityLiters,
        estimatedRangeKm: motorcycle!.estimatedRangeKm,
        seatHeightMm: motorcycle!.seatHeightMm,
        offroadBias: motorcycle!.offroadBias,
        highwayComfort: motorcycle!.highwayComfort,
        specs: motorcycle!.specs,
      },
    });
  } catch (err: any) {
    console.error("AI motorcycle specs error", err);
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
      { error: err?.message ?? "Failed to fetch motorcycle specs" },
      { status: 500 },
    );
  }
}
