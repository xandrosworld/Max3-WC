"use client";

import { useState } from "react";

export function ShopCatalogTabs({
  tabs,
}: {
  tabs: {
    key: string;
    label: string;
    content: React.ReactNode;
  }[];
}) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key ?? "");

  return (
    <div>
      <nav
        className="flex max-w-full gap-1.5 overflow-x-auto pb-1 sm:gap-2 sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:p-2 sm:shadow-sm sm:shadow-slate-950/5"
        aria-label="Danh mục shop"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveKey(tab.key)}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-xl px-3 py-2 text-sm font-black transition-all sm:min-h-11 sm:px-3.5 ${
              activeKey === tab.key
                ? "border-2 border-emerald-800 bg-emerald-800 text-white shadow-md shadow-emerald-950/15"
                : "border-2 border-slate-200 bg-white text-slate-700 shadow-sm shadow-slate-950/5 hover:border-emerald-300 hover:text-slate-950"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-4">
        {tabs.map((tab) => (
          <div key={tab.key} className={activeKey === tab.key ? "block" : "hidden"}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
