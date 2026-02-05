import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import NewTripClient from "./NewTripClient";

export default async function NewTripPage() {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    redirect("/api/auth/signin?callbackUrl=/trips/new");
  }

  const userId = (session.user as any).id as string;

  const motorcycles = await prisma.motorcycle.findMany({
    where: { userId },
    orderBy: [
      { isDefaultForNewTrips: "desc" },
      { year: "desc" },
      { make: "asc" },
      { model: "asc" },
    ],
  });

  return <NewTripClient motorcycles={motorcycles} />;
}
