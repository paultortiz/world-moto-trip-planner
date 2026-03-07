import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * GET /api/vehicle-requirements?country=XX
 * 
 * Returns structured TIP/Carnet requirements for a destination country.
 * If no country param provided, returns all available countries (summary only).
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const countryCode = searchParams.get("country")?.toUpperCase();

  try {
    if (countryCode) {
      // Fetch specific country requirements
      const requirements = await prisma.vehicleEntryRequirement.findUnique({
        where: { destCountry: countryCode },
      });

      if (!requirements) {
        return NextResponse.json(
          { 
            error: "Country not found", 
            message: `No vehicle entry requirements data available for country code: ${countryCode}` 
          },
          { status: 404 }
        );
      }

      return NextResponse.json({ requirements });
    } else {
      // Return summary list of all available countries
      const countries = await prisma.vehicleEntryRequirement.findMany({
        select: {
          destCountry: true,
          countryName: true,
          tipRequired: true,
          carnetRequired: true,
          lastVerified: true,
        },
        orderBy: { countryName: "asc" },
      });

      return NextResponse.json({ 
        countries,
        total: countries.length,
      });
    }
  } catch (error) {
    console.error("Error fetching vehicle requirements:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle requirements" },
      { status: 500 }
    );
  }
}
