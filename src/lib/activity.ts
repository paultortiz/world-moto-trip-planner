import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

/**
 * Activity action types for consistent logging across the application.
 */
export const ActivityActions = {
  // Authentication
  USER_LOGIN: "user.login",
  USER_SIGNUP: "user.signup",

  // Trips
  TRIP_CREATED: "trip.created",
  TRIP_UPDATED: "trip.updated",
  TRIP_DELETED: "trip.deleted",
  TRIP_SHARED: "trip.shared",
  TRIP_CLONED: "trip.cloned",
  TRIP_EXPORTED_GPX: "trip.exported_gpx",
  TRIP_EXPORTED_PDF: "trip.exported_pdf",

  // Waypoints
  WAYPOINT_ADDED: "waypoint.added",
  WAYPOINT_REORDERED: "waypoint.reordered",

  // AI Features
  AI_PLAN_GENERATED: "ai_plan.generated",
  AI_MOTORCYCLE_SPECS: "ai_motorcycle_specs.fetched",

  // Motorcycles
  MOTORCYCLE_ADDED: "motorcycle.added",
  MOTORCYCLE_UPDATED: "motorcycle.updated",
  MOTORCYCLE_DELETED: "motorcycle.deleted",

  // Feedback
  FEEDBACK_SUBMITTED: "feedback.submitted",
} as const;

export type ActivityAction = (typeof ActivityActions)[keyof typeof ActivityActions];

interface LogActivityOptions {
  userId: string | null;
  action: ActivityAction | string;
  metadata?: Record<string, unknown>;
  request?: NextRequest | Request;
}

/**
 * Log a user activity event to the database.
 * This function is fire-and-forget and should not block the main request flow.
 *
 * @param options - The activity logging options
 * @param options.userId - The ID of the user performing the action (null for anonymous)
 * @param options.action - The action type (use ActivityActions constants)
 * @param options.metadata - Additional context about the action
 * @param options.request - The incoming request (used to extract IP and user-agent)
 */
export async function logActivity({
  userId,
  action,
  metadata,
  request,
}: LogActivityOptions): Promise<void> {
  try {
    // Extract IP address and user agent from request headers
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (request) {
      // Try various headers for IP address (handles proxies)
      const headers = request.headers;
      ipAddress =
        headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headers.get("x-real-ip") ||
        headers.get("cf-connecting-ip") || // Cloudflare
        null;

      userAgent = headers.get("user-agent");
    }

    // Create activity log entry and update user's lastActiveAt in parallel
    const logPromise = prisma.activityLog.create({
      data: {
        userId,
        action,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        ipAddress,
        userAgent,
      },
    });

    // Update lastActiveAt if we have a userId
    const updatePromise = userId
      ? prisma.user.update({
          where: { id: userId },
          data: { lastActiveAt: new Date() },
        })
      : Promise.resolve();

    // Run both operations in parallel, but don't await in the calling code
    await Promise.all([logPromise, updatePromise]);
  } catch (error) {
    // Log errors but don't throw - activity logging should never break the main flow
    console.error("Failed to log activity:", error);
  }
}

/**
 * Fire-and-forget version that doesn't await the database operations.
 * Use this when you don't want to add any latency to the request.
 */
export function logActivityAsync(options: LogActivityOptions): void {
  // Fire and forget - don't await
  logActivity(options).catch((error) => {
    console.error("Async activity logging failed:", error);
  });
}
