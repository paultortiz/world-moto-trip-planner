import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdministratorPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/administrator");
  }

  if (role !== "ADMIN") {
    redirect("/");
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="text-2xl font-bold">Administrator console</h1>
          <p className="mt-2 text-sm text-slate-300">
            Manage users, roles, and application-wide settings for World Moto Trip Planner.
          </p>
        </header>

        <div className="mt-4 space-y-3 rounded border border-adv-border bg-slate-900/70 p-4 text-sm text-slate-200 shadow-adv-glow">
          <p>
            Use the navigation below to review users and assign roles such as <span className="font-mono">USER</span>,
            <span className="font-mono"> SPONSOR</span>, and <span className="font-mono">ADMIN</span>.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
            <li>
              <a href="/administrator/users" className="text-adv-accent hover:underline">
                User management
              </a>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
