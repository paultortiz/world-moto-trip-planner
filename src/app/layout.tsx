import type { Metadata } from "next";
import Link from "next/link";
import "../styles/globals.css";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "World Moto Trip Planner",
  description: "Plan and visualize motorcycle trips around the world with Google Maps.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  return (
    <html lang="en">
      <body className="min-h-screen bg-adv-night text-slate-100">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-adv-border bg-slate-900/80 backdrop-blur">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm font-semibold tracking-wide"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-adv-accent to-adv-accentMuted text-xs font-bold text-black shadow-adv-glow">
                  ADV
                </span>
                <span className="text-slate-50">World Moto Trip Planner</span>
              </Link>
              <div className="flex items-center gap-4 text-xs">
                {session ? (
                  <>
                    <Link href="/trips" className="text-slate-200 hover:text-adv-accent">
                      Trips
                    </Link>
                    <Link href="/trips/new" className="text-slate-200 hover:text-adv-accent">
                      New trip
                    </Link>
                    {(role === "SPONSOR" || role === "ADMIN") && (
                      <Link href="/sponsor" className="text-slate-200 hover:text-adv-accent">
                        Sponsor
                      </Link>
                    )}
                    {role === "ADMIN" && (
                      <Link href="/administrator" className="text-slate-200 hover:text-adv-accent">
                        Admin
                      </Link>
                    )}
                    <span className="hidden text-slate-400 sm:inline">
                      {session.user?.email}
                    </span>
                    <Link
                      href="/api/auth/signout?callbackUrl=/"
                      className="rounded border border-adv-accent/50 px-3 py-1 font-semibold text-adv-accent hover:bg-adv-accent/10"
                    >
                      Sign out
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/api/auth/signin?callbackUrl=/trips"
                    className="rounded bg-adv-accent px-3 py-1 text-xs font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-adv-border bg-slate-900/80 text-[11px] text-slate-400">
            <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-slate-500">
                World Moto Trip Planner · For trip planning only. Always ride within your limits and
                verify conditions on the ground.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/terms" className="hover:text-adv-accent">
                  Terms of service
                </Link>
                <Link href="/privacy" className="hover:text-adv-accent">
                  Privacy policy
                </Link>
                <Link href="/accessibility" className="hover:text-adv-accent">
                  Accessibility commitment
                </Link>
                <Link href="/data-deletion" className="hover:text-adv-accent">
                  Data deletion instructions
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
