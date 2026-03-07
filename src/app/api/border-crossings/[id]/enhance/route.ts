/**
 * API endpoint to generate AI-enhanced motorcycle tips for a border crossing.
 * 
 * POST /api/border-crossings/[id]/enhance
 * 
 * - Generates motorcycle-specific tips, warnings, best times using OpenAI
 * - Caches results in database
 * - Only called on-demand when user clicks "Get motorcycle tips"
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";

interface EnhancementResponse {
  motorcycleTips: string;
  warnings: string;
  bestTimeToGo: string;
  tipProcessInfo: string;
}

// Map locale codes to language names for the AI prompt
const LOCALE_LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  de: "German",
  fr: "French",
  pt: "Portuguese",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!openai) {
    return NextResponse.json({ error: "AI features not available" }, { status: 503 });
  }

  const { id } = await params;
  
  // Get locale and forceRegenerate from request body
  let locale = "en";
  let forceRegenerate = false;
  try {
    const body = await request.json();
    locale = body.locale || "en";
    forceRegenerate = body.forceRegenerate === true;
  } catch {
    // No body or invalid JSON, use defaults
  }
  
  const language = LOCALE_LANGUAGES[locale] || "English";

  try {
    // Fetch the crossing from database
    const crossing = await prisma.borderCrossing.findUnique({
      where: { id },
    });

    if (!crossing) {
      return NextResponse.json({ error: "Crossing not found" }, { status: 404 });
    }

    // Check if we already have recent AI enhancement (within 30 days) - skip if forceRegenerate
    if (!forceRegenerate && crossing.lastAiEnhanced) {
      const daysSinceEnhanced = (Date.now() - crossing.lastAiEnhanced.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceEnhanced < 30 && crossing.motorcycleTips) {
        // Return cached AI data
        return NextResponse.json({
          crossing: {
            id: crossing.id,
            motorcycleTips: crossing.motorcycleTips,
            warnings: crossing.warnings,
            bestTimeToGo: crossing.bestTimeToGo,
            tipProcessInfo: crossing.tipProcessInfo,
          },
          cached: true,
        });
      }
    }

    // Generate AI enhancement
    const prompt = `You are an expert motorcycle travel advisor specializing in border crossings.

**IMPORTANT: Respond entirely in ${language}.**
    
Provide practical tips for motorcyclists crossing at: "${crossing.name}"
Location: ${crossing.address || `${crossing.lat}, ${crossing.lng}`}
Country: ${crossing.fromCountry || "Unknown"}

Please provide the following information in a helpful, concise format (in ${language}):

1. MOTORCYCLE TIPS: Specific advice for motorcyclists at this crossing (lane tips, where to park, whether motorcycles can skip car lines, helmet/gear considerations, etc.)

2. WARNINGS: Any safety concerns, scams to watch for, areas to avoid, documentation issues common here

3. BEST TIME TO CROSS: Recommended days/times to minimize wait, when to avoid

4. TIP/PERMIT PROCESS: If this is a US-Mexico border, explain the TIP (Temporary Import Permit) process. For other borders, explain any vehicle permit requirements specific to this crossing point.

Keep each section focused and practical. Use bullet points where helpful. Total response should be under 500 words. Remember to write everything in ${language}.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful motorcycle travel advisor with extensive knowledge of international border crossings, vehicle import permits, and overland travel logistics.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    // Parse the response into sections
    const sections = parseAiResponse(responseText);

    // Update database with AI-generated content
    const updatedCrossing = await prisma.borderCrossing.update({
      where: { id },
      data: {
        motorcycleTips: sections.motorcycleTips,
        warnings: sections.warnings,
        bestTimeToGo: sections.bestTimeToGo,
        tipProcessInfo: sections.tipProcessInfo,
        lastAiEnhanced: new Date(),
      },
    });

    return NextResponse.json({
      crossing: {
        id: updatedCrossing.id,
        motorcycleTips: updatedCrossing.motorcycleTips,
        warnings: updatedCrossing.warnings,
        bestTimeToGo: updatedCrossing.bestTimeToGo,
        tipProcessInfo: updatedCrossing.tipProcessInfo,
      },
      cached: false,
    });
  } catch (err) {
    console.error("Error enhancing border crossing:", err);
    return NextResponse.json({ error: "Failed to generate tips" }, { status: 500 });
  }
}

/**
 * Parse AI response into structured sections
 */
function parseAiResponse(text: string): EnhancementResponse {
  const sections: EnhancementResponse = {
    motorcycleTips: "",
    warnings: "",
    bestTimeToGo: "",
    tipProcessInfo: "",
  };

  // Try to extract sections based on headers
  const motorcycleTipsMatch = text.match(/(?:1\.|MOTORCYCLE TIPS:?|Motorcycle Tips:?)([\s\S]*?)(?=(?:2\.|WARNINGS:?|Warnings:?)|$)/i);
  const warningsMatch = text.match(/(?:2\.|WARNINGS:?|Warnings:?)([\s\S]*?)(?=(?:3\.|BEST TIME|Best Time)|$)/i);
  const bestTimeMatch = text.match(/(?:3\.|BEST TIME[^:]*:?|Best Time[^:]*:?)([\s\S]*?)(?=(?:4\.|TIP\/PERMIT|Tip\/Permit|TIP PROCESS|Tip Process)|$)/i);
  const tipProcessMatch = text.match(/(?:4\.|TIP\/PERMIT[^:]*:?|Tip\/Permit[^:]*:?|TIP PROCESS:?|Tip Process:?)([\s\S]*?)$/i);

  if (motorcycleTipsMatch) {
    sections.motorcycleTips = motorcycleTipsMatch[1].trim();
  }
  if (warningsMatch) {
    sections.warnings = warningsMatch[1].trim();
  }
  if (bestTimeMatch) {
    sections.bestTimeToGo = bestTimeMatch[1].trim();
  }
  if (tipProcessMatch) {
    sections.tipProcessInfo = tipProcessMatch[1].trim();
  }

  // Fallback: if no sections found, put everything in motorcycleTips
  if (!sections.motorcycleTips && !sections.warnings && !sections.bestTimeToGo && !sections.tipProcessInfo) {
    sections.motorcycleTips = text.trim();
  }

  return sections;
}
