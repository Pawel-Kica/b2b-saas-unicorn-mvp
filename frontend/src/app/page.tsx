"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getDashboardStats } from "@/lib/api";
import type { DashboardStats } from "@/lib/api";
import Spinner from "@/components/Spinner";

const ChartsAndMap = dynamic(() => import("@/components/DashboardCharts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  ),
});

const KPI_CARDS = [
  { key: "competitors" as const, label: "Competitors", href: "/competitors", color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "leads" as const, label: "Leads", href: "/leads", color: "text-green-500", bg: "bg-green-500/10" },
  { key: "posts" as const, label: "Posts", href: "/posts", color: "text-purple-500", bg: "bg-purple-500/10" },
  { key: "outreaches" as const, label: "Outreaches", href: "/outreach", color: "text-amber-500", bg: "bg-amber-500/10" },
];

export default function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getDashboardStats()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">LinkedIn lead scraper overview</p>

      {/* KPI Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="group rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">{card.label}</p>
              <span className={`inline-block h-2 w-2 rounded-full ${card.bg} ring-2 ring-current ${card.color}`} />
            </div>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>
              {data.totals[card.key]}
            </p>
          </Link>
        ))}
      </div>

      {/* Charts + Map */}
      <ChartsAndMap data={data} />
    </div>
  );
}
