/**
 * Help system type definitions
 */

export interface HelpArticle {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  category: HelpCategory;
  relatedArticles?: string[];
  content: string;
}

export type HelpCategory =
  | "getting-started"
  | "trips"
  | "map"
  | "ai-features"
  | "profile"
  | "garage";

export interface HelpArticleMeta {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  category: HelpCategory;
  relatedArticles?: string[];
}

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  content: string;
  placement: "top" | "bottom" | "left" | "right";
  action?: "click" | "input";
  highlightPadding?: number;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
}

export interface HelpContextState {
  isDrawerOpen: boolean;
  activeArticleId: string | null;
  searchQuery: string;
  activeTourId: string | null;
  activeTourStep: number;
}

export interface HelpContextActions {
  openDrawer: () => void;
  closeDrawer: () => void;
  openArticle: (articleId: string) => void;
  setSearchQuery: (query: string) => void;
  startTour: (tourId: string) => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  endTour: () => void;
}

export type HelpContextValue = HelpContextState & HelpContextActions;
