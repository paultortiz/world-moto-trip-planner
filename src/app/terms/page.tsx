import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Terms of Service | World Moto Trip Planner",
};

export default async function TermsPage() {
  const t = await getTranslations("terms");

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-3xl space-y-6 text-sm text-slate-200">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-50">{t("title")}</h1>
          <p className="text-xs text-slate-400">{t("lastUpdated")}</p>
        </header>

        <p>{t("intro")}</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("riskTitle")}</h2>
          <p>{t("riskP1")}</p>
          <p>{t("riskP2")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("warrantyTitle")}</h2>
          <p>{t("warrantyP1")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("accountsTitle")}</h2>
          <p>{t("accountsP1")}</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>{t("accountsList1")}</li>
            <li>{t("accountsList2")}</li>
            <li>{t("accountsList3")}</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("thirdPartyTitle")}</h2>
          <p>{t("thirdPartyP1")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("changesServiceTitle")}</h2>
          <p>{t("changesServiceP1")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("liabilityTitle")}</h2>
          <p>{t("liabilityP1")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("changesTermsTitle")}</h2>
          <p>{t("changesTermsP1")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("contactTitle")}</h2>
          <p>{t("contactP1")}</p>
          <p className="text-xs text-slate-500">
            {t("returnHome")} <Link href="/" className="text-adv-accent hover:underline">{t("homePage")}</Link>.
          </p>
        </section>
      </section>
    </main>
  );
}
