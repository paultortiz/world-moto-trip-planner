import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { year, make, model } = body ?? {};

  const yearNum = typeof year === "number" && Number.isFinite(year) ? year : null;
  const makeStr = typeof make === "string" ? make.trim() : "";
  const modelStr = typeof model === "string" ? model.trim() : "";

  if (!yearNum || !makeStr || !modelStr) {
    return NextResponse.json(
      { error: "year, make, and model are required" },
      { status: 400 },
    );
  }

  try {
    const displayName = `${yearNum} ${makeStr} ${modelStr}`.trim();

    const moto = await prisma.motorcycle.create({
      data: {
        userId,
        year: yearNum,
        make: makeStr,
        model: modelStr,
        displayName,
      },
    });

    return NextResponse.json(moto, { status: 201 });
  } catch (error) {
    console.error("Error creating motorcycle", error);
    return NextResponse.json({ error: "Failed to create motorcycle" }, { status: 500 });
  }
}
