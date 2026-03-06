"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { getOutreaches, getLead, getLeads, createOutreach, updateOutreach, deleteOutreach, generateVoicePreview } from "@/lib/api";
import type { VoicePreview } from "@/lib/api";
import type { OutreachListItem, Outreach, Lead } from "@/lib/types";
import Spinner from "@/components/Spinner";
import EmptyState from "@/components/EmptyState";
import Badge from "@/components/Badge";
import LeadProfileModal from "@/components/LeadProfileModal";
import DatePicker from "@/components/DatePicker";

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

const METHOD_LABEL: Record<string, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  voice: "Voice",
};

const METHOD_VARIANT: Record<string, "blue" | "green" | "purple"> = {
  email: "blue",
  linkedin: "green",
  voice: "purple",
};

const METHOD_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "voice", label: "Voice" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "no_reply", label: "No Reply" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
];

const STATUS_CLASSES: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-900/20 text-amber-300",
  no_reply: "border-zinc-500/40 bg-zinc-800/40 text-zinc-300",
  interested: "border-emerald-500/40 bg-emerald-900/20 text-emerald-300",
  not_interested: "border-red-500/40 bg-red-900/20 text-red-300",
};

const METHOD_SELECT_CLASSES: Record<string, string> = {
  email: "border-blue-500/40 bg-blue-900/20 text-blue-300",
  linkedin: "border-green-500/40 bg-green-900/20 text-green-300",
  voice: "border-purple-500/40 bg-purple-900/20 text-purple-300",
};

const pillBase = "inline-flex items-center rounded-full h-[22px] text-xs font-medium";

const selectBase =
  `${pillBase} border px-2 leading-none focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors cursor-pointer appearance-none bg-[length:12px_12px] bg-[right_4px_center] bg-no-repeat pr-5`
  + ` bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%23999' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")]`;


