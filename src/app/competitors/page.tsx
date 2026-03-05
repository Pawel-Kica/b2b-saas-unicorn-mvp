"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  getCompetitors,
  createCompetitor,
  deleteCompetitor,
  fetchLeads,
  getCompetitor,
  getCompetitorPosts,
} from "@/lib/api";
import type { Competitor, PostWithComments, FetchLeadsResponse } from "@/lib/types";
import Spinner from "@/components/Spinner";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import CommentItem from "@/components/CommentItem";
import LeadProfileModal from "@/components/LeadProfileModal";

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);

  // Scraping state
  const [scrapingId, setScrapingId] = useState<number | null>(null);
  const [scrapeResult, setScrapeResult] = useState<FetchLeadsResponse | null>(null);

  // Scrape config
  const [scrapeConfigFor, setScrapeConfigFor] = useState<Competitor | null>(null);
  const [maxPosts, setMaxPosts] = useState(5);
  const [maxComments, setMaxComments] = useState(10);

  // Detail modal
  const [detailComp, setDetailComp] = useState<Competitor | null>(null);
  const [detailPosts, setDetailPosts] = useState<PostWithComments[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Info modal
  const [infoComp, setInfoComp] = useState<Competitor | null>(null);

  // Lead profile modal (triggered from comment Info)
  const [leadProfileId, setLeadProfileId] = useState<number | null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      setCompetitors(await getCompetitors({ search: q }));
    } catch {
      setError("Failed to load competitors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const delay = search ? 300 : 0;
    const t = setTimeout(() => load(search || undefined), delay);
    return () => clearTimeout(t);
  }, [search, load]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createCompetitor({ name: name.trim(), linkedin_url: url.trim() });
      setName("");
      setUrl("");
      setAddOpen(false);
      await load(search || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this competitor?")) return;
    try {
      await deleteCompetitor(id);
      await load(search || undefined);
    } catch {
      setError("Failed to delete");
    }
  }

  function openScrapeConfig(c: Competitor) {
    setScrapeConfigFor(c);
    setMaxPosts(5);
    setMaxComments(10);
  }

  async function handleScrape() {
    if (!scrapeConfigFor) return;
    const c = scrapeConfigFor;
    setScrapeConfigFor(null);
    setScrapingId(c.id);
    setScrapeResult(null);
    setError(null);
    try {
      const result = await fetchLeads(c.id, { max_posts: maxPosts, max_comments: maxComments });
      setScrapeResult(result);
      await load(search || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setScrapingId(null);
    }
  }

  async function openDetailModal(id: number) {
    setDetailLoading(true);
    setDetailComp(null);
    setDetailPosts([]);
    try {
      const [comp, posts] = await Promise.all([
        getCompetitor(id),
        getCompetitorPosts(id),
      ]);
      setDetailComp(comp);
      setDetailPosts(posts);
    } catch {
      setError("Failed to load competitor details");
      setDetailLoading(false);
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Competitors</h1>
          <p className="mt-1 text-sm text-muted">
            Track LinkedIn profiles and scrape their post commenters as leads
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
              placeholder="Search competitors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
          </div>
          <button
            onClick={() => load(search || undefined)}
            className="rounded-lg border border-border bg-surface p-2 text-muted hover:text-foreground hover:bg-surface-hover transition-all"
            title="Refresh"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:bg-accent-hover"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      {scrapeResult && (
        <div className="mt-4 rounded-lg border border-green-900 bg-green-950/50 px-4 py-3 text-sm text-green-400">
          Scrape complete: {scrapeResult.stats.leads} leads, {scrapeResult.stats.posts} posts, {scrapeResult.stats.comments} comments
          <button onClick={() => setScrapeResult(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Competitors table */}
      {competitors.length === 0 ? (
        <EmptyState
          title="No competitors yet"
          description="Click 'Add' to start tracking a competitor's LinkedIn profile."
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-4 py-3 font-medium text-muted">Name</th>
                <th className="px-4 py-3 font-medium text-muted">LinkedIn URL</th>
                <th className="px-4 py-3 text-center font-medium text-muted">Posts</th>
                <th className="px-4 py-3 text-center font-medium text-muted">Leads</th>
                <th className="px-4 py-3 font-medium text-muted text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetailModal(c.id)}
                      className="font-medium text-foreground hover:text-accent transition-colors"
                    >
                      {c.name}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={c.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline truncate block max-w-xs"
                    >
                      {c.linkedin_url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-center text-foreground tabular-nums">
                    {c.post_count}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground tabular-nums">
                    {c.lead_count}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openScrapeConfig(c)}
                        disabled={scrapingId === c.id}
                        className="rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
                      >
                        {scrapingId === c.id ? (
                          <span className="flex items-center gap-1.5">
                            <Spinner size="sm" />
                            Scraping...
                          </span>
                        ) : (
                          "Scrape"
                        )}
                      </button>
                      <button
                        onClick={() => setInfoComp(c)}
                        className="rounded-md bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400 hover:bg-purple-500/20 transition-colors"
                      >
                        Info
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Competitor Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Competitor"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Name</label>
            <input
              type="text"
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">LinkedIn URL</label>
            <input
              type="url"
              placeholder="https://linkedin.com/company/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim() || !url.trim()}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:bg-accent-hover disabled:opacity-50"
            >
              {creating && <Spinner size="sm" />}
              Add Competitor
            </button>
          </div>
        </form>
      </Modal>

      {/* Competitor Detail Modal */}
      <Modal
        open={detailLoading || detailComp !== null}
        onClose={() => { setDetailComp(null); setDetailLoading(false); }}
        title={detailComp?.name || "Loading..."}
        wide
      >
        {detailLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : detailComp && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <a
                  href={detailComp.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                >
                  {detailComp.linkedin_url}
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
                <div className="mt-2 flex gap-4 text-sm text-muted">
                  <span>{detailPosts.length} posts</span>
                  <span>{detailPosts.reduce((sum, p) => sum + p.post_comments.length, 0)} comments</span>
                </div>
              </div>
            </div>

            {/* Posts */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground">
                Posts ({detailPosts.length})
              </h3>

              {detailPosts.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  No posts scraped yet. Click &quot;Scrape&quot; in the table to fetch posts and comments.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {detailPosts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>
                          {new Date(post.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <div className="flex items-center gap-3">
                          <span>{post.likes_count} likes</span>
                          <span>{post.comments_count} comments</span>
                          <span>{post.shares_count} shares</span>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-foreground leading-relaxed whitespace-pre-line line-clamp-6">
                        {post.content}
                      </p>

                      {post.images.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto">
                          {post.images.slice(0, 4).map((img, i) => (
                            <Image
                              key={i}
                              src={img}
                              alt=""
                              width={160}
                              height={100}
                              className="h-24 w-auto rounded-lg object-cover shrink-0"
                              unoptimized
                            />
                          ))}
                        </div>
                      )}

                      {post.url && (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block text-xs text-accent hover:underline"
                        >
                          View on LinkedIn &rarr;
                        </a>
                      )}

                      {post.post_comments.length > 0 && (
                        <div className="mt-4 border-t border-border pt-4">
                          <p className="text-xs font-medium text-muted mb-3">
                            {post.post_comments.length} comment{post.post_comments.length !== 1 && "s"}
                          </p>
                          <div className="space-y-3">
                            {post.post_comments.map((cm) => (
                              <CommentItem
                                key={cm.id}
                                comment={cm}
                                onLeadInfo={(leadId) => setLeadProfileId(leadId)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Scrape Config Modal */}
      <Modal
        open={scrapeConfigFor !== null}
        onClose={() => setScrapeConfigFor(null)}
        title={scrapeConfigFor ? `Scrape: ${scrapeConfigFor.name}` : "Scrape"}
      >
        {scrapeConfigFor && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Configure how many posts and comments to scrape from this competitor&apos;s LinkedIn profile.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Max Posts</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxPosts}
                  onChange={(e) => setMaxPosts(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Max Comments</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxComments}
                  onChange={(e) => setMaxComments(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setScrapeConfigFor(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScrape}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:bg-accent-hover"
              >
                Start Scraping
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Info (raw JSON) Modal */}
      <Modal
        open={infoComp !== null}
        onClose={() => setInfoComp(null)}
        title={infoComp ? `Info: ${infoComp.name}` : "Info"}
      >
        {infoComp && (
          <pre className="text-xs text-foreground whitespace-pre-wrap break-words font-mono bg-surface rounded-lg p-4 overflow-x-auto">
            {JSON.stringify(infoComp, null, 2)}
          </pre>
        )}
      </Modal>

      {/* Lead Profile Modal (from comment Info) */}
      <LeadProfileModal
        leadId={leadProfileId}
        onClose={() => setLeadProfileId(null)}
      />
    </div>
  );
}
