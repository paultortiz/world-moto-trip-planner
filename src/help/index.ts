/**
 * Help System Public API
 *
 * Usage:
 *   import { HelpProvider, useHelp, HelpDrawer, HelpButton } from "@/help";
 */

// Provider and hooks
export { HelpProvider, useHelp, useHelpOptional } from "./HelpProvider";

// Client wrapper for server components
export { HelpClientWrapper } from "./HelpClientWrapper";

// UI Components
export { HelpDrawer, HelpSearch, HelpButton } from "./components";

// Types
export type {
  HelpArticle,
  HelpArticleMeta,
  HelpCategory,
  HelpContextValue,
  Tour,
  TourStep,
} from "./types";

// Article utilities
export {
  helpArticles,
  getArticlesByCategory,
  getArticleMeta,
  searchArticles,
  categoryOrder,
} from "./lib/articles";

// Content loading
export { loadArticleContent, getArticleIds } from "./lib/contentLoader";
