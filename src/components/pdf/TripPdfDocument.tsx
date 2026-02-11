import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from "@react-pdf/renderer";

// Brand colors
const COLORS = {
  accent: "#f97316", // orange
  accentDark: "#ea580c",
  dark: "#020617",
  border: "#334155",
  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  white: "#ffffff",
  lightBg: "#f8fafc",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  appName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
  },
  tripTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
    marginBottom: 4,
  },
  tripDates: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 15,
  },
  tripDescription: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 1.5,
  },
  overviewBox: {
    backgroundColor: COLORS.lightBg,
    padding: 15,
    borderRadius: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overviewTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
    marginBottom: 10,
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  overviewItem: {
    width: "45%",
  },
  overviewLabel: {
    fontSize: 8,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overviewValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
    marginTop: 2,
  },
  mapImage: {
    width: "100%",
    height: 200,
    marginBottom: 20,
    borderRadius: 4,
    objectFit: "cover",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    padding: 8,
    marginTop: 15,
    marginBottom: 8,
    borderRadius: 4,
  },
  dayTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  dayStats: {
    fontSize: 9,
    color: COLORS.white,
  },
  waypointRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  waypointIndex: {
    width: 25,
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  waypointIcon: {
    width: 20,
    fontSize: 10,
  },
  waypointDetails: {
    flex: 1,
  },
  waypointName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
  },
  waypointCoords: {
    fontSize: 8,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  waypointNotes: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontStyle: "italic",
  },
  emergencySection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  emergencyTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 10,
  },
  emergencyLine: {
    flexDirection: "row",
    marginBottom: 8,
  },
  emergencyLabel: {
    width: 120,
    fontSize: 10,
    color: "#92400e",
  },
  emergencyBlank: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#d97706",
    borderBottomStyle: "dotted",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.textSecondary,
  },
  checklistSection: {
    marginTop: 20,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 8,
  },
  checklistBox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 2,
  },
  checklistLabel: {
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  motorcycleSection: {
    marginTop: 15,
    padding: 12,
    backgroundColor: COLORS.lightBg,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  motorcycleName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
    marginBottom: 6,
  },
  motorcycleSpecs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  motorcycleSpec: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
});

// Waypoint type labels (text abbreviations for PDF compatibility - emojis don't render)
const WAYPOINT_LABELS: Record<string, string> = {
  FUEL: "[F]",
  LODGING: "[H]",
  CAMPGROUND: "[C]",
  DINING: "[D]",
  POI: "[*]",
  CHECKPOINT: "[>]",
  OTHER: "[-]",
};

interface WaypointData {
  id?: string;
  lat: number;
  lng: number;
  name?: string | null;
  type?: string | null;
  notes?: string | null;
  dayIndex?: number | null;
}

interface MotorcycleData {
  displayName?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  engineDisplacementCc?: number | null;
  fuelCapacityLiters?: number | null;
  estimatedRangeKm?: number | null;
}

interface ChecklistItem {
  label: string;
  isDone: boolean;
}

interface TripPdfDocumentProps {
  tripName: string;
  tripDescription?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  totalDistanceKm?: number | null;
  totalDurationHours?: number | null;
  waypoints: WaypointData[];
  motorcycle?: MotorcycleData | null;
  checklistItems?: ChecklistItem[];
  staticMapUrl?: string | null;
  generatedAt: string;
  labels: {
    tripItinerary: string;
    overview: string;
    totalDistance: string;
    estimatedDuration: string;
    totalWaypoints: string;
    motorcycle: string;
    day: string;
    dailyItinerary: string;
    emergencyContacts: string;
    emergencyName: string;
    emergencyPhone: string;
    emergencyRelation: string;
    checklist: string;
    generatedOn: string;
    distanceUnit: string;
    durationUnit: string;
    noName: string;
  };
}

