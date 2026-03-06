"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { getLeads, getCompetitors } from "@/lib/api";
import type { Lead, Competitor } from "@/lib/types";
import Spinner from "@/components/Spinner";
import EmptyState from "@/components/EmptyState";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import LeadProfileModal from "@/components/LeadProfileModal";

type SortField = "full_name" | "headline" | "comment_count";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [competitorFilter, setCompetitorFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("comment_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Profile modal
  const [profileLeadId, setProfileLeadId] = useState<number | null>(null);

  // Info modal (raw JSON)
  const [infoLead, setInfoLead] = useState<Lead | null>(null);

  const ordering = `${sortDir === "desc" ? "-" : ""}${sortField}`;

  const load = useCallback(async (q?: string, ord?: string, comp?: string) => {
    setLoading(true);
    try {
      setLeads(await getLeads({ search: q, ordering: ord, competitor: comp }));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getCompetitors().then(setCompetitors).catch(() => {});
  }, []);

  useEffect(() => {
    const delay = search ? 300 : 0;
    const t = setTimeout(() => load(search || undefined, ordering, competitorFilter || undefined), delay);
    return () => clearTimeout(t);
  }, [search, ordering, competitorFilter, load]);

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
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="mt-1 text-sm text-muted">
            People who commented on competitor posts
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
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
          </div>
          <select
            value={competitorFilter}
            onChange={(e) => setCompetitorFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
          >
            <option value="">All Competitors</option>
            {competitors.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => load(search || undefined, ordering, competitorFilter || undefined)}
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
      ) : leads.length === 0 ? (
        <EmptyState
          title={search ? "No results" : "No leads yet"}
          description={
            search
              ? "Try adjusting your search query."
              : "Scrape a competitor to start collecting leads."
          }
          action={
            !search && (
              <Link
                href="/competitors"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-all"
              >
                Go to Competitors
              </Link>
            )
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
                <th className="px-4 py-3">
                  <button
                    onClick={() => handleSort("headline")}
                    className="flex items-center gap-1 font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Headline <SortIcon field="headline" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <span className="font-medium text-muted">Competitor</span>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort("comment_count")}
                    className="mx-auto flex items-center gap-1 font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Comments <SortIcon field="comment_count" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-muted text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {lead.picture_url ? (
                        <Image
                          src={lead.picture_url}
                          alt={lead.full_name}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                          {lead.full_name.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-foreground">
                        {lead.full_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {lead.headline ? (
                      <Badge label={lead.headline} variant="purple" />
                    ) : (
                      <span className="text-muted">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted">
                      {lead.competitors.join(", ") || "\u2014"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-foreground">
                    {lead.comments.length}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      <a
                        href={lead.linkedin_profile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-400 hover:bg-sky-500/20 transition-colors text-center"
                      >
                        LinkedIn
                      </a>
                      <button
                        onClick={() => setProfileLeadId(lead.id)}
                        className="rounded-md bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-400 hover:bg-violet-500/20 transition-colors"
                      >
                        Profile
                      </button>
                      <Link
                        href="/outreach"
                        className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        Outreach
                      </Link>
                      <button
                        onClick={() => setInfoLead(lead)}
                        className="rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        Info
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Profile Modal */}
      <LeadProfileModal
        leadId={profileLeadId}
        onClose={() => setProfileLeadId(null)}
      />

      {/* Info (raw JSON) Modal */}
      <Modal
        open={infoLead !== null}
        onClose={() => setInfoLead(null)}
        title={infoLead ? `Info: ${infoLead.full_name}` : "Info"}
      >
        {infoLead && (
          <pre className="text-xs text-foreground whitespace-pre-wrap break-words font-mono bg-surface rounded-lg p-4 overflow-x-auto">
            {JSON.stringify(infoLead, null, 2)}
          </pre>
        )}
      </Modal>
    </div>
  );
}
