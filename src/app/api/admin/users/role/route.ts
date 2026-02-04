import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const ALLOWED_ROLES = ["USER", "ADMIN", "SPONSOR"] as const;

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, role: nextRole } = body ?? {};

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (!ALLOWED_ROLES.includes(nextRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: nextRole },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating user role", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}
