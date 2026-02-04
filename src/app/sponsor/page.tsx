import { redirect } from "next/navigation";
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

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="text-2xl font-bold">Sponsor console</h1>
          <p className="mt-2 text-sm text-slate-300">
            View sponsor-facing demos, campaign concepts, and analytics for how riders interact with
            sponsored content in the planner.
          </p>
        </header>

        <div className="mt-4 space-y-3 rounded border border-adv-border bg-slate-900/70 p-4 text-sm text-slate-200 shadow-adv-glow">
          <p>
            This is a placeholder sponsor dashboard. We can expand this area with metrics such as
            impressions and click-through on sponsored gear blocks, trip types where your brand is
            most visible, and A/B experiments.
          </p>
          <p className="text-xs text-slate-400">
            Access is limited to accounts with the <span className="font-mono">SPONSOR</span> or
            <span className="font-mono"> ADMIN</span> role.
          </p>
        </div>
      </section>
    </main>
  );
}
