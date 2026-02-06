import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import UserRoleForm from "./UserRoleForm";

export default async function AdminUsersPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/administrator/users");
  }

  if (role !== "ADMIN") {
    redirect("/");
  }

  const t = await getTranslations("admin");

  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="text-2xl font-bold">{t("usersTitle")}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {t("usersSubtitle")}
          </p>
        </header>

        <div className="mt-4 overflow-x-auto rounded border border-adv-border bg-slate-900/70 p-4 text-xs text-slate-200 shadow-adv-glow">
          <table className="min-w-full border-separate border-spacing-y-1">
            <thead className="text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-2 py-1 text-left">{t("emailColumn")}</th>
                <th className="px-2 py-1 text-left">{t("roleColumn")}</th>
                <th className="px-2 py-1 text-left">{t("createdColumn")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="rounded border border-slate-800 bg-slate-950/60">
                  <td className="px-2 py-1 align-middle text-[11px] text-slate-200">
                    {user.email ?? <span className="italic text-slate-500">{t("noEmail")}</span>}
                  </td>
                  <td className="px-2 py-1 align-middle">
                    <UserRoleForm userId={user.id} initialRole={user.role} />
                  </td>
                  <td className="px-2 py-1 align-middle text-[11px] text-slate-400">
                    {user.createdAt.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
