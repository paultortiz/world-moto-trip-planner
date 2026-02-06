import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import MotorcyclesClient from "./MotorcyclesClient";

export default async function MotorcyclesPage() {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    redirect("/api/auth/signin?callbackUrl=/motorcycles");
  }

  const userId = (session.user as any).id as string;
  const t = await getTranslations("garage");

  const motorcycles = await prisma.motorcycle.findMany({
    where: { userId },
    orderBy: [
      { isDefaultForNewTrips: "desc" },
      { year: "desc" },
      { make: "asc" },
      { model: "asc" },
    ],
    include: {
      _count: {
        select: { trips: true },
      },
    },
  });

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {t("subtitle")}
          </p>
        </header>

        <MotorcyclesClient motorcycles={motorcycles} />
      </section>
    </main>
  );
}
