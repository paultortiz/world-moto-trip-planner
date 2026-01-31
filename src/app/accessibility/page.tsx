import Link from "next/link";

export const metadata = {
  title: "Accessibility | World Moto Trip Planner",
};

export default function AccessibilityPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-3xl space-y-6 text-sm text-slate-200">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-50">Accessibility commitment</h1>
          <p className="text-xs text-slate-400">Last updated: January 31, 2026</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Our goal</h2>
          <p>
            World Moto Trip Planner is being developed with the goal of meeting the spirit and
            requirements of the Americans with Disabilities Act (ADA) and the Web Content
            Accessibility Guidelines (WCAG) 2.1 at the AA level.
          </p>
          <p>
            We want riders using assistive technologiesincluding screen readers, screen magnifiers,
            and keyboard-only navigationto be able to plan trips, understand routes, and manage
            trip details as effectively as possible.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">What we are working on</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>Improving keyboard navigation and focus order across all interactive elements.</li>
            <li>Providing clear labels, headings, and regions for screen reader users.</li>
            <li>
              Ensuring sufficient color contrast and visible focus indicators for maps, overlays, and
              trip detail controls.
            </li>
            <li>
              Offering text-based alternatives for information that is primarily shown on the map,
              such as waypoint lists, route summaries, and elevation details.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Known limitations</h2>
          <p>
            Some parts of the application are still under active development and may not yet fully
            meet WCAG 2.1 AA, especially complex map interactions and custom controls. We are
            incrementally improving these areas and welcome feedback on specific issues you
            encounter.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Feedback and contact</h2>
          <p>
            If you experience any accessibility barriers while using the app, please let us know so
            we can investigate and address them.
          </p>
          <p>
            When you contact us, if possible, include:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>The page or feature where the issue occurred.</li>
            <li>The browser, operating system, and assistive technology you are using.</li>
            <li>A brief description of the problem.</li>
          </ul>
          <p>
            You can reach the maintainer of this project using the same contact details referenced
            in our <Link href="/privacy" className="text-adv-accent hover:underline">Privacy Policy</Link>
            {" "}
            and
            {" "}
            <Link href="/terms" className="text-adv-accent hover:underline">Terms of Service</Link>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Ongoing improvement</h2>
          <p>
            Accessibility is an ongoing process. As the app evolves, we will continue to audit new
            features against WCAG 2.1 AA, fix issues that are reported or discovered, and refine our
            design to better support all riders.
          </p>
          <p className="text-xs text-slate-500">
            Return to the
            {" "}
            <Link href="/" className="text-adv-accent hover:underline">
              home page
            </Link>
            .
          </p>
        </section>
      </section>
    </main>
  );
}
