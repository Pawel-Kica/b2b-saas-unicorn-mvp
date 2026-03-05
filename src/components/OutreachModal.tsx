"use client";

import { useEffect, useState, useCallback } from "react";
import { getLead, createOutreach, updateOutreach, deleteOutreach } from "@/lib/api";
import type { Outreach } from "@/lib/types";
import Modal from "./Modal";
import Spinner from "./Spinner";

interface OutreachModalProps {
  leadId: number | null;
  leadName: string;
  onClose: () => void;
  onUpdate: () => void;
}

const METHOD_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "no_reply", label: "No Reply" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
];


const METHOD_CLASSES: Record<string, string> = {
  email: "bg-blue-900/30 text-blue-300",
  linkedin: "bg-green-900/30 text-green-300",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-900/20 text-amber-300",
  no_reply: "border-zinc-500/40 bg-zinc-800/40 text-zinc-300",
  interested: "border-emerald-500/40 bg-emerald-900/20 text-emerald-300",
  not_interested: "border-red-500/40 bg-red-900/20 text-red-300",
};

const METHOD_SELECT_CLASSES: Record<string, string> = {
  email: "border-blue-500/40 bg-blue-900/20 text-blue-300",
  linkedin: "border-green-500/40 bg-green-900/20 text-green-300",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function OutreachModal({ leadId, leadName, onClose, onUpdate }: OutreachModalProps) {
  const [records, setRecords] = useState<Outreach[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Add form
  const [method, setMethod] = useState("email");
  const [status, setStatus] = useState<Outreach["status"]>("pending");
  const [date, setDate] = useState(todayStr);

  const fetchRecords = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const lead = await getLead(id);
      setRecords(lead.outreach_records);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (leadId) {
      fetchRecords(leadId);
      setMethod("email");
      setStatus("pending");
      setDate(todayStr());
      setDirty(false);
    }
  }, [leadId, fetchRecords]);

  async function handleAdd() {
    if (!leadId) return;
    setSaving(true);
    try {
      await createOutreach(leadId, { method, status, date });
      await fetchRecords(leadId);
      setDirty(true);
      setDate(todayStr());
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(r: Outreach, newStatus: Outreach["status"]) {
    if (!leadId || newStatus === r.status) return;
    const prev = r.status;
    // Optimistic update
    setRecords((recs) => recs.map((x) => (x.id === r.id ? { ...x, status: newStatus } : x)));
    try {
      await updateOutreach(leadId, r.id, { status: newStatus });
      setDirty(true);
    } catch {
      // Revert on failure
      setRecords((recs) => recs.map((x) => (x.id === r.id ? { ...x, status: prev } : x)));
    }
  }

  async function handleDelete(outreachId: number) {
    if (!leadId) return;
    setSaving(true);
    try {
      await deleteOutreach(leadId, outreachId);
      await fetchRecords(leadId);
      setDirty(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (dirty) onUpdate();
    onClose();
  }

  const selectBase =
    "rounded-lg border px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors cursor-pointer appearance-none bg-[length:16px_16px] bg-[right_6px_center] bg-no-repeat pr-7"
    + ` bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='%23999' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")]`;
  const plainSelect =
    "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50";

  return (
    <Modal
      open={leadId !== null}
      onClose={handleClose}
      title={`Outreach: ${leadName}`}
      wide
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div>
          {/* Existing records */}
          {records.length === 0 ? (
            <p className="text-sm text-muted">No outreach recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <span className="text-foreground">{r.date}</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${METHOD_CLASSES[r.method]}`}>
                    {r.method === "email" ? "Email" : "LinkedIn"}
                  </span>
                  <select
                    value={r.status}
                    onChange={(e) => changeStatus(r, e.target.value as Outreach["status"])}
                    className={`${selectBase} ${STATUS_CLASSES[r.status] ?? ""}`}
                  >
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={saving}
                    className="ml-auto rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add form — single row */}
          <div className="mt-4 flex items-center gap-2">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${selectBase} ${METHOD_SELECT_CLASSES[method] ?? ""}`}>
              {METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as Outreach["status"])} className={`${selectBase} ${STATUS_CLASSES[status] ?? ""}`}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={plainSelect} />
            <button
              onClick={handleAdd}
              disabled={saving || !date}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-all"
            >
              {saving && <Spinner size="sm" />}
              Add
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
