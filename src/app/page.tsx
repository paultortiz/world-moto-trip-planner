import Link from "next/link";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const session = await auth();
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");

  const featureCategories = [
    {
      title: t("featureCategories.routePlanning.title"),
      icon: "🗺️",
      features: [
        t("featureCategories.routePlanning.f1"),
        t("featureCategories.routePlanning.f2"),
        t("featureCategories.routePlanning.f3"),
        t("featureCategories.routePlanning.f4"),
      ],
    },
    {
      title: t("featureCategories.aiPlanning.title"),
      icon: "🤖",
      features: [
        t("featureCategories.aiPlanning.f1"),
        t("featureCategories.aiPlanning.f2"),
        t("featureCategories.aiPlanning.f3"),
        t("featureCategories.aiPlanning.f4"),
      ],
    },
    {
      title: t("featureCategories.fuelRange.title"),
      icon: "⛽",
      features: [
        t("featureCategories.fuelRange.f1"),
        t("featureCategories.fuelRange.f2"),
        t("featureCategories.fuelRange.f3"),
        t("featureCategories.fuelRange.f4"),
      ],
    },
    {
      title: t("featureCategories.rideSimulation.title"),
      icon: "🏍️",
      features: [
        t("featureCategories.rideSimulation.f1"),
        t("featureCategories.rideSimulation.f2"),
        t("featureCategories.rideSimulation.f3"),
        t("featureCategories.rideSimulation.f4"),
      ],
    },
    {
      title: t("featureCategories.borderCrossing.title"),
      icon: "🛂",
      features: [
        t("featureCategories.borderCrossing.f1"),
        t("featureCategories.borderCrossing.f2"),
        t("featureCategories.borderCrossing.f3"),
      ],
    },
    {
      title: t("featureCategories.tripManagement.title"),
      icon: "📋",
      features: [
        t("featureCategories.tripManagement.f1"),
        t("featureCategories.tripManagement.f2"),
        t("featureCategories.tripManagement.f3"),
        t("featureCategories.tripManagement.f4"),
      ],
    },
  ];

  return (
    <main className="min-h-screen px-6 py-12">
      {/* Hero Section */}
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-10 md:flex-row md:items-center">
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
                <span>{t("features.aiPowered")}</span>
              </div>
              <div className="flex items-center gap-2 rounded border border-adv-border bg-slate-900/60 px-3 py-2 shadow-adv-glow">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                <span>{t("features.fuelPlanning")}</span>
              </div>
              <div className="flex items-center gap-2 rounded border border-adv-border bg-slate-900/60 px-3 py-2 shadow-adv-glow">
                <span className="inline-block h-2 w-2 rounded-full bg-teal-400" />
                <span>{t("features.rideSimulation")}</span>
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
            <div className="relative h-72 w-full max-w-sm rounded-xl border border-adv-border bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow-adv-glow">
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
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{t("demoCard.days")}</span>
                    <span className="font-mono">45 {t("demoCard.daysUnit")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{t("demoCard.countries")}</span>
                    <span className="font-mono">12 {t("demoCard.countriesUnit")}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-teal-400" />
                  <span className="text-[11px] text-slate-400">
                    {t("demoCard.hint")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto mt-20 max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("featuresSection.title")}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {t("featuresSection.subtitle")}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featureCategories.map((category) => (
            <div
              key={category.title}
              className="rounded-lg border border-adv-border bg-slate-900/50 p-5 shadow-adv-glow transition-colors hover:bg-slate-900/70"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">{category.icon}</span>
                <h3 className="text-sm font-semibold text-slate-100">{category.title}</h3>
              </div>
              <ul className="space-y-1.5 text-[12px] text-slate-400">
                {category.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-adv-accent" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA for non-signed-in users */}
      {!session && (
        <section className="mx-auto mt-16 max-w-2xl text-center">
          <div className="rounded-lg border border-adv-border bg-gradient-to-b from-slate-900/80 to-slate-950 p-6 shadow-adv-glow">
            <p className="text-sm text-slate-300">
              {t("bottomCta.text")}
            </p>
            <Link
              href="/api/auth/signin?callbackUrl=/trips"
              className="mt-4 inline-flex items-center gap-2 rounded bg-adv-accent px-5 py-2.5 text-sm font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted"
            >
              {t("bottomCta.button")}
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
