import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Data Deletion Instructions | World Moto Trip Planner",
};

export default async function DataDeletionPage() {
  const t = await getTranslations("dataDeletion");

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-3xl space-y-6 text-sm text-slate-200">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-50">{t("title")}</h1>
          <p className="text-xs text-slate-400">{t("lastUpdated")}</p>
        </header>

        <p>{t("intro")}</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("whatDeletedTitle")}</h2>
          <p>{t("whatDeletedP1")}</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>{t("whatDeletedList1")}</li>
            <li>{t("whatDeletedList2")}</li>
            <li>{t("whatDeletedList3")}</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("howToTitle")}</h2>
          <p>{t("howToP1")}</p>
          <ol className="list-decimal space-y-1 pl-5 text-slate-300">
            <li>{t("howToList1")}</li>
            <li>{t("howToList2")}</li>
          </ol>
          <p>{t("howToP2")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("thirdPartyTitle")}</h2>
          <p>{t("thirdPartyP1")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("moreInfoTitle")}</h2>
          <p>
            {t("moreInfoP1")}{" "}
            <Link href="/privacy" className="text-adv-accent hover:underline">
              {t("privacyPolicyLink")}
            </Link>
            .
          </p>
          <p className="text-xs text-slate-500">
            {t("returnHome")} <Link href="/" className="text-adv-accent hover:underline">{t("homePage")}</Link>.
          </p>
        </section>
      </section>
    </main>
  );
}
