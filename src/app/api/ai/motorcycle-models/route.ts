import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { auth } from "@/auth";

// Use untyped Prisma client view for MotorcycleModelCache
// until the migration is run and Prisma types are regenerated
const prismaAny = prisma as any;

/**
 * GET /api/ai/motorcycle-models?make=Yamaha
 * 
 * Returns a list of motorcycle models for the given make.
 * Uses database cache to minimize OpenAI API calls.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const make = searchParams.get("make")?.trim();

    if (!make) {
      return NextResponse.json(
        { error: "make parameter is required" },
        { status: 400 }
      );
    }

    // Normalize make for consistent caching (title case)
    const normalizedMake = make
      .toLowerCase()
      .split(/[\s-]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // Check cache first
    const cached = await prismaAny.motorcycleModelCache.findUnique({
      where: { make: normalizedMake },
    });

    // Cache entries expire after 30 days
    const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
    const isCacheValid = cached && (Date.now() - new Date(cached.updatedAt).getTime()) < CACHE_TTL_MS;

    if (isCacheValid) {
      // Return cached models
      return NextResponse.json({
        make: normalizedMake,
        models: cached.models as string[],
        cached: true,
      });
    }

    // Cache miss - call OpenAI
    if (!openai) {
      return NextResponse.json(
        { error: "AI is not configured. Set OPENAI_API_KEY on the server." },
        { status: 500 }
      );
    }

    const userContent = [
      {
        type: "input_text" as const,
        text:
          `List all motorcycle models ever made by ${normalizedMake}. ` +
          `Include current and discontinued models. ` +
          `Return a JSON array of model names only, sorted alphabetically. ` +
          `Do not include year variants - just the base model name (e.g., "R1" not "R1 2023"). ` +
          `Do not include engine size in the name if it's a separate model (e.g., list "Tenere 700" and "Super Tenere" separately). ` +
          `Output only a valid JSON array, no other text. Example: ["Model1", "Model2", "Model3"]`,
      },
    ];

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are an expert on motorcycles. You output strict JSON arrays only, no extra text.",
        },
        { role: "user", content: userContent },
      ],
    });

    const raw = (response.output_text ?? "").trim();

    // Extract JSON from potential markdown code fence
    let jsonText = raw;
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
      jsonText = fenceMatch[1].trim();
    }

    let models: string[];
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error("Expected array");
      }
      // Filter to strings only and sort alphabetically
      models = parsed
        .filter((m): m is string => typeof m === "string" && m.trim() !== "")
        .map((m) => m.trim())
        .sort((a, b) => a.localeCompare(b));
    } catch (err) {
      console.error("Failed to parse motorcycle models JSON", err, raw);
      return NextResponse.json(
        { error: "AI returned invalid data. Please try again." },
        { status: 502 }
      );
    }

    // Store in cache (upsert to handle expired entries)
    await prismaAny.motorcycleModelCache.upsert({
      where: { make: normalizedMake },
      update: {
        models: models,
        updatedAt: new Date(),
      },
      create: {
        make: normalizedMake,
        models: models,
      },
    });

    return NextResponse.json({
      make: normalizedMake,
      models,
      cached: false,
    });
  } catch (error) {
    console.error("Error fetching motorcycle models:", error);
    return NextResponse.json(
      { error: "Failed to fetch motorcycle models" },
      { status: 500 }
    );
  }
}
