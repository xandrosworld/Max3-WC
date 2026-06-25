"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function ExpandableList({
  children,
  visibleCount = 3,
  totalCount,
}: {
  children: React.ReactNode[];
  visibleCount?: number;
  totalCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = totalCount > visibleCount;

  return (
    <>
      {expanded ? children : children.slice(0, visibleCount)}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50 hover:text-slate-950 transition-colors"
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
          {expanded ? "Thu gọn" : `Xem thêm (${totalCount - visibleCount})`}
        </button>
      )}
    </>
  );
}
