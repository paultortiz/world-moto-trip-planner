import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    redirect("/api/auth/signin?callbackUrl=/trips");
  }

  const userId = (session.user as any).id as string;

  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="min-h-screen p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Your routes</h1>
        <p className="mt-2 text-sm text-slate-400">
          Saved legs, crossings, and loops you&apos;ve mapped out for the next ride.
        </p>
      </header>

      <section>
        {trips.length === 0 ? (
          <p className="text-sm text-slate-500">
            No routes yet. Start by plotting a shakedown loop near home.
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
                    ID: <span className="font-mono">{trip.id}</span>
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
