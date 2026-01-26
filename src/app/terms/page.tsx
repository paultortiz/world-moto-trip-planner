import Link from "next/link";

export const metadata = {
  title: "Terms of Service | World Moto Trip Planner",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-3xl space-y-6 text-sm text-slate-200">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-50">Terms of Service</h1>
          <p className="text-xs text-slate-400">Last updated: January 26, 2026</p>
        </header>

        <p>
          World Moto Trip Planner ("the app") is provided to help you plan motorcycle trips and
          related route details. By using the app you agree to these Terms of Service.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Use at your own risk</h2>
          <p>
            Riding a motorcycle is inherently risky. The app provides planning tools only and does
            not constitute navigation advice, safety advice, or legal guidance. You are solely
            responsible for your own riding decisions, including the roads you choose, your speed,
            and how you react to conditions.
          </p>
          <p>
            Always verify actual road conditions, regulations, closures, and weather before you
            ride, and obey all local laws.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">No warranty</h2>
          <p>
            The app is provided on an "as is" and "as available" basis, without warranties of any
            kind, whether express or implied. We do not guarantee the accuracy, completeness, or
            availability of any routes, distances, times, elevation data, or other information in the
            app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Accounts and acceptable use</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and for any
            activity that occurs under it. You agree not to use the app to:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>Break the law or violate third-party rights.</li>
            <li>Upload abusive, hateful, or otherwise inappropriate content.</li>
            <li>Attempt to disrupt or compromise the service or its infrastructure.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Third-party services</h2>
          <p>
            The app depends on third-party services such as Google Maps Platform, authentication
            providers (for example Google and Facebook), and managed database hosting. Your use of
            those services is additionally subject to their own terms and policies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Changes to the service</h2>
          <p>
            The app may change, be suspended, or be discontinued at any time without notice. Features
            may be added, removed, or modified as the project evolves.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, the maintainers of this project are not liable
            for any direct, indirect, incidental, special, or consequential damages, or loss of data
            or opportunities, arising out of or in connection with your use of the app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Changes to these terms</h2>
          <p>
            We may update these Terms of Service from time to time. When we do, we will update the
            "Last updated" date at the top of this page. Your continued use of the app after changes
            take effect means you accept the revised terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-50">Contact</h2>
          <p>
            If you have questions about these terms, please contact the maintainer of this project.
          </p>
          <p className="text-xs text-slate-500">
            Return to the <Link href="/" className="text-adv-accent hover:underline">home page</Link>.
          </p>
        </section>
      </section>
    </main>
  );
}
