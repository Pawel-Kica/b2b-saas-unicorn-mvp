"use client";

import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/lib/api";
import type { SiteSettings } from "@/lib/types";
import Spinner from "@/components/Spinner";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [niche, setNiche] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [nicheDescription, setNicheDescription] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings(s);
        setNiche(s.niche);
        setAboutMe(s.about_me);
        setNicheDescription(s.niche_description);
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateSettings({
        niche: niche.trim(),
        about_me: aboutMe.trim(),
        niche_description: nicheDescription.trim(),
      });
      setSettings(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Configure your niche so AI can discover relevant competitors
        </p>
      </div>

      <form onSubmit={handleSave} className="mt-6 max-w-2xl space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Niche
          </label>
          <input
            type="text"
            placeholder="e.g. B2B SaaS, DevTools, Fintech..."
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            About Me
          </label>
          <textarea
            placeholder="Who are you? Your name, what you do, your expertise, results you've achieved..."
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
          />
          <p className="mt-1 text-xs text-muted">Used by AI to personalize voice outreach scripts</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Niche Description
          </label>
          <textarea
            placeholder="Describe your niche in more detail: target audience, key products, geographic focus..."
            value={nicheDescription}
            onChange={(e) => setNicheDescription(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-900 bg-green-950/50 px-4 py-3 text-sm text-green-400">
            Settings saved successfully.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:bg-accent-hover disabled:opacity-50"
        >
          {saving && <Spinner size="sm" />}
          Save Settings
        </button>
      </form>
    </div>
  );
}
