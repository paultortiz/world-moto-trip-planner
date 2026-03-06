import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { auth } from "@/auth";
import type { BorderRequirement } from "@/lib/borderCrossings";

// Use any cast for Prisma types that may not be generated yet
const prismaAny = prisma as any;

// Cache TTL: 30 days (border requirements rarely change)
const CACHE_TTL_DAYS = 30;

interface RequestBody {
  originCountry: string; // ISO 3166-1 alpha-2
  destCountry: string;
  riderNationality?: string; // Optional: rider's passport country for visa info
  locale?: string;
}

/**
 * POST /api/ai/border-requirements
 * 
 * Generates motorcycle-specific border crossing requirements for a country pair.
 * Results are cached in the database for 30 days.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    // Fetch user's passport countries if not provided in request
    let userPassportCountries: string[] = [];
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passportCountries: true },
      });
      userPassportCountries = (user?.passportCountries as string[] | null) ?? [];
    }

    const body: RequestBody = await req.json();
    const { originCountry, destCountry, locale } = body;
    // Use provided riderNationality, fall back to user's saved passport countries
    // If user has multiple passports, we'll include all for the AI to consider
    const riderNationalities = body.riderNationality 
      ? [body.riderNationality] 
      : userPassportCountries;

    if (!originCountry || !destCountry) {
      return NextResponse.json(
        { error: "originCountry and destCountry are required" },
        { status: 400 }
      );
    }

    // Normalize country codes to uppercase
    const origin = originCountry.toUpperCase();
    const dest = destCountry.toUpperCase();

    // Check cache first
    const cached = await prismaAny.borderRequirementsCache.findUnique({
      where: {
        originCountry_destCountry: {
          originCountry: origin,
          destCountry: dest,
        },
      },
    });

    if (cached) {
      // Check if cache is still valid (within TTL)
      const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
      const cacheTtlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

      if (cacheAge < cacheTtlMs) {
        return NextResponse.json({
          requirements: cached.requirements as BorderRequirement[],
          warnings: cached.warnings as string[] | null,
          cached: true,
          generatedAt: cached.updatedAt.toISOString(),
        });
      }
    }

    // Generate with AI
    if (!openai) {
      return NextResponse.json(
        { error: "AI is not configured. Set OPENAI_API_KEY on the server." },
        { status: 500 }
      );
    }

    // Map locale codes to language names
    const languageMap: Record<string, string> = {
      en: "English",
      es: "Spanish",
      de: "German",
      fr: "French",
      pt: "Portuguese",
    };
    const targetLanguage = languageMap[locale ?? "en"] ?? "English";

    const systemPrompt = `You are an expert on international motorcycle travel documentation and border crossing procedures. You have deep knowledge of:
- Carnet de Passages requirements by country
- Temporary Import Permits (TIP) for vehicles
- Passport validity requirements
- Visa requirements for various nationalities
- Vehicle insurance requirements
- Health and vaccination requirements
- Customs procedures for motorcycles
- Practical tips from experienced adventure riders

Provide accurate, current information. When requirements differ by rider nationality, note this clearly.
Return ONLY valid JSON with no markdown formatting.`;

    // Build nationality context for AI prompt
    const nationalityContext = riderNationalities.length > 0
      ? riderNationalities.length === 1
        ? `The rider holds a ${riderNationalities[0]} passport.`
        : `The rider holds multiple passports: ${riderNationalities.join(", ")}. Provide requirements for each nationality where they differ, noting which passport offers easier entry.`
      : "Assume a US passport holder if nationality-specific info is needed.";

    const userPrompt = `Generate motorcycle-specific border crossing requirements for traveling from ${origin} to ${dest}.
${nationalityContext}

**Write all text in ${targetLanguage}.**

Return a JSON object with this structure:
{
  "requirements": [
    {
      "category": "passport" | "visa" | "vehicle" | "insurance" | "health" | "customs" | "tips",
      "title": "Brief title",
      "description": "Detailed description with practical info",
      "required": true/false,
      "countrySpecific": "XX" (optional - ISO code if specific to one country)
    }
  ],
  "warnings": ["Important warnings or time-sensitive info"]
}

Include requirements for:
1. PASSPORT: Validity requirements, blank pages needed
2. VISA: Requirements based on rider nationality (or note if varies)
3. VEHICLE: 
   - Carnet de Passages (if required)
   - Temporary Import Permit (TIP) procedures
   - Vehicle registration requirements
   - Title/ownership documents
4. INSURANCE: 
   - Mandatory liability coverage
   - How to obtain at border or in advance
5. HEALTH: Vaccinations, health declarations
6. CUSTOMS: Declaration procedures, prohibited items, duty-free allowances
7. TIPS: 
   - Best border crossings for motorcycles
   - Typical crossing times
   - Common issues and how to avoid them
   - Useful Spanish/local phrases if applicable

Be specific and practical. Include costs where known.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent factual output
    });

    const rawText = response.choices[0]?.message?.content?.trim() ?? "";

    // Parse JSON response
    let parsed: { requirements: BorderRequirement[]; warnings?: string[] };
    try {
      // Handle potential markdown code fences
      let jsonStr = rawText;
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      // Remove trailing commas
      jsonStr = jsonStr.replace(/,\s*([\]}])/g, "$1");
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI border requirements response:", rawText);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Validate structure
    if (!parsed.requirements || !Array.isArray(parsed.requirements)) {
      return NextResponse.json(
        { error: "Invalid AI response structure" },
        { status: 500 }
      );
    }

    // Cache the result
    const upserted = await prismaAny.borderRequirementsCache.upsert({
      where: {
        originCountry_destCountry: {
          originCountry: origin,
          destCountry: dest,
        },
      },
      update: {
        requirements: parsed.requirements as any,
        warnings: parsed.warnings ?? null,
        updatedAt: new Date(),
      },
      create: {
        originCountry: origin,
        destCountry: dest,
        requirements: parsed.requirements as any,
        warnings: parsed.warnings ?? null,
      },
    });

    return NextResponse.json({
      requirements: parsed.requirements,
      warnings: parsed.warnings ?? null,
      cached: false,
      generatedAt: upserted.updatedAt.toISOString(),
    });
  } catch (err: any) {
    console.error("Border requirements API error:", err);

    const code = err?.code ?? err?.error?.code;
    if (code === "insufficient_quota" || code === "rate_limit_exceeded") {
      return NextResponse.json(
        { error: "AI quota exceeded. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err?.message ?? "Failed to generate border requirements" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/border-requirements
 * 
 * Retrieves cached requirements for a country pair without generating new ones.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const origin = searchParams.get("origin")?.toUpperCase();
    const dest = searchParams.get("dest")?.toUpperCase();

    if (!origin || !dest) {
      return NextResponse.json(
        { error: "origin and dest query params are required" },
        { status: 400 }
      );
    }

    const cached = await prismaAny.borderRequirementsCache.findUnique({
      where: {
        originCountry_destCountry: {
          originCountry: origin,
          destCountry: dest,
        },
      },
    });

    if (!cached) {
      return NextResponse.json({
        requirements: null,
        message: "No cached requirements found. Use POST to generate.",
      });
    }

    return NextResponse.json({
      requirements: cached.requirements as BorderRequirement[],
      warnings: cached.warnings as string[] | null,
      cached: true,
      generatedAt: cached.updatedAt.toISOString(),
    });
  } catch (err: any) {
    console.error("Border requirements GET error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch border requirements" },
      { status: 500 }
    );
  }
}
