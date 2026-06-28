"use client";

import type { CSSProperties } from "react";
import { CheckCircle2, Gem, Sparkles } from "lucide-react";

const PARTICLES = Array.from({ length: 18 }, (_, index) => index);
type ParticleStyle = CSSProperties & {
  "--particle-angle": string;
  "--particle-delay": string;
  "--particle-index": number;
};

export function ShopActionBurst({
  variant,
  itemName,
}: {
  variant: "purchased" | "equipped" | null;
  itemName?: string;
}) {
  const message =
    variant === "purchased"
      ? {
          title: "Đã chốt món mới",
          body: itemName
            ? `${itemName} đã vào tủ và CTOM shop đã được ghi nhận.`
            : "Món mới đã vào tủ và CTOM shop đã được ghi nhận.",
          Icon: Gem,
        }
      : variant === "equipped"
        ? {
            title: "Đã lên diện mạo",
            body: itemName
              ? `${itemName} đang được dùng rồi.`
              : "Món đồ đang được dùng rồi.",
            Icon: CheckCircle2,
          }
        : null;

  if (!message) return null;

  const Icon = message.Icon;
  const burstKey = `${variant}:${itemName ?? ""}`;

  return (
    <div className="shop-action-burst" aria-live="polite" role="status" key={burstKey}>
      <div className="shop-action-burst-particles" aria-hidden="true">
        {PARTICLES.map((index) => (
          <span
            key={index}
            style={
              {
                "--particle-angle": `${index * 20}deg`,
                "--particle-delay": `${index * 22}ms`,
                "--particle-index": index,
              } as ParticleStyle
            }
          />
        ))}
      </div>
      <div className="shop-action-burst-card">
        <span className="shop-action-burst-icon">
          <Icon size={22} strokeWidth={2.8} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{message.title}</p>
          <p className="mt-0.5 text-xs font-bold leading-5 text-slate-600">
            {message.body}
          </p>
        </div>
        <Sparkles className="shop-action-burst-spark" size={18} aria-hidden="true" />
      </div>
    </div>
  );
}
