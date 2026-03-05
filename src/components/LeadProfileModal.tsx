"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { getLead, enrichLead } from "@/lib/api";
import type { Lead } from "@/lib/types";
import Modal from "./Modal";
import Spinner from "./Spinner";
import Badge from "./Badge";
import OutreachModal from "./OutreachModal";

interface LeadProfileModalProps {
  leadId: number | null;
  onClose: () => void;
}

export default function LeadProfileModal({ leadId, onClose }: LeadProfileModalProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);

  const fetchLead = useCallback(async (id: number) => {
    setLoading(true);
    setLead(null);
    try {
      setLead(await getLead(id));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (leadId) fetchLead(leadId);
  }, [leadId, fetchLead]);

  async function handleEnrich() {
    if (!lead) return;
    setEnriching(true);
    try {
      setLead(await enrichLead(lead.id));
    } catch {
      /* ignore */
    } finally {
      setEnriching(false);
    }
  }

  function handleClose() {
    setLead(null);
    setLoading(false);
    onClose();
  }

  return (
    <Modal
      open={leadId !== null}
      onClose={handleClose}
      title={lead?.full_name || "Loading..."}
      wide
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : lead && (
        <div>
          {/* Profile header */}
          <div className="flex items-start gap-5">
            {lead.picture_url ? (
              <Image
                src={lead.picture_url}
                alt={lead.full_name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover shrink-0"
                unoptimized
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xl font-bold text-accent">
                {lead.full_name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-foreground">{lead.full_name}</h3>
              {lead.headline && (
                <p className="mt-1 text-sm text-muted">{lead.headline}</p>
              )}
              {lead.company && (
                <div className="mt-2">
                  <Badge label={lead.company} variant="blue" />
                </div>
              )}
              <a
                href={lead.linkedin_profile}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                View on LinkedIn
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>

          {/* Enrichment section */}
          <div className="mt-6 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">Enrichment</h4>
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-accent-hover disabled:opacity-50"
              >
                {enriching && <Spinner size="sm" />}
                Enrich
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted">Email:</span> <span className="text-foreground">{lead.email || "—"}</span></div>
              <div><span className="text-muted">Title:</span> <span className="text-foreground">{lead.job_title || "—"}</span></div>
              <div><span className="text-muted">Country:</span> <span className="text-foreground">{lead.country || "—"}</span></div>
              <div><span className="text-muted">Website:</span>{" "}
                {lead.company_website ? (
                  <a href={lead.company_website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{lead.company_website}</a>
                ) : (
                  <span className="text-foreground">—</span>
                )}
              </div>
              <div><span className="text-muted">Followers:</span> <span className="text-foreground">{lead.followers != null ? lead.followers.toLocaleString() : "—"}</span></div>
              <div><span className="text-muted">Connections:</span> <span className="text-foreground">{lead.connections != null ? lead.connections.toLocaleString() : "—"}</span></div>
            </div>
          </div>

          {/* Outreach section */}
          <div className="mt-4 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">
                Outreach {lead.outreach_records.length > 0 && `(${lead.outreach_records.length})`}
              </h4>
              <button
                onClick={() => setOutreachOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-accent-hover"
              >
                Manage
              </button>
            </div>
            {lead.outreach_records.length === 0 ? (
              <p className="text-sm text-muted">No outreach recorded yet.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {lead.outreach_records.map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <span className="text-foreground">{o.date}</span>
                    <Badge label={o.method === "email" ? "Email" : "LinkedIn"} variant={o.method === "email" ? "blue" : "green"} />
                    <Badge
                      label={o.status === "pending" ? "Pending" : o.status === "no_reply" ? "No Reply" : o.status === "interested" ? "Interested" : "Not Interested"}
                      variant={o.status === "interested" ? "green" : o.status === "not_interested" ? "red" : o.status === "pending" ? "yellow" : "gray"}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-foreground">
              Comments ({lead.comments.length})
            </h4>

            {lead.comments.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No comments recorded.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {lead.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-lg border border-border p-4"
                  >
                    {comment.comment_text && (
                      <p className="text-sm text-foreground leading-relaxed">
                        &ldquo;{comment.comment_text}&rdquo;
                      </p>
                    )}

                    <div className="mt-3 rounded-lg bg-surface-hover p-3">
                      <p className="text-xs font-medium text-muted">On post:</p>
                      <p className="mt-1 text-sm text-foreground line-clamp-2">
                        {comment.post_content}
                      </p>
                      {comment.post_url && (
                        <a
                          href={comment.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-accent hover:underline"
                        >
                          View post &rarr;
                        </a>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                      {comment.commented_at && (
                        <span>
                          Commented{" "}
                          {new Date(comment.commented_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      {comment.comment_url && (
                        <a
                          href={comment.comment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          View comment
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>

    {lead && (
      <OutreachModal
        leadId={outreachOpen ? lead.id : null}
        leadName={lead.full_name}
        onClose={() => setOutreachOpen(false)}
        onUpdate={() => fetchLead(lead.id)}
      />
    )}
    </>
  );
}
