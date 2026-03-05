"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { getPosts, getPost, getPostPreview, getCompetitors } from "@/lib/api";
import type { Post, PostWithComments, Competitor } from "@/lib/types";
import Spinner from "@/components/Spinner";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import CommentItem from "@/components/CommentItem";
import LeadProfileModal from "@/components/LeadProfileModal";

type SortField = "competitor__name" | "created_at" | "likes_count" | "comments_count" | "shares_count" | "lead_count";

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [competitorFilter, setCompetitorFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Info modal
  const [infoPost, setInfoPost] = useState<Post | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  // Preview modal
  const [previewPost, setPreviewPost] = useState<PostWithComments | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Lead profile modal (from comment Info)
  const [leadProfileId, setLeadProfileId] = useState<number | null>(null);

  // Expanded image
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const ordering = `${sortDir === "desc" ? "-" : ""}${sortField}`;

  const load = useCallback(async (q?: string, ord?: string, comp?: string) => {
    setLoading(true);
    try {
      setPosts(await getPosts({ search: q, ordering: ord, competitor: comp }));
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
      setSortDir(field === "competitor__name" ? "asc" : "desc");
    }
  }

  async function openInfo(id: number) {
    setInfoLoading(true);
    setInfoPost(null);
    try {
      setInfoPost(await getPost(id));
    } catch {
      /* ignore */
    } finally {
      setInfoLoading(false);
    }
  }

  async function openPreview(id: number) {
    setPreviewLoading(true);
    setPreviewPost(null);
    try {
      setPreviewPost(await getPostPreview(id));
    } catch {
      /* ignore */
    } finally {
      setPreviewLoading(false);
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
          <h1 className="text-2xl font-bold text-foreground">Posts</h1>
          <p className="mt-1 text-sm text-muted">LinkedIn posts scraped from competitors</p>
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
              placeholder="Search posts..."
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

      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Scrape a competitor to start collecting posts."
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-4 py-3">
                  <button
                    onClick={() => handleSort("competitor__name")}
                    className="flex items-center gap-1 font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Competitor <SortIcon field="competitor__name" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-muted">Content</th>
                <th className="px-4 py-3">
                  <button
                    onClick={() => handleSort("created_at")}
                    className="flex items-center gap-1 font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Date <SortIcon field="created_at" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort("likes_count")}
                    className="mx-auto flex items-center gap-1 font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Likes <SortIcon field="likes_count" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort("comments_count")}
                    className="mx-auto flex items-center gap-1 font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Comments <SortIcon field="comments_count" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort("shares_count")}
                    className="mx-auto flex items-center gap-1 font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Shares <SortIcon field="shares_count" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort("lead_count")}
                    className="mx-auto flex items-center gap-1 font-medium text-muted hover:text-foreground transition-colors"
                  >
                    Leads <SortIcon field="lead_count" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-muted text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors"
                >
                  <td className="px-4 py-3 text-accent text-xs font-medium whitespace-nowrap">
                    {post.competitor_name}
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <p className="text-foreground text-sm leading-relaxed line-clamp-2">
                      {post.content}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                    {new Date(post.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground tabular-nums">
                    {post.likes_count}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground tabular-nums">
                    {post.comments_count}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground tabular-nums">
                    {post.shares_count}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground tabular-nums">
                    {post.lead_count}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openPreview(post.id)}
                        className="rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => openInfo(post.id)}
                        className="rounded-md bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400 hover:bg-purple-500/20 transition-colors"
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

      {/* Preview Modal */}
      <Modal
        open={previewLoading || previewPost !== null}
        onClose={() => { setPreviewPost(null); setPreviewLoading(false); }}
        title={previewPost ? `${previewPost.competitor_name} — Post` : "Loading..."}
        wide
      >
        {previewLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : previewPost && (
          <div>
            {/* Images */}
            {previewPost.images.length > 0 && (
              <div className="mb-4 flex gap-3 overflow-x-auto">
                {previewPost.images.map((img, i) => (
                  <button key={i} onClick={() => setExpandedImage(img)} className="shrink-0">
                    <Image
                      src={img}
                      alt=""
                      width={600}
                      height={400}
                      className="max-h-52 w-auto rounded-lg object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Post meta */}
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                {new Date(previewPost.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <div className="flex items-center gap-3">
                <span>{previewPost.likes_count} likes</span>
                <span>{previewPost.comments_count} comments</span>
                <span>{previewPost.shares_count} shares</span>
              </div>
            </div>

            {/* Post content */}
            <p className="mt-4 text-sm text-foreground leading-relaxed whitespace-pre-line">
              {previewPost.content}
            </p>

            {/* LinkedIn link */}
            {previewPost.url && (
              <a
                href={previewPost.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                View on LinkedIn
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            )}

            {/* Comments */}
            {previewPost.post_comments.length > 0 && (
              <div className="mt-6 border-t border-border pt-5">
                <h4 className="text-sm font-semibold text-foreground mb-4">
                  Comments ({previewPost.post_comments.length})
                </h4>
                <div className="space-y-4">
                  {previewPost.post_comments.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      onLeadInfo={(leadId) => setLeadProfileId(leadId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Info (raw JSON) Modal */}
      <Modal
        open={infoLoading || infoPost !== null}
        onClose={() => { setInfoPost(null); setInfoLoading(false); }}
        title={infoPost ? `Post by ${infoPost.competitor_name}` : "Loading..."}
        wide
      >
        {infoLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : infoPost && (
          <div>
            {infoPost.url && (
              <a
                href={infoPost.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline mb-4"
              >
                View on LinkedIn
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            )}
            <pre className="text-xs text-foreground whitespace-pre-wrap break-words font-mono bg-surface rounded-lg p-4 overflow-x-auto">
              {JSON.stringify(infoPost, null, 2)}
            </pre>
          </div>
        )}
      </Modal>

      {/* Lead Profile Modal (from comment Info) */}
      <LeadProfileModal
        leadId={leadProfileId}
        onClose={() => setLeadProfileId(null)}
      />

      {/* Image lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-zoom-out"
          onClick={() => setExpandedImage(null)}
        >
          <Image
            src={expandedImage}
            alt=""
            width={1200}
            height={800}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}
