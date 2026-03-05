"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCompetitors, getLeads, getPosts } from "@/lib/api";
import Spinner from "@/components/Spinner";

export default function Dashboard() {
  const [stats, setStats] = useState({ competitors: 0, leads: 0, posts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCompetitors(), getLeads(), getPosts()])
      .then(([c, l, p]) => setStats({ competitors: c.length, leads: l.length, posts: p.length }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const cards = [
    { label: "Competitors", value: stats.competitors, href: "/competitors", color: "text-blue-500" },
    { label: "Leads", value: stats.leads, href: "/leads", color: "text-green-500" },
    { label: "Posts", value: stats.posts, href: "/posts", color: "text-purple-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">LinkedIn lead scraper overview</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-xl border border-border bg-surface p-6 transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
          >
            <p className="text-sm font-medium text-muted">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
            <p className="mt-3 text-xs text-muted group-hover:text-accent transition-colors">
              View all &rarr;
            </p>
          </Link>
        ))}
      </div>

    </div>
  );
}
