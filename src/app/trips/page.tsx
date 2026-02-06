import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    redirect("/api/auth/signin?callbackUrl=/trips");
  }

  const userId = (session.user as any).id as string;
  const t = await getTranslations("trips");

  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="min-h-screen p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {t("subtitle")}
        </p>
      </header>

      <section>
        {trips.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t("noTrips")}
          </p>
        ) : (
          <ul className="space-y-3">
            {trips.map((trip) => (
              <li
                key={trip.id}
                className="rounded border border-adv-border bg-slate-900/80 p-3 shadow-adv-glow transition hover:border-adv-accent/70 hover:bg-slate-900"
              >
                <Link href={`/trips/${trip.id}`} className="block">
                  <h2 className="font-semibold text-slate-50">{trip.name}</h2>
                  {trip.description && (
                    <p className="text-xs text-slate-400">{trip.description}</p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-500">
                    {t("id")}: <span className="font-mono">{trip.id}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
