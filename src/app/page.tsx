import Link from "next/link";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const session = await auth();
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");

  return (
    <main className="min-h-screen px-6 py-12">
      <section className="mx-auto flex max-w-5xl flex-col gap-10 md:flex-row md:items-center">
        <div className="flex-1 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-adv-accentSoft">
              {t("tagline")}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              {t("title")}
              <span className="block bg-gradient-to-r from-adv-accent to-adv-accentMuted bg-clip-text text-transparent">
                {t("titleHighlight")}
              </span>
            </h1>
            <p className="mt-4 text-sm text-slate-300 sm:text-base">
              {t("description")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2 rounded border border-adv-border bg-slate-900/60 px-3 py-2 shadow-adv-glow">
              <span className="inline-block h-2 w-2 rounded-full bg-adv-accent" />
              <span>{t("features.routing")}</span>
            </div>
            <div className="flex items-center gap-2 rounded border border-adv-border bg-slate-900/60 px-3 py-2 shadow-adv-glow">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
              <span>{t("features.waypoints")}</span>
            </div>
            <div className="flex items-center gap-2 rounded border border-adv-border bg-slate-900/60 px-3 py-2 shadow-adv-glow">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <span>{t("features.estimates")}</span>
            </div>
          </div>

          <div className="rounded border border-adv-border bg-slate-900/70 p-4 text-sm text-slate-200 shadow-adv-glow">
            {session ? (
              <>
                <p>
                  {t("signedInAs")} <span className="font-mono">{session.user?.email}</span>.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href="/trips"
                    className="rounded bg-adv-accent px-4 py-2 text-sm font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted"
                  >
                    {t("goToTrips")}
                  </Link>
                  <Link
                    href="/api/auth/signout?callbackUrl=/"
                    className="rounded border border-adv-border px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
                  >
                    {tCommon("signOut")}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p>
                  {t("signInPrompt")}
                </p>
                <div className="mt-4">
                  <Link
                    href="/api/auth/signin?callbackUrl=/trips"
                    className="inline-flex items-center gap-2 rounded bg-adv-accent px-4 py-2 text-sm font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted"
                  >
                    <span className="inline-block h-1.5 w-6 rounded-full bg-black/40" />
                    {tCommon("signInWithGoogle")}
                  </Link>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {t("termsAgreement")}{" "}
                    <Link href="/terms" className="text-adv-accent hover:underline">
                      {t("termsOfService")}
                    </Link>{" "}
                    {t("and")}{" "}
                    <Link href="/privacy" className="text-adv-accent hover:underline">
                      {t("privacyPolicy")}
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
                <span className="font-mono text-[11px] text-slate-400">{t("demoCard.advTrack")}</span>
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-adv-accentSoft">
                  {t("demoCard.livePlanning")}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t("demoCard.route")}</span>
                  <span className="font-mono">Denver → Ushuaia</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t("demoCard.distance")}</span>
                  <span className="font-mono">~15,000 km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t("demoCard.saddleTime")}</span>
                  <span className="font-mono">200+ hrs</span>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-adv-accent" />
                <span className="text-[11px] text-slate-400">
                  {t("demoCard.hint")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
