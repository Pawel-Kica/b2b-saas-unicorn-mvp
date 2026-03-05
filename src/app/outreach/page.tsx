"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { getOutreaches } from "@/lib/api";
import type { OutreachListItem } from "@/lib/types";
import Spinner from "@/components/Spinner";
import EmptyState from "@/components/EmptyState";
import Badge from "@/components/Badge";
import OutreachModal from "@/components/OutreachModal";
import LeadProfileModal from "@/components/LeadProfileModal";

type SortField = "full_name" | "last_outreach_date";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  no_reply: "No Reply",
  interested: "Interested",
  not_interested: "Not Interested",
};

const STATUS_VARIANT: Record<string, "yellow" | "gray" | "green" | "red"> = {
  pending: "yellow",
  no_reply: "gray",
  interested: "green",
  not_interested: "red",
};

export default function OutreachPage() {
  const [items, setItems] = useState<OutreachListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("last_outreach_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Outreach modal
  const [outreachLead, setOutreachLead] = useState<{ id: number; name: string } | null>(null);

  // Profile modal
  const [profileLeadId, setProfileLeadId] = useState<number | null>(null);

  const ordering = `${sortDir === "desc" ? "-" : ""}${sortField}`;

  const load = useCallback(async (q?: string, ord?: string) => {
    setLoading(true);
    try {
      setItems(await getOutreaches({ search: q, ordering: ord }));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const delay = search ? 300 : 0;
    const t = setTimeout(() => load(search || undefined, ordering), delay);
    return () => clearTimeout(t);
  }, [search, ordering, load]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "full_name" ? "asc" : "desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) {
      return (
        <svg className="h-3.5 w-3.5 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      );
    }
    return sortDir === "asc" ? (
      <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    ) : (
      <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Outreach</h1>
          <p className="mt-1 text-sm text-muted">
            Track outreach status for your leads
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
          </div>
          <button
            onClick={() => load(search || undefined, ordering)}
            className="rounded-lg border border-border bg-surface p-2 text-muted hover:text-foreground hover:bg-surface-hover transition-all"
            title="Refresh"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={search ? "No results" : "No outreach yet"}
          description={
            search
              ? "Try adjusting your search query."
              : "Start outreach from the Leads page."
          }
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-4 py-3">
                  <button
                    onClick={() => handleSort("full_name")}
                    className="flex items-center gap-1 font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Name <SortIcon field="full_name" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-muted">Status</th>
                <th className="px-4 py-3 font-medium text-muted">Method</th>
                <th className="px-4 py-3 font-medium text-muted text-center">Count</th>
                <th className="px-4 py-3">
                  <button
                    onClick={() => handleSort("last_outreach_date")}
                    className="flex items-center gap-1 font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Date <SortIcon field="last_outreach_date" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-muted text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.picture_url ? (
                        <Image
                          src={item.picture_url}
                          alt={item.full_name}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                          {item.full_name.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-foreground">
                        {item.full_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={STATUS_LABEL[item.last_outreach_status]}
                      variant={STATUS_VARIANT[item.last_outreach_status]}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={item.last_outreach_method === "email" ? "Email" : "LinkedIn"}
                      variant={item.last_outreach_method === "email" ? "blue" : "green"}
                    />
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-foreground tabular-nums">
                    {item.outreach_count}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {item.last_outreach_date}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setOutreachLead({ id: item.id, name: item.full_name })}
                        className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => setProfileLeadId(item.id)}
                        className="rounded-md bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-400 hover:bg-violet-500/20 transition-colors"
                      >
                        Profile
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OutreachModal
        leadId={outreachLead?.id ?? null}
        leadName={outreachLead?.name ?? ""}
        onClose={() => setOutreachLead(null)}
        onUpdate={() => load(search || undefined, ordering)}
      />

      <LeadProfileModal
        leadId={profileLeadId}
        onClose={() => setProfileLeadId(null)}
      />
    </div>
  );
}
