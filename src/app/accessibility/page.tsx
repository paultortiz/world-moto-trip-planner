import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Accessibility | World Moto Trip Planner",
};

export default async function AccessibilityPage() {
  const t = await getTranslations("accessibility");

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-3xl space-y-6 text-sm text-slate-200">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-50">{t("title")}</h1>
          <p className="text-xs text-slate-400">{t("lastUpdated")}</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("goalTitle")}</h2>
          <p>{t("goalP1")}</p>
          <p>{t("goalP2")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("workingOnTitle")}</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>{t("workingOnList1")}</li>
            <li>{t("workingOnList2")}</li>
            <li>{t("workingOnList3")}</li>
            <li>{t("workingOnList4")}</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("limitationsTitle")}</h2>
          <p>{t("limitationsP1")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("feedbackTitle")}</h2>
          <p>{t("feedbackP1")}</p>
          <p>{t("feedbackP2")}</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>{t("feedbackList1")}</li>
            <li>{t("feedbackList2")}</li>
            <li>{t("feedbackList3")}</li>
          </ul>
          <p>
            {t("feedbackP3")}{" "}
            <Link href="/privacy" className="text-adv-accent hover:underline">Privacy Policy</Link>
            {" "}{t("and")}{" "}
            <Link href="/terms" className="text-adv-accent hover:underline">Terms of Service</Link>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("improvementTitle")}</h2>
          <p>{t("improvementP1")}</p>
          <p className="text-xs text-slate-500">
            {t("returnHome")}{" "}
            <Link href="/" className="text-adv-accent hover:underline">{t("homePage")}</Link>.
          </p>
        </section>
      </section>
    </main>
  );
}
