import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TripPdfDocument } from "@/components/pdf/TripPdfDocument";
import React from "react";

// Labels for PDF content (will be localized based on query param)
const LABELS: Record<string, Record<string, string>> = {
  en: {
    tripItinerary: "Trip Itinerary",
    overview: "Overview",
    totalDistance: "Total Distance",
    estimatedDuration: "Est. Duration",
    totalWaypoints: "Waypoints",
    motorcycle: "Motorcycle",
    day: "Day",
    dailyItinerary: "Daily Itinerary",
    emergencyContacts: "Emergency Contacts",
    emergencyName: "Name",
    emergencyPhone: "Phone",
    emergencyRelation: "Relation",
    checklist: "Pre-Trip Checklist",
    generatedOn: "Generated",
    distanceUnit: "km",
    durationUnit: "hours",
    noName: "Unnamed waypoint",
  },
  es: {
    tripItinerary: "Itinerario del Viaje",
    overview: "Resumen",
    totalDistance: "Distancia Total",
    estimatedDuration: "Duración Est.",
    totalWaypoints: "Puntos",
    motorcycle: "Motocicleta",
    day: "Día",
    dailyItinerary: "Itinerario Diario",
    emergencyContacts: "Contactos de Emergencia",
    emergencyName: "Nombre",
    emergencyPhone: "Teléfono",
    emergencyRelation: "Relación",
    checklist: "Lista Pre-Viaje",
    generatedOn: "Generado",
    distanceUnit: "km",
    durationUnit: "horas",
    noName: "Punto sin nombre",
  },
  de: {
    tripItinerary: "Reiseroute",
    overview: "Übersicht",
    totalDistance: "Gesamtstrecke",
    estimatedDuration: "Gesch. Dauer",
    totalWaypoints: "Wegpunkte",
    motorcycle: "Motorrad",
    day: "Tag",
    dailyItinerary: "Tagesroute",
    emergencyContacts: "Notfallkontakte",
    emergencyName: "Name",
    emergencyPhone: "Telefon",
    emergencyRelation: "Beziehung",
    checklist: "Reise-Checkliste",
    generatedOn: "Erstellt",
    distanceUnit: "km",
    durationUnit: "Stunden",
    noName: "Unbenannter Punkt",
  },
  fr: {
    tripItinerary: "Itinéraire du Voyage",
    overview: "Aperçu",
    totalDistance: "Distance Totale",
    estimatedDuration: "Durée Est.",
    totalWaypoints: "Points",
    motorcycle: "Moto",
    day: "Jour",
    dailyItinerary: "Itinéraire Quotidien",
    emergencyContacts: "Contacts d'Urgence",
    emergencyName: "Nom",
    emergencyPhone: "Téléphone",
    emergencyRelation: "Relation",
    checklist: "Check-list Pré-Voyage",
    generatedOn: "Généré",
    distanceUnit: "km",
    durationUnit: "heures",
    noName: "Point sans nom",
  },
  pt: {
    tripItinerary: "Itinerário da Viagem",
    overview: "Resumo",
    totalDistance: "Distância Total",
    estimatedDuration: "Duração Est.",
    totalWaypoints: "Pontos",
    motorcycle: "Motocicleta",
    day: "Dia",
    dailyItinerary: "Itinerário Diário",
    emergencyContacts: "Contatos de Emergência",
    emergencyName: "Nome",
    emergencyPhone: "Telefone",
    emergencyRelation: "Relação",
    checklist: "Lista Pré-Viagem",
    generatedOn: "Gerado",
    distanceUnit: "km",
    durationUnit: "horas",
    noName: "Ponto sem nome",
  },
};

function buildStaticMapUrl(
  waypoints: Array<{ lat: number; lng: number }>,
  apiKey: string,
): string | null {
  if (waypoints.length < 2) return null;

  const size = "640x300";
  const maptype = "roadmap";

  // Build path for the route
  const pathPoints = waypoints
    .map((wp) => `${wp.lat},${wp.lng}`)
    .join("|");

  // Markers for start and end
  const startMarker = `markers=color:green|label:S|${waypoints[0].lat},${waypoints[0].lng}`;
  const endMarker = `markers=color:red|label:E|${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;

  // Encode the path
  const pathParam = `path=color:0xf97316ff|weight:3|${pathPoints}`;

  return `https://maps.googleapis.com/maps/api/staticmap?size=${size}&maptype=${maptype}&${startMarker}&${endMarker}&${pathParam}&key=${apiKey}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: tripId } = await params;
    const locale = req.nextUrl.searchParams.get("locale") || "en";
    const labels = LABELS[locale] || LABELS.en;

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        waypoints: { orderBy: { orderIndex: "asc" } },
        motorcycle: true,
        checklistItems: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Verify ownership
    if (trip.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build static map URL if API key is available
    const mapsApiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    const staticMapUrl =
      mapsApiKey && trip.waypoints.length >= 2
        ? buildStaticMapUrl(trip.waypoints, mapsApiKey)
        : null;

    // Prepare data for PDF
    const pdfProps = {
      tripName: trip.name,
      tripDescription: trip.description,
      startDate: trip.startDate?.toISOString() ?? null,
      endDate: trip.endDate?.toISOString() ?? null,
      totalDistanceKm:
        trip.totalDistanceMeters != null
          ? trip.totalDistanceMeters / 1000
          : null,
      totalDurationHours:
        trip.totalDurationSeconds != null
          ? trip.totalDurationSeconds / 3600
          : null,
      waypoints: trip.waypoints.map((wp) => ({
        id: wp.id,
        lat: wp.lat,
        lng: wp.lng,
        name: wp.name,
        type: wp.type,
        notes: wp.notes,
        dayIndex: wp.dayIndex,
      })),
      motorcycle: trip.motorcycle
        ? {
            displayName: trip.motorcycle.displayName,
            year: trip.motorcycle.year,
            make: trip.motorcycle.make,
            model: trip.motorcycle.model,
            engineDisplacementCc: trip.motorcycle.engineDisplacementCc,
            fuelCapacityLiters: trip.motorcycle.fuelCapacityLiters,
            estimatedRangeKm: trip.motorcycle.estimatedRangeKm,
          }
        : null,
      checklistItems: trip.checklistItems.map((item) => ({
        label: item.label,
        isDone: item.isDone,
      })),
      staticMapUrl,
      generatedAt: new Date().toLocaleString(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      labels,
    };

    // Render PDF to buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(TripPdfDocument, pdfProps),
    );

    // Create sanitized filename
    const sanitizedName = trip.name
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 50);
    const filename = `${sanitizedName}-itinerary.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
