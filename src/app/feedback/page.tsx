"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

type FeedbackType = "bug" | "feature";

interface SubmissionResult {
  success: boolean;
  message: string;
  issueUrl?: string;
}

export default function FeedbackPage() {
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
            Help us improve
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Report a Bug or Request a Feature
          </h1>
          <p className="mt-4 text-sm text-slate-300">
            Found something broken or have an idea to make the trip planner better?
            Let us know! Your feedback helps us build a better experience for all riders.
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
                  View the created issue on GitHub →
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
              What type of feedback?
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
                Bug Report
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
                Feature Request
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-medium text-slate-200">
              Title
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
                  ? "Brief description of the issue"
                  : "What feature would you like?"
              }
              className="w-full rounded border border-adv-border bg-slate-800/50 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-adv-accent focus:outline-none focus:ring-1 focus:ring-adv-accent"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-slate-200">
              Description
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
                  ? "What happened? What did you expect to happen? Steps to reproduce..."
                  : "Describe the feature and why it would be useful..."
              }
              className="w-full rounded border border-adv-border bg-slate-800/50 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-adv-accent focus:outline-none focus:ring-1 focus:ring-adv-accent"
            />
            <p className="mt-1 text-xs text-slate-500">
              {description.length}/2000 characters
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/"
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              ← Back to home
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="rounded bg-adv-accent px-6 py-2 text-sm font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Your feedback will be submitted as an issue on our{" "}
          <a
            href="https://github.com/paultortiz/world-moto-trip-planner/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-adv-accent hover:underline"
          >
            GitHub repository
          </a>
          . You must be signed in to submit feedback.
        </p>
      </div>
    </main>
  );
}