function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ── Reusable styled audio player ── */
function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3 flex items-center gap-3">
      <audio
        ref={ref}
        src={src}
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => {
          const a = ref.current;
          if (a && a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
      />
      <button
        onClick={() => { const a = ref.current; if (a) { a.paused ? a.play() : a.pause(); } }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors"
      >
        {playing ? (
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
        ) : (
          <svg className="h-3.5 w-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={(e) => {
          const a = ref.current;
          if (!a || !a.duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
        }}
      >
        <div className="h-1.5 rounded-full bg-purple-500/20 overflow-hidden">
          <div className="h-full rounded-full bg-purple-500 transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <svg className="h-4 w-4 shrink-0 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
    </div>
  );
}

export default function OutreachPage() {
  const [items, setItems] = useState<OutreachListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("last_outreach_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Expanded row
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<Outreach[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  // Add form state
  const [newMethod, setNewMethod] = useState("email");
  const [newStatus, setNewStatus] = useState<Outreach["status"]>("pending");
  const [newDate, setNewDate] = useState(todayStr);
  const [newScript, setNewScript] = useState("");
  const [saving, setSaving] = useState(false);

  // Voice playground state
  const [voicePreview, setVoicePreview] = useState<VoicePreview | null>(null);
  const [voiceGenerating, setVoiceGenerating] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  // New outreach (lead search)
  const [showNewOutreach, setShowNewOutreach] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadResults, setLeadResults] = useState<Lead[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Profile modal
  const [profileLeadId, setProfileLeadId] = useState<number | null>(null);

  const ordering = `${sortDir === "desc" ? "-" : ""}${sortField}`;

  const load = useCallback(async (q?: string, ord?: string, silent?: boolean) => {
    if (!silent) setLoading(true);
    try {
      setItems(await getOutreaches({ search: q, ordering: ord }));
    } catch {
      /* ignore */
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const delay = search ? 300 : 0;
    const t = setTimeout(() => load(search || undefined, ordering), delay);
    return () => clearTimeout(t);
  }, [search, ordering, load]);

  // Lead search for "New Outreach"
  useEffect(() => {
    if (!leadSearch.trim()) {
      setLeadResults([]);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        setLeadResults(await getLeads({ search: leadSearch }));
      } catch {
        /* ignore */
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [leadSearch]);

  async function expandRow(leadId: number) {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null);
      setExpandedRecords([]);
      return;
    }
    setExpandedLeadId(leadId);
    setExpandedLoading(true);
    setNewMethod("email");
    setNewStatus("pending");
    setNewDate(todayStr());
    setNewScript("");
    setExpandedRecordId(null);
    setVoicePreview(null);
    setVoiceError("");
    try {
      const lead = await getLead(leadId);
      setExpandedRecords(lead.outreach_records);
    } catch {
      setExpandedRecords([]);
    } finally {
      setExpandedLoading(false);
    }
  }

  async function handleAdd() {
    if (!expandedLeadId) return;
    setSaving(true);
    try {
      await createOutreach(expandedLeadId, {
        method: newMethod,
        status: newStatus,
        date: newDate,
        script_text: newScript.trim() || undefined,
      });
      const lead = await getLead(expandedLeadId);
      setExpandedRecords(lead.outreach_records);
      setNewDate(todayStr());
      setNewScript("");
      load(search || undefined, ordering, true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  async function handleVoiceGenerate() {
    if (!expandedLeadId) return;
    setVoiceGenerating(true);
    setVoiceError("");
    setVoicePreview(null);
    try {
      const preview = await generateVoicePreview(expandedLeadId);
      setVoicePreview(preview);
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : "Voice generation failed");
    } finally {
      setVoiceGenerating(false);
    }
  }

  async function handleVoiceSave() {
    if (!expandedLeadId || !voicePreview) return;
    setSaving(true);
    try {
      await createOutreach(expandedLeadId, {
        method: "voice",
        status: newStatus,
        date: newDate,
        voice_audio_filename: voicePreview.audio_filename,
        voice_script_text: voicePreview.script_text,
      });
      const lead = await getLead(expandedLeadId);
      setExpandedRecords(lead.outreach_records);
      setNewDate(todayStr());
      setVoicePreview(null);
      load(search || undefined, ordering, true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(r: Outreach, newSt: Outreach["status"]) {
    if (!expandedLeadId || newSt === r.status) return;
    const prev = r.status;
    setExpandedRecords((recs) => recs.map((x) => (x.id === r.id ? { ...x, status: newSt } : x)));
    try {
      await updateOutreach(expandedLeadId, r.id, { status: newSt });
      load(search || undefined, ordering, true);
    } catch {
      setExpandedRecords((recs) => recs.map((x) => (x.id === r.id ? { ...x, status: prev } : x)));
    }
  }

  async function changeDate(r: Outreach, newDt: string) {
    if (!expandedLeadId || newDt === r.date || !newDt) return;
    const prev = r.date;
    setExpandedRecords((recs) => recs.map((x) => (x.id === r.id ? { ...x, date: newDt } : x)));
    try {
      await updateOutreach(expandedLeadId, r.id, { date: newDt });
      load(search || undefined, ordering, true);
    } catch {
      setExpandedRecords((recs) => recs.map((x) => (x.id === r.id ? { ...x, date: prev } : x)));
    }
  }

  async function handleDelete(outreachId: number) {
    if (!expandedLeadId) return;
    setSaving(true);
    try {
      await deleteOutreach(expandedLeadId, outreachId);
      const lead = await getLead(expandedLeadId);
      setExpandedRecords(lead.outreach_records);
      load(search || undefined, ordering, true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  async function handleNewOutreachSelect(leadId: number) {
    setShowNewOutreach(false);
    setLeadSearch("");
    setLeadResults([]);
    // If lead isn't in the outreach list yet, add a placeholder row so we can expand it
    const existing = items.find((i) => i.id === leadId);
    if (!existing) {
      const matched = leadResults.find((l) => l.id === leadId);
      if (matched) {
        setItems((prev) => [
          {
            id: matched.id,
            full_name: matched.full_name,
            linkedin_profile: matched.linkedin_profile,
            picture_url: matched.picture_url,
            last_outreach_date: "",
            last_outreach_status: "pending",
            last_outreach_method: "email",
            outreach_count: 0,
          },
          ...prev,
        ]);
      }
    }
    expandRow(leadId);
  }

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
            onClick={() => setShowNewOutreach((v) => !v)}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-all"
          >
            + New Outreach
          </button>
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

      {/* New Outreach - lead search panel */}
      {showNewOutreach && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-foreground">Search for a lead to start outreach:</p>
          <input
            type="text"
            placeholder="Type a name..."
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
          />
          {searchLoading && (
            <div className="mt-3 flex justify-center"><Spinner size="sm" /></div>
          )}
          {!searchLoading && leadResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
              {leadResults.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleNewOutreachSelect(l.id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-hover transition-colors"
                >
                  {l.picture_url ? (
                    <Image src={l.picture_url} alt={l.full_name} width={24} height={24} className="h-6 w-6 rounded-full object-cover" unoptimized />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      {l.full_name.charAt(0)}
                    </div>
                  )}
                  <span className="text-foreground">{l.full_name}</span>
                  {l.headline && <span className="text-muted text-xs truncate">{l.headline}</span>}
                </button>
              ))}
            </div>
          )}
          {!searchLoading && leadSearch.trim() && leadResults.length === 0 && (
            <p className="mt-2 text-xs text-muted">No leads found.</p>
          )}
        </div>
      )}

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
              : "Start outreach from the Leads page or use '+ New Outreach' above."
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
                <React.Fragment key={item.id}>
                  <tr
                    onClick={() => expandRow(item.id)}
                    className={`border-b border-border last:border-0 hover:bg-surface-hover transition-colors cursor-pointer ${expandedLeadId === item.id ? "bg-surface-hover" : ""}`}
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
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {item.full_name}
                          </span>
                          <svg className={`h-3.5 w-3.5 text-muted transition-transform ${expandedLeadId === item.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
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
                        label={METHOD_LABEL[item.last_outreach_method] || item.last_outreach_method}
                        variant={METHOD_VARIANT[item.last_outreach_method] || "gray"}
                      />
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-foreground tabular-nums">
                      {item.outreach_count}
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {item.last_outreach_date}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setProfileLeadId(item.id); }}
                        className="rounded-md bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-400 hover:bg-violet-500/20 transition-colors"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>

                  {/* Expanded row */}
                  {expandedLeadId === item.id && (
                    <tr className="border-b border-border last:border-0">
                      <td colSpan={6} className="px-4 py-4 bg-background">
                        {expandedLoading ? (
                          <div className="flex justify-center py-4"><Spinner size="sm" /></div>
                        ) : (
                          <div className="space-y-5">
                            {/* ── Outreach History ── */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Outreach History</h4>
                              {expandedRecords.length === 0 ? (
                                <p className="text-sm text-muted">No outreach records yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {expandedRecords.map((r) => {
                                    const hasContent = !!(r.script_text || (r.method === "voice" && r.audio_url));
                                    const isOpen = expandedRecordId === r.id;
                                    return (
                                      <div key={r.id} className="rounded-lg border border-border overflow-hidden">
                                        <div className="flex items-center gap-2 p-2.5">
                                          <DatePicker
                                            value={r.date}
                                            onChange={(v) => changeDate(r, v)}
                                          />
                                          <Badge label={METHOD_LABEL[r.method] || r.method} variant={METHOD_VARIANT[r.method] || "gray"} />
                                          <select
                                            value={r.status}
                                            onChange={(e) => changeStatus(r, e.target.value as Outreach["status"])}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`${selectBase} ${STATUS_CLASSES[r.status] ?? ""}`}
                                          >
                                            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                          </select>
                                          {/* Inline script preview (truncated) */}
                                          {r.script_text && !isOpen && (
                                            <span className="text-xs text-muted truncate max-w-[280px] ml-1">&ldquo;{r.script_text}&rdquo;</span>
                                          )}
                                          <div className="ml-auto flex items-center gap-1">
                                            {hasContent && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); setExpandedRecordId(isOpen ? null : r.id); }}
                                                className="rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
                                              >
                                                {isOpen ? "Collapse" : "Expand"}
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDelete(r.id)}
                                              disabled={saving}
                                              className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </div>
                                        {/* Expanded detail */}
                                        {isOpen && (
                                          <div className="border-t border-border bg-surface/30 p-3">
                                            {r.method === "voice" && r.script_text && r.audio_url ? (
                                              <div className="grid grid-cols-2 gap-4">
                                                <p className="text-sm text-foreground/80 leading-relaxed">{r.script_text}</p>
                                                <AudioPlayer src={r.audio_url} />
                                              </div>
                                            ) : (
                                              <div className="space-y-3">
                                                {r.script_text && (
                                                  <p className="text-sm text-foreground/80 leading-relaxed">{r.script_text}</p>
                                                )}
                                                {r.method === "voice" && r.audio_url && (
                                                  <AudioPlayer src={r.audio_url} />
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* ── New Outreach ── */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">New Outreach</h4>
                              <div className="flex items-center gap-2">
                                <DatePicker
                                  value={newDate}
                                  onChange={setNewDate}
                                />
                                <select
                                  value={newMethod}
                                  onChange={(e) => { setNewMethod(e.target.value); setNewScript(""); setVoicePreview(null); setVoiceError(""); }}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`${selectBase} ${METHOD_SELECT_CLASSES[newMethod] ?? ""}`}
                                >
                                  {METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <select
                                  value={newStatus}
                                  onChange={(e) => setNewStatus(e.target.value as Outreach["status"])}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`${selectBase} ${STATUS_CLASSES[newStatus] ?? ""}`}
                                >
                                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                {newMethod !== "voice" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                                    disabled={saving || !newDate}
                                    className={`${pillBase} gap-1 bg-accent px-3 text-white hover:bg-accent-hover disabled:opacity-50 transition-all`}
                                  >
                                    {saving && <Spinner size="sm" />}
                                    + Add
                                  </button>
                                )}
                              </div>

                              {/* Script textarea for email / linkedin */}
                              {newMethod !== "voice" && (
                                <textarea
                                  placeholder="Script / notes (optional)..."
                                  value={newScript}
                                  onChange={(e) => setNewScript(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  rows={2}
                                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
                                />
                              )}

                              {/* Voice playground */}
                              {newMethod === "voice" && (
                                <div className="mt-3 rounded-lg border border-purple-500/30 bg-purple-950/10 p-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2 mb-3">
                                    <Badge label="Voice" variant="purple" />
                                    <span className="text-sm text-muted">AI-generated voice note</span>
                                  </div>

                                  {!voicePreview && !voiceGenerating && (
                                    <div>
                                      <button
                                        onClick={handleVoiceGenerate}
                                        disabled={voiceGenerating}
                                        className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                                      >
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
                                        Generate Voice Note
                                      </button>
                                      {voiceError && (
                                        <p className="mt-2 text-xs text-red-400">{voiceError}</p>
                                      )}
                                    </div>
                                  )}

                                  {voiceGenerating && (
                                    <div className="flex items-center gap-3 py-3">
                                      <Spinner size="sm" />
                                      <span className="text-sm text-muted">Generating script &amp; audio...</span>
                                    </div>
                                  )}

                                  {voicePreview && (
                                    <div className="grid grid-cols-2 gap-4">
                                      {/* Left — Script */}
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium text-muted mb-1.5">Script</p>
                                        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-foreground leading-relaxed">
                                          {voicePreview.script_text}
                                        </div>
                                      </div>
                                      {/* Right — Player + Actions */}
                                      <div className="flex flex-col gap-3">
                                        <div>
                                          <p className="text-xs font-medium text-muted mb-1.5">Preview</p>
                                          <AudioPlayer src={voicePreview.audio_url} />
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={handleVoiceSave}
                                            disabled={saving}
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-all"
                                          >
                                            {saving && <Spinner size="sm" />}
                                            Save
                                          </button>
                                          <button
                                            onClick={handleVoiceGenerate}
                                            disabled={voiceGenerating}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                                          >
                                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
                                            Regenerate
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LeadProfileModal
        leadId={profileLeadId}
        onClose={() => setProfileLeadId(null)}
      />
    </div>
  );
}
