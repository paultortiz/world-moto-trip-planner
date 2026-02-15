"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import { useHelp } from "../HelpProvider";
import { searchArticles, categoryOrder, getArticleMeta } from "../lib/articles";
import { loadArticleContent } from "../lib/contentLoader";
import type { HelpArticle, HelpArticleMeta, HelpCategory } from "../types";
import { HelpSearch } from "./HelpSearch";

export function HelpDrawer() {
  const t = useTranslations("help");
  const {
    isDrawerOpen,
    closeDrawer,
    activeArticleId,
    openArticle,
    searchQuery,
    setSearchQuery,
  } = useHelp();

  const [mounted, setMounted] = useState(false);
  const [articleContent, setArticleContent] = useState<HelpArticle | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load article content when activeArticleId changes
  useEffect(() => {
    if (!activeArticleId) {
      setArticleContent(null);
      return;
    }

    setLoadingArticle(true);
    loadArticleContent(activeArticleId)
      .then((content) => {
        setArticleContent(content);
      })
      .finally(() => {
        setLoadingArticle(false);
      });
  }, [activeArticleId]);

  // Focus management when drawer opens
  useEffect(() => {
    if (isDrawerOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isDrawerOpen]);

  // Focus trap within drawer
  useEffect(() => {
    if (!isDrawerOpen) return;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab" || !drawerRef.current) return;

      const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, [isDrawerOpen]);

  // Filter articles based on search
  const filteredArticles = searchArticles(searchQuery);

  // Group filtered articles by category
  const articlesByCategory = categoryOrder.reduce(
    (acc, category) => {
      const articles = filteredArticles.filter((a) => a.category === category);
      if (articles.length > 0) {
        acc[category] = articles;
      }
      return acc;
    },
    {} as Record<HelpCategory, HelpArticleMeta[]>
  );

  const handleBackToList = () => {
    openArticle(""); // Clear active article
    setSearchQuery("");
  };

  // Don't render anything if not mounted or drawer is closed
  if (!mounted || !isDrawerOpen) return null;

  const drawerContent = (
    <div
      className="fixed inset-0"
      style={{ zIndex: 999999 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => closeDrawer()}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-drawer-title"
        className="absolute bottom-0 right-0 top-0 w-full max-w-md bg-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2
            id="help-drawer-title"
            className="text-lg font-semibold text-slate-100"
          >
            {t("title")}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeDrawer}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-adv-accent"
            aria-label="Close help"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content area */}
        <div className="flex h-[calc(100%-56px)] flex-col">
          {activeArticleId && articleContent ? (
            // Article detail view
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Back button */}
              <div className="border-b border-slate-800 px-4 py-2">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex items-center gap-1 text-sm text-adv-accent hover:text-adv-accentMuted focus:outline-none focus:ring-2 focus:ring-adv-accent"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  {t("backToArticles")}
                </button>
              </div>

              {/* Article content */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {loadingArticle ? (
                  <div className="text-slate-400">Loading...</div>
                ) : (
                  <article className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-strong:text-slate-200 prose-ul:text-slate-300 prose-ol:text-slate-300 prose-li:text-slate-300">
                    <ReactMarkdown>{articleContent.content}</ReactMarkdown>
                  </article>
                )}

                {/* Related articles */}
                {articleContent.relatedArticles &&
                  articleContent.relatedArticles.length > 0 && (
                    <div className="mt-6 border-t border-slate-800 pt-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-300">
                        {t("relatedArticles")}
                      </h3>
                      <ul className="space-y-1">
                        {articleContent.relatedArticles.map((relatedId) => {
                          const meta = getArticleMeta(relatedId);
                          if (!meta) return null;
                          return (
                            <li key={relatedId}>
                              <button
                                type="button"
                                onClick={() => openArticle(relatedId)}
                                className="text-sm text-adv-accent hover:text-adv-accentMuted hover:underline focus:outline-none focus:ring-2 focus:ring-adv-accent"
                              >
                                {meta.title}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            // Article list view
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Search */}
              <div className="border-b border-slate-800 px-4 py-3">
                <HelpSearch />
              </div>

              {/* Article list */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {filteredArticles.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-slate-400">{t("noResults")}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {t("tryDifferentSearch")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(articlesByCategory).map(
                      ([category, articles]) => (
                        <div key={category}>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {t(`categories.${category}`)}
                          </h3>
                          <ul className="space-y-1">
                            {articles.map((article) => (
                              <li key={article.id}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openArticle(article.id);
                                  }}
                                  className="w-full rounded px-3 py-2 text-left transition hover:bg-slate-800 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-adv-accent"
                                >
                                  <div className="text-sm font-medium text-slate-200">
                                    {article.title}
                                  </div>
                                  <div className="mt-0.5 text-xs text-slate-400">
                                    {article.description}
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Keyboard shortcut hint */}
              <div className="border-t border-slate-800 px-4 py-2 text-center text-xs text-slate-500">
                {t("keyboardShortcut")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
