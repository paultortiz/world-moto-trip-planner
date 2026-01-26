import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | World Moto Trip Planner",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-3xl space-y-6 text-sm text-slate-200">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-50">Privacy Policy</h1>
          <p className="text-xs text-slate-400">
            Last updated: January 26, 2026
          </p>
        </header>

        <p>
          World Moto Trip Planner ("the app") helps you plan long-distance motorcycle routes and
          related trip details. This page describes what data we collect, how it is used, and the
          choices you have.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Accounts and authentication</h2>
          <p>
            When you sign in, we use third-party identity providers such as Google and Facebook via
            NextAuth. From these providers we may receive basic profile information including:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>Email address</li>
            <li>Display name</li>
            <li>Profile image (if available)</li>
          </ul>
          <p>
            This information is used only to create and identify your account in the app so that
            your trips are stored securely for you.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Trip data we store</h2>
          <p>
            When you use the app, we store trip-related data in our database, including:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>Trips, names, and descriptions</li>
            <li>Waypoints, waypoint names, notes, and types (fuel, lodging, POI, etc.)</li>
            <li>Computed route metrics such as distance, duration, elevation summaries</li>
            <li>Fuel range settings, schedule preferences, and daily planning information</li>
            <li>Pre-ride checklist items and completion state</li>
            <li>Optional risk and notes you attach to segments between waypoints</li>
          </ul>
          <p>
            This data is used solely to provide planning features to you (for example, showing your
            trips, exporting GPX, and calculating elevation or fuel legs).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Third-party services</h2>
          <p>
            The app uses several third-party services to function:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>
              <span className="font-semibold">Google Maps Platform</span> for maps, routing, and
              elevation data.
            </li>
            <li>
              <span className="font-semibold">Google</span> and <span className="font-semibold">Facebook</span> for
              authentication.
            </li>
            <li>
              <span className="font-semibold">Database hosting</span> via a managed Postgres
              provider.
            </li>
          </ul>
          <p>
            These providers may process IP addresses and other technical information as part of
            delivering their services. Your use of Google and Facebook is also governed by their
            respective privacy policies and terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Cookies and sessions</h2>
          <p>
            We use cookies and session storage through NextAuth to keep you signed in and associate
            your browser with your account. These cookies are not used for advertising; they are
            only used for authentication and security.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Data sharing and retention</h2>
          <p>
            We do not sell your personal information. Trip data and account details are used only
            to operate this application. Limited personnel and service providers (for example, our
            hosting and database providers) may have access as necessary to operate and maintain the
            service.
          </p>
          <p>
            Trip data is retained while your account is active. We may retain limited logs for a
            period of time for security, debugging, and abuse prevention.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Your choices</h2>
          <p>
            You can sign out at any time from the app header. If you would like your account and
            associated trips to be deleted, please contact the maintainer of this project and
            include the email address you use to sign in.
          </p>
          <p>
            For step-by-step instructions, see our{" "}
            <Link href="/data-deletion" className="text-adv-accent hover:underline">
              Data Deletion Instructions
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Contact</h2>
          <p>
            If you have questions about this privacy policy or how your data is handled, please
            contact the app maintainer.
          </p>
          <p className="text-xs text-slate-500">
            This app is provided as a planning aid only. It is not a navigation product and should
            not be relied on as the sole source of route or safety information.
          </p>
          <p className="text-xs text-slate-500">
            Return to the <Link href="/" className="text-adv-accent hover:underline">home page</Link>.
          </p>
        </section>
      </section>
    </main>
  );
}
