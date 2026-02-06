import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";

export default async function SponsorPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/sponsor");
  }

  if (role !== "SPONSOR" && role !== "ADMIN") {
    redirect("/");
  }

  const t = await getTranslations("sponsor");

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {t("subtitle")}
          </p>
        </header>

        <div className="mt-4 space-y-3 rounded border border-adv-border bg-slate-900/70 p-4 text-sm text-slate-200 shadow-adv-glow">
          <p>
            {t("placeholder")}
          </p>
          <p className="text-xs text-slate-400">
            {t("accessNote")} <span className="font-mono">SPONSOR</span> {t("or")}
            <span className="font-mono"> ADMIN</span> {t("role")}.
          </p>
        </div>
      </section>
    </main>
  );
}
