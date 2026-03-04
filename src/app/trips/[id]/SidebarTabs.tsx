"use client";

import { useState, type ReactNode } from "react";

export type SidebarTabId = "route" | "plan" | "settings";

interface Tab {
  id: SidebarTabId;
  label: string;
  icon: string;
}

interface SidebarTabsProps {
  tabs: Tab[];
  defaultTab?: SidebarTabId;
  children: (activeTab: SidebarTabId) => ReactNode;
}

export default function SidebarTabs({ tabs, defaultTab, children }: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<SidebarTabId>(defaultTab ?? tabs[0]?.id ?? "route");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar - sticky at top */}
      <div className="sticky top-0 z-10 flex gap-1 border-b border-adv-border bg-slate-950/95 pb-2 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-t px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-adv-accent/20 text-adv-accent border-b-2 border-adv-accent"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content - scrollable */}
      <div className="flex-1 overflow-y-auto pt-3 pr-1">
        {children(activeTab)}
      </div>
    </div>
  );
}
