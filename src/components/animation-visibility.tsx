"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function AnimationVisibility({
  children,
  className = "",
  rootMargin = "320px 0px",
}: {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin,
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      data-in-view={inView ? "true" : "false"}
    >
      {children}
    </div>
  );
}
