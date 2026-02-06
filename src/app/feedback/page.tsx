"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

type FeedbackType = "bug" | "feature";

interface SubmissionResult {
  success: boolean;
  message: string;
  issueUrl?: string;
}

export default function FeedbackPage() {
  const t = useTranslations("feedback");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          title,
          description,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          issueUrl: data.issueUrl,
        });
        setTitle("");
        setDescription("");
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to submit feedback.",
        });
      }
    } catch {
      setResult({
        success: false,
        message: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-adv-accentSoft">
            {t("tagline")}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-sm text-slate-300">
            {t("description")}
          </p>
        </div>

        {result && (
          <div
            className={`mb-6 rounded border p-4 ${
              result.success
                ? "border-emerald-500/50 bg-emerald-900/20 text-emerald-200"
                : "border-red-500/50 bg-red-900/20 text-red-200"
            }`}
          >
            <p>{result.message}</p>
            {result.issueUrl && (
              <p className="mt-2 text-sm">
                <a
                  href={result.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-adv-accent underline hover:text-adv-accentMuted"
                >
                  {t("viewOnGitHub")}
                </a>
              </p>
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded border border-adv-border bg-slate-900/70 p-6 shadow-adv-glow"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              {t("typeLabel")}
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFeedbackType("bug")}
                className={`flex-1 rounded border px-4 py-3 text-sm font-medium transition-colors ${
                  feedbackType === "bug"
                    ? "border-red-500/50 bg-red-900/30 text-red-200"
                    : "border-adv-border bg-slate-800/50 text-slate-300 hover:border-slate-600"
                }`}
              >
                <span className="mb-1 block text-lg">🐛</span>
                {t("bugReport")}
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType("feature")}
                className={`flex-1 rounded border px-4 py-3 text-sm font-medium transition-colors ${
                  feedbackType === "feature"
                    ? "border-adv-accent/50 bg-adv-accent/10 text-adv-accent"
                    : "border-adv-border bg-slate-800/50 text-slate-300 hover:border-slate-600"
                }`}
              >
                <span className="mb-1 block text-lg">✨</span>
                {t("featureRequest")}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-medium text-slate-200">
              {t("titleLabel")}
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
              placeholder={
                feedbackType === "bug"
                  ? t("titlePlaceholderBug")
                  : t("titlePlaceholderFeature")
              }
              className="w-full rounded border border-adv-border bg-slate-800/50 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-adv-accent focus:outline-none focus:ring-1 focus:ring-adv-accent"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-slate-200">
              {t("descriptionLabel")}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              maxLength={2000}
              placeholder={
                feedbackType === "bug"
                  ? t("descriptionPlaceholderBug")
                  : t("descriptionPlaceholderFeature")
              }
              className="w-full rounded border border-adv-border bg-slate-800/50 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-adv-accent focus:outline-none focus:ring-1 focus:ring-adv-accent"
            />
            <p className="mt-1 text-xs text-slate-500">
              {description.length}/2000 {t("characters")}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/"
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              {t("backToHome")}
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="rounded bg-adv-accent px-6 py-2 text-sm font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? t("submitting") : t("submitFeedback")}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          {t("footerNote")}{" "}
          <a
            href="https://github.com/paultortiz/world-moto-trip-planner/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-adv-accent hover:underline"
          >
            {t("gitHubRepository")}
          </a>
          . {t("mustBeSignedIn")}
        </p>
      </div>
    </main>
  );
}
