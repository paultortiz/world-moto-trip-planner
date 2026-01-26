import Link from "next/link";

export const metadata = {
  title: "Data Deletion Instructions | World Moto Trip Planner",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-3xl space-y-6 text-sm text-slate-200">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-50">Data Deletion Instructions</h1>
          <p className="text-xs text-slate-400">Last updated: January 26, 2026</p>
        </header>

        <p>
          This page explains how to request deletion of your account and associated data from World
          Moto Trip Planner.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">What can be deleted</h2>
          <p>
            When we delete your account, we will remove:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>Your user account record used to sign in to the app.</li>
            <li>All trips you have created, including waypoints and route details.</li>
            <li>Associated planning data (fuel range settings, schedule preferences, checklist items, and segment notes).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">How to request deletion</h2>
          <p>
            To request deletion of your data:
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-slate-300">
            <li>
              Sign in to the app and confirm the email address shown in the header matches the
              account you want to delete.
            </li>
            <li>
              Contact the maintainer of this project and clearly state that you would like your
              account and trips deleted. Include the email address you use to sign in to World Moto
              Trip Planner.
            </li>
          </ol>
          <p>
            Once your request is received and verified, your account and associated data will be
            removed from the live database within a reasonable time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Third-party sign-in providers</h2>
          <p>
            If you used Google or Facebook to sign in, deleting your account in World Moto Trip
            Planner does not delete your Google or Facebook accounts. To manage those accounts,
            please use the tools provided by Google and Facebook directly.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">More information</h2>
          <p>
            For details on what data we collect and how it is used, please see our{" "}
            <Link href="/privacy" className="text-adv-accent hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="text-xs text-slate-500">
            Return to the <Link href="/" className="text-adv-accent hover:underline">home page</Link>.
          </p>
        </section>
      </section>
    </main>
  );
}
