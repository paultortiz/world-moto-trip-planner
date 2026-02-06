import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Privacy Policy | World Moto Trip Planner",
};

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-3xl space-y-6 text-sm text-slate-200">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-50">{t("title")}</h1>
          <p className="text-xs text-slate-400">{t("lastUpdated")}</p>
        </header>

        <p>{t("intro")}</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("authTitle")}</h2>
          <p>{t("authP1")}</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>{t("authList1")}</li>
            <li>{t("authList2")}</li>
            <li>{t("authList3")}</li>
          </ul>
          <p>{t("authP2")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("tripDataTitle")}</h2>
          <p>{t("tripDataP1")}</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>{t("tripDataList1")}</li>
            <li>{t("tripDataList2")}</li>
            <li>{t("tripDataList3")}</li>
            <li>{t("tripDataList4")}</li>
            <li>{t("tripDataList5")}</li>
            <li>{t("tripDataList6")}</li>
          </ul>
          <p>{t("tripDataP2")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("thirdPartyTitle")}</h2>
          <p>{t("thirdPartyP1")}</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>
              <span className="font-semibold">Google Maps Platform</span> {t("thirdPartyList1")}
            </li>
            <li>
              <span className="font-semibold">Google</span> & <span className="font-semibold">Facebook</span> {t("thirdPartyList2")}
            </li>
            <li>
              <span className="font-semibold">Database hosting</span> {t("thirdPartyList3")}
            </li>
          </ul>
          <p>{t("thirdPartyP2")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("cookiesTitle")}</h2>
          <p>{t("cookiesP1")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("dataShareTitle")}</h2>
          <p>{t("dataShareP1")}</p>
          <p>{t("dataShareP2")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("choicesTitle")}</h2>
          <p>{t("choicesP1")}</p>
          <p>
            {t("choicesP2")}{" "}
            <Link href="/data-deletion" className="text-adv-accent hover:underline">
              {t("dataDeletionLink")}
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">{t("contactTitle")}</h2>
          <p>{t("contactP1")}</p>
          <p className="text-xs text-slate-500">{t("contactP2")}</p>
          <p className="text-xs text-slate-500">
            {t("returnHome")} <Link href="/" className="text-adv-accent hover:underline">{t("homePage")}</Link>.
          </p>
        </section>
      </section>
    </main>
  );
}
