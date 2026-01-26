import Link from "next/link";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="min-h-screen px-6 py-12">
      <section className="mx-auto flex max-w-5xl flex-col gap-10 md:flex-row md:items-center">
        <div className="flex-1 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-adv-accentSoft">
              Adventure route planning
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Plot your next
              <span className="block bg-gradient-to-r from-adv-accent to-adv-accentMuted bg-clip-text text-transparent">
                world moto adventure
              </span>
            </h1>
            <p className="mt-4 text-sm text-slate-300 sm:text-base">
              String together mountain passes, gravel tracks, and border crossings.
              World Moto Trip Planner combines Google Maps routing with a lightweight
              trip log built for long-distance riders.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2 rounded border border-adv-border bg-slate-900/60 px-3 py-2 shadow-adv-glow">
              <span className="inline-block h-2 w-2 rounded-full bg-adv-accent" />
              <span>Dirt &amp; tarmac friendly routing</span>
            </div>
            <div className="flex items-center gap-2 rounded border border-adv-border bg-slate-900/60 px-3 py-2 shadow-adv-glow">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
              <span>Waypoint types for fuel, lodging, and POIs</span>
            </div>
            <div className="flex items-center gap-2 rounded border border-adv-border bg-slate-900/60 px-3 py-2 shadow-adv-glow">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <span>Distance and saddle-time estimates</span>
            </div>
          </div>

          <div className="rounded border border-adv-border bg-slate-900/70 p-4 text-sm text-slate-200 shadow-adv-glow">
            {session ? (
              <>
                <p>
                  Signed in as <span className="font-mono">{session.user?.email}</span>.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href="/trips"
                    className="rounded bg-adv-accent px-4 py-2 text-sm font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted"
                  >
                    Go to your trips
                  </Link>
                  <Link
                    href="/api/auth/signout?callbackUrl=/"
                    className="rounded border border-adv-border px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
                  >
                    Sign out
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p>
                  Sign in with Google to start laying out cross-continent routes, fuel stops,
                  and waypoints you actually care about.
                </p>
                <div className="mt-4">
                  <Link
                    href="/api/auth/signin?callbackUrl=/trips"
                    className="inline-flex items-center gap-2 rounded bg-adv-accent px-4 py-2 text-sm font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted"
                  >
                    <span className="inline-block h-1.5 w-6 rounded-full bg-black/40" />
                    Sign in with Google
                  </Link>
                  <p className="mt-2 text-[11px] text-slate-400">
                    By signing in you agree to our{" "}
                    <Link href="/privacy" className="text-adv-accent hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-10 hidden flex-1 items-center justify-center md:flex">
          <div className="relative h-64 w-full max-w-sm rounded-xl border border-adv-border bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow-adv-glow">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_55%)]" />
            <div className="flex h-full flex-col justify-between text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-slate-400">ADV TRACK</span>
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-adv-accentSoft">
                  LIVE PLANNING
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Route</span>
                  <span className="font-mono">Denver → Ushuaia</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Distance</span>
                  <span className="font-mono">~15,000 km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Saddle time</span>
                  <span className="font-mono">200+ hrs</span>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-adv-accent" />
                <span className="text-[11px] text-slate-400">
                  Drop waypoints, then fine-tune in the editor. Your track updates as you go.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
