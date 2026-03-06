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
  discoverCompetitors,
} from "@/lib/api";
import type { Competitor, PostWithComments, FetchLeadsResponse, SuggestedCompetitor } from "@/lib/types";
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
  const [maxPosts, setMaxPosts] = useState("5");
  const [maxComments, setMaxComments] = useState("10");

  // Detail modal
  const [detailComp, setDetailComp] = useState<Competitor | null>(null);
  const [detailPosts, setDetailPosts] = useState<PostWithComments[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Info modal
  const [infoComp, setInfoComp] = useState<Competitor | null>(null);

  // Lead profile modal (triggered from comment Info)
  const [leadProfileId, setLeadProfileId] = useState<number | null>(null);

  // Discover modal
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoverPrompt, setDiscoverPrompt] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedCompetitor[]>([]);
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());
  const [discoverError, setDiscoverError] = useState<string | null>(null);

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
    setMaxPosts("5");
    setMaxComments("10");
  }

  async function handleScrape() {
    if (!scrapeConfigFor) return;
    const c = scrapeConfigFor;
    setScrapingId(c.id);
    setScrapeResult(null);
    setError(null);
    try {
      const result = await fetchLeads(c.id, { max_posts: Number(maxPosts) || 5, max_comments: Number(maxComments) || 10 });
      setScrapeResult(result);
      setScrapeConfigFor(null);
      await load(search || undefined);
    } catch (err) {
      setScrapeConfigFor(null);
      setError(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setScrapingId(null);
    }
  }

  async function handleDiscover() {
    setDiscovering(true);
    setDiscoverError(null);
    setSuggestions([]);
    setAddedUrls(new Set());
    try {
      const results = await discoverCompetitors(discoverPrompt);
      setSuggestions(results);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  }

  async function handleAddSuggestion(s: SuggestedCompetitor) {
    try {
      const created = await createCompetitor({ name: s.name, linkedin_url: s.linkedin_url });
      setAddedUrls((prev) => new Set(prev).add(s.linkedin_url));
      setCompetitors((prev) => [...prev, created]);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "Failed to add");
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
            onClick={() => { setDiscoverOpen(true); setDiscoverPrompt(""); setSuggestions([]); setDiscoverError(null); }}
            className="flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition-all hover:bg-indigo-500/20 hover:border-indigo-500/60 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            Discover
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
                        Scrape
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
        onClose={() => { if (!scrapingId) setScrapeConfigFor(null); }}
        title={scrapeConfigFor ? `Scrape: ${scrapeConfigFor.name}` : "Scrape"}
        wide={!!scrapingId}
      >
        {scrapeConfigFor && scrapingId ? (
          <div className="flex flex-col items-center justify-center py-20 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-80 w-80 rounded-full bg-accent/15 blur-[80px] animate-glow-pulse" />
              <div className="absolute h-60 w-60 rounded-full bg-purple-500/10 blur-[60px] animate-glow-pulse" style={{ animationDelay: '1s' }} />
            </div>
            <div className="relative h-44 w-44 z-10">
              <div className="absolute inset-0 animate-orbit-1">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#sg1)" strokeWidth="3" strokeLinecap="round" strokeDasharray="60 228" />
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#sg1b)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="30 258" strokeDashoffset="120" />
                  <defs>
                    <linearGradient id="sg1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="sg1b" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="absolute inset-4 animate-orbit-2">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#sg2)" strokeWidth="3" strokeLinecap="round" strokeDasharray="70 218" />
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#sg2b)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="25 263" strokeDashoffset="150" />
                  <defs>
                    <linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
                      <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="sg2b" x1="100%" y1="0%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#e879f9" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="absolute inset-8 animate-orbit-3">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#sg3)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="50 238" />
                  <defs>
                    <linearGradient id="sg3" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
                      <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-accent/30 blur-md animate-pulse" />
                  <div className="absolute -inset-1.5 rounded-full bg-purple-500/20 blur-sm animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="relative h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-cyan-400 shadow-[0_0_15px_rgba(139,92,246,0.6)]" />
                </div>
              </div>
              {[...Array(10)].map((_, i) => {
                const angle = (i * 36) * (Math.PI / 180);
                const dist = 50 + (i % 3) * 20;
                const tx = Math.cos(angle) * dist;
                const ty = Math.sin(angle) * dist;
                const colors = ['bg-blue-400', 'bg-purple-400', 'bg-cyan-400', 'bg-fuchsia-400', 'bg-sky-400'];
                return (
                  <div
                    key={i}
                    className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${colors[i % colors.length]}`}
                    style={{
                      animation: `float-particle ${1.8 + i * 0.2}s ease-in-out infinite`,
                      animationDelay: `${i * 0.3}s`,
                      // @ts-expect-error CSS custom properties
                      '--tx': `${tx}px`,
                      '--ty': `${ty}px`,
                    }}
                  />
                );
              })}
            </div>
            <p className="relative z-10 mt-10 text-xl font-semibold tracking-wide">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient-shift_3s_ease_infinite]">
                Scraping...
              </span>
            </p>
            <p className="relative z-10 mt-2 text-sm text-muted">
              Fetching posts and extracting leads from {scrapeConfigFor.name}
            </p>
          </div>
        ) : scrapeConfigFor ? (
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
                  onChange={(e) => setMaxPosts(e.target.value)}
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
                  onChange={(e) => setMaxComments(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleScrape}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:bg-accent-hover"
              >
                Start Scraping
              </button>
              <button
                onClick={() => setScrapeConfigFor(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
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

      {/* Discover Competitors Modal */}
      <Modal
        open={discoverOpen}
        onClose={() => setDiscoverOpen(false)}
        title="Discover Competitors"
        wide
      >
        {discovering ? (
          <div className="flex flex-col items-center justify-center py-20 relative overflow-hidden">
            {/* Background radial glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-80 w-80 rounded-full bg-accent/15 blur-[80px] animate-glow-pulse" />
              <div className="absolute h-60 w-60 rounded-full bg-purple-500/10 blur-[60px] animate-glow-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Orbital system */}
            <div className="relative h-44 w-44 z-10">
              {/* Ring 1 — outer, thick, bright blue */}
              <div className="absolute inset-0 animate-orbit-1">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#grad1)" strokeWidth="3" strokeLinecap="round" strokeDasharray="60 228" />
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#grad1b)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="30 258" strokeDashoffset="120" />
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grad1b" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Ring 2 — mid, vivid purple */}
              <div className="absolute inset-4 animate-orbit-2">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#grad2)" strokeWidth="3" strokeLinecap="round" strokeDasharray="70 218" />
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#grad2b)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="25 263" strokeDashoffset="150" />
                  <defs>
                    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
                      <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grad2b" x1="100%" y1="0%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#e879f9" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Ring 3 — inner, electric cyan */}
              <div className="absolute inset-8 animate-orbit-3">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#grad3)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="50 238" />
                  <defs>
                    <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
                      <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Center orb with layered glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-accent/30 blur-md animate-pulse" />
                  <div className="absolute -inset-1.5 rounded-full bg-purple-500/20 blur-sm animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="relative h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-cyan-400 shadow-[0_0_15px_rgba(139,92,246,0.6)]" />
                </div>
              </div>

              {/* Floating particles — brighter, more */}
              {[...Array(10)].map((_, i) => {
                const angle = (i * 36) * (Math.PI / 180);
                const dist = 50 + (i % 3) * 20;
                const tx = Math.cos(angle) * dist;
                const ty = Math.sin(angle) * dist;
                const colors = ['bg-blue-400', 'bg-purple-400', 'bg-cyan-400', 'bg-fuchsia-400', 'bg-sky-400'];
                return (
                  <div
                    key={i}
                    className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${colors[i % colors.length]}`}
                    style={{
                      animation: `float-particle ${1.8 + i * 0.2}s ease-in-out infinite`,
                      animationDelay: `${i * 0.3}s`,
                      // @ts-expect-error CSS custom properties
                      '--tx': `${tx}px`,
                      '--ty': `${ty}px`,
                    }}
                  />
                );
              })}
            </div>

            <p className="relative z-10 mt-10 text-xl font-semibold tracking-wide">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient-shift_3s_ease_infinite]">
                Thinking...
              </span>
            </p>
            <p className="relative z-10 mt-2 text-sm text-muted">
              Analyzing your niche and finding competitors
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              AI will suggest competitors based on your niche settings. Add an optional prompt for more specific results.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Additional context (optional)</label>
              <textarea
                placeholder="e.g. Focus on companies doing AI-powered sales tools in Europe..."
                value={discoverPrompt}
                onChange={(e) => setDiscoverPrompt(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDiscover}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-sm font-medium text-white transition-all hover:from-indigo-500 hover:to-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Search with AI
              </button>
            </div>

            {discoverError && (
              <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
                {discoverError}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-medium text-foreground">Suggestions</h3>
                {suggestions.map((s, i) => {
                  const alreadyExists = competitors.some(
                    (c) => c.linkedin_url === s.linkedin_url
                  );
                  const justAdded = addedUrls.has(s.linkedin_url);
                  const added = alreadyExists || justAdded;
                  return (
                    <div
                      key={i}
                      className={`flex items-start justify-between gap-4 rounded-lg border p-4 animate-fade-in transition-all duration-500 ${
                        added
                          ? "border-green-500/30 bg-green-950/20"
                          : "border-border"
                      }`}
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{s.name}</p>
                          {added && (
                            <svg className="h-4 w-4 text-green-400 animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <a
                          href={s.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline truncate block"
                        >
                          {s.linkedin_url}
                        </a>
                        <p className="mt-1 text-xs text-muted">{s.description}</p>
                      </div>
                      <button
                        onClick={() => handleAddSuggestion(s)}
                        disabled={added}
                        className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                          added
                            ? "bg-green-500/10 text-green-400 cursor-default"
                            : "bg-accent/10 text-accent hover:bg-accent/20"
                        }`}
                      >
                        {added ? "Added" : "Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
