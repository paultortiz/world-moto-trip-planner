import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface ActivityStats {
  totalUsers: number;
  newUsersLast7Days: number;
  activeUsers24h: number;
  activeUsers7d: number;
  activeUsers30d: number;
}

interface FeatureUsage {
  action: string;
  count: number;
}

interface RecentActivity {
  id: string;
  action: string;
  userEmail: string | null;
  createdAt: Date;
  metadata: unknown;
}

async function getActivityStats(): Promise<ActivityStats> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersLast7Days,
    activeUsers24h,
    activeUsers7d,
    activeUsers30d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.user.count({
      where: { lastActiveAt: { gte: oneDayAgo } },
    }),
    prisma.user.count({
      where: { lastActiveAt: { gte: sevenDaysAgo } },
    }),
    prisma.user.count({
      where: { lastActiveAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  return {
    totalUsers,
    newUsersLast7Days,
    activeUsers24h,
    activeUsers7d,
    activeUsers30d,
  };
}

async function getFeatureUsage(): Promise<FeatureUsage[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const usage = await prisma.activityLog.groupBy({
    by: ["action"],
    _count: { action: true },
    where: { createdAt: { gte: sevenDaysAgo } },
    orderBy: { _count: { action: "desc" } },
    take: 15,
  });

  return usage.map((item) => ({
    action: item.action,
    count: item._count.action,
  }));
}

async function getRecentActivity(): Promise<RecentActivity[]> {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    userEmail: log.user?.email ?? null,
    createdAt: log.createdAt,
    metadata: log.metadata,
  }));
}

function formatAction(action: string): string {
  // Convert action like "trip.created" to "Trip Created"
  return action
    .split(/[._]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default async function AdminActivityPage() {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session?.user as any)?.role as string | undefined;

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/administrator/activity");
  }

  if (role !== "ADMIN") {
    redirect("/");
  }

  const t = await getTranslations("admin");

  const [stats, featureUsage, recentActivity] = await Promise.all([
    getActivityStats(),
    getFeatureUsage(),
    getRecentActivity(),
  ]);

  // Calculate retention percentage
  const retentionRate =
    stats.totalUsers > 0
      ? Math.round((stats.activeUsers7d / stats.totalUsers) * 100)
      : 0;

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">{t("activityTitle")}</h1>
          <p className="mt-2 text-sm text-slate-300">{t("activitySubtitle")}</p>
        </header>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label={t("totalUsers")} value={stats.totalUsers} />
          <StatCard
            label={t("newUsersWeek")}
            value={stats.newUsersLast7Days}
            highlight
          />
          <StatCard label={t("active24h")} value={stats.activeUsers24h} />
          <StatCard label={t("active7d")} value={stats.activeUsers7d} />
          <StatCard label={t("active30d")} value={stats.activeUsers30d} />
        </div>

        {/* Retention Banner */}
        <div className="rounded border border-adv-border bg-slate-900/70 p-4 shadow-adv-glow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-300">
                {t("weeklyRetention")}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {t("retentionDescription")}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-adv-accent">
                {retentionRate}%
              </span>
              <p className="text-xs text-slate-400">
                {stats.activeUsers7d} / {stats.totalUsers} {t("users")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Feature Usage */}
          <div className="rounded border border-adv-border bg-slate-900/70 p-4 shadow-adv-glow">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">
              {t("featureUsageTitle")}
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              {t("featureUsageDescription")}
            </p>
            {featureUsage.length === 0 ? (
              <p className="text-sm text-slate-500">{t("noActivityYet")}</p>
            ) : (
              <div className="space-y-2">
                {featureUsage.map((item) => {
                  const maxCount = featureUsage[0]?.count || 1;
                  const percentage = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.action} className="group">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-300">
                          {formatAction(item.action)}
                        </span>
                        <span className="tabular-nums text-slate-400">
                          {item.count}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-adv-accent/70 transition-all group-hover:bg-adv-accent"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded border border-adv-border bg-slate-900/70 p-4 shadow-adv-glow">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">
              {t("recentActivityTitle")}
            </h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500">{t("noActivityYet")}</p>
            ) : (
              <div className="max-h-[400px] space-y-2 overflow-y-auto pr-2">
                {recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between rounded bg-slate-950/50 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-slate-200">
                        {formatAction(log.action)}
                      </span>
                      <p className="truncate text-slate-500">
                        {log.userEmail ?? (
                          <span className="italic">{t("anonymousUser")}</span>
                        )}
                      </p>
                    </div>
                    <span className="ml-3 shrink-0 text-slate-500">
                      {formatTimeAgo(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded border border-adv-border bg-slate-900/70 p-4 shadow-adv-glow">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${
          highlight ? "text-adv-accent" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