export function TripPdfDocument({
  tripName,
  tripDescription,
  startDate,
  endDate,
  totalDistanceKm,
  totalDurationHours,
  waypoints,
  motorcycle,
  checklistItems,
  staticMapUrl,
  generatedAt,
  labels,
}: TripPdfDocumentProps) {
  // Group waypoints by day
  const waypointsByDay = new Map<number, WaypointData[]>();
  let currentDay = 1;
  
  for (const wp of waypoints) {
    if (typeof wp.dayIndex === "number" && wp.dayIndex >= 1) {
      currentDay = wp.dayIndex;
    }
    const dayWaypoints = waypointsByDay.get(currentDay) || [];
    dayWaypoints.push(wp);
    waypointsByDay.set(currentDay, dayWaypoints);
  }

  const days = Array.from(waypointsByDay.entries()).sort(([a], [b]) => a - b);

  // Format date range
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const dateRange = [formatDate(startDate), formatDate(endDate)]
    .filter(Boolean)
    .join(" – ");

  const motorcycleName = motorcycle
    ? motorcycle.displayName ||
      [motorcycle.year, motorcycle.make, motorcycle.model]
        .filter(Boolean)
        .join(" ")
    : null;

  return (
    <Document>
      {/* Cover / Overview Page */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>ADV</Text>
            </View>
            <Text style={styles.appName}>World Moto Trip Planner</Text>
          </View>
          <Text style={{ fontSize: 9, color: COLORS.textSecondary }}>
            {labels.tripItinerary}
          </Text>
        </View>

        {/* Trip Title */}
        <Text style={styles.tripTitle}>{tripName}</Text>
        {dateRange && <Text style={styles.tripDates}>{dateRange}</Text>}
        {tripDescription && (
          <Text style={styles.tripDescription}>{tripDescription}</Text>
        )}

        {/* Static Map */}
        {staticMapUrl && (
          <Image src={staticMapUrl} style={styles.mapImage} />
        )}

        {/* Overview Box */}
        <View style={styles.overviewBox}>
          <Text style={styles.overviewTitle}>{labels.overview}</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>{labels.totalDistance}</Text>
              <Text style={styles.overviewValue}>
                {totalDistanceKm != null
                  ? `${totalDistanceKm.toFixed(0)} ${labels.distanceUnit}`
                  : "—"}
              </Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>{labels.estimatedDuration}</Text>
              <Text style={styles.overviewValue}>
                {totalDurationHours != null
                  ? `${totalDurationHours.toFixed(1)} ${labels.durationUnit}`
                  : "—"}
              </Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>{labels.totalWaypoints}</Text>
              <Text style={styles.overviewValue}>{waypoints.length}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>{labels.motorcycle}</Text>
              <Text style={styles.overviewValue}>
                {motorcycleName || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Motorcycle Details */}
        {motorcycle && motorcycleName && (
          <View style={styles.motorcycleSection}>
            <Text style={styles.motorcycleName}>{motorcycleName}</Text>
            <View style={styles.motorcycleSpecs}>
              {motorcycle.engineDisplacementCc && (
                <Text style={styles.motorcycleSpec}>
                  Engine: {motorcycle.engineDisplacementCc}cc
                </Text>
              )}
              {motorcycle.fuelCapacityLiters && (
                <Text style={styles.motorcycleSpec}>
                  Fuel: {motorcycle.fuelCapacityLiters}L
                </Text>
              )}
              {motorcycle.estimatedRangeKm && (
                <Text style={styles.motorcycleSpec}>
                  Range: {motorcycle.estimatedRangeKm}km
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{labels.generatedOn}: {generatedAt}</Text>
          <Link src="https://worldtripplanner.motorcycles" style={{ color: COLORS.accent }}>
            worldtripplanner.motorcycles
          </Link>
        </View>
      </Page>

      {/* Daily Itinerary Pages */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{labels.dailyItinerary}</Text>

        {days.map(([day, dayWaypoints]) => (
          <View key={day} wrap={false}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>
                {labels.day} {day}
              </Text>
              <Text style={styles.dayStats}>
                {dayWaypoints.length} waypoints
              </Text>
            </View>

            {dayWaypoints.map((wp, idx) => (
              <View key={wp.id || idx} style={styles.waypointRow}>
                <Text style={styles.waypointIndex}>{idx + 1}</Text>
                <Text style={styles.waypointIcon}>
                  {WAYPOINT_LABELS[wp.type || "CHECKPOINT"] || "[-]"}
                </Text>
                <View style={styles.waypointDetails}>
                  <Text style={styles.waypointName}>
                    {wp.name || labels.noName}
                  </Text>
                  <Text style={styles.waypointCoords}>
                    {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                  </Text>
                  {wp.notes && (
                    <Text style={styles.waypointNotes}>{wp.notes}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{labels.generatedOn}: {generatedAt}</Text>
          <Link src="https://worldtripplanner.motorcycles" style={{ color: COLORS.accent }}>
            worldtripplanner.motorcycles
          </Link>
        </View>
      </Page>

      {/* Reference / Emergency Page */}
      <Page size="A4" style={styles.page}>
        {/* Emergency Contacts */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencyTitle}>{labels.emergencyContacts}</Text>
          <View style={styles.emergencyLine}>
            <Text style={styles.emergencyLabel}>{labels.emergencyName}:</Text>
            <View style={styles.emergencyBlank} />
          </View>
          <View style={styles.emergencyLine}>
            <Text style={styles.emergencyLabel}>{labels.emergencyPhone}:</Text>
            <View style={styles.emergencyBlank} />
          </View>
          <View style={styles.emergencyLine}>
            <Text style={styles.emergencyLabel}>{labels.emergencyRelation}:</Text>
            <View style={styles.emergencyBlank} />
          </View>
          <View style={{ height: 10 }} />
          <View style={styles.emergencyLine}>
            <Text style={styles.emergencyLabel}>{labels.emergencyName}:</Text>
            <View style={styles.emergencyBlank} />
          </View>
          <View style={styles.emergencyLine}>
            <Text style={styles.emergencyLabel}>{labels.emergencyPhone}:</Text>
            <View style={styles.emergencyBlank} />
          </View>
          <View style={styles.emergencyLine}>
            <Text style={styles.emergencyLabel}>{labels.emergencyRelation}:</Text>
            <View style={styles.emergencyBlank} />
          </View>
        </View>

        {/* Checklist */}
        {checklistItems && checklistItems.length > 0 && (
          <View style={styles.checklistSection}>
            <Text style={styles.sectionTitle}>{labels.checklist}</Text>
            {checklistItems.map((item, idx) => (
              <View key={idx} style={styles.checklistItem}>
                <View style={styles.checklistBox} />
                <Text style={styles.checklistLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{labels.generatedOn}: {generatedAt}</Text>
          <Link src="https://worldtripplanner.motorcycles" style={{ color: COLORS.accent }}>
            worldtripplanner.motorcycles
          </Link>
        </View>
      </Page>
    </Document>
  );
}
