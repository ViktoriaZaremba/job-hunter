"use client";

import { useState, useRef, useLayoutEffect, ReactNode } from "react";
import { Info } from "lucide-react";

/**
 * Reusable info tooltip used across the Analytics page.
 *
 * Behavior:
 * - Wraps any element. Hovering shows the tooltip.
 * - Auto-flips above/below the trigger so it never obscures the value.
 * - Constrained max width with multiline support.
 * - Mobile: trigger tap toggles visibility.
 */
export function InfoTooltip({
  children,
  content,
  side = "top",
}: {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<"top" | "bottom">(side);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();
    const spaceAbove = trigger.top;
    const spaceBelow = window.innerHeight - trigger.bottom;
    if (side === "top" && spaceAbove < tip.height + 12 && spaceBelow > spaceAbove) {
      setPlacement("bottom");
    } else if (side === "bottom" && spaceBelow < tip.height + 12 && spaceAbove > spaceBelow) {
      setPlacement("top");
    } else {
      setPlacement(side);
    }
  }, [open, side]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={(e) => {
        // Mobile-friendly toggle: don't close parent buttons
        e.stopPropagation();
        setOpen((v) => !v);
      }}
    >
      {children}
      {open && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 left-1/2 -translate-x-1/2 ${
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
          } w-[280px] rounded-xl bg-ink-700 text-white shadow-modal px-3.5 py-3
             text-[12px] leading-relaxed whitespace-normal text-left pointer-events-none`}
        >
          {content}
        </div>
      )}
    </span>
  );
}

/* -------- Helpers to compose tooltip content consistently -------- */

export function TooltipBody({
  title,
  description,
  formula,
  values,
  result,
}: {
  title: string;
  description?: string;
  formula?: string;
  values?: { label: string; value: string | number }[];
  result?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="font-semibold text-white text-[13px]">{title}</p>
      {description && (
        <p className="text-white/80 text-[12px]">{description}</p>
      )}
      {formula && (
        <div>
          <p className="text-white/60 text-[11px] uppercase tracking-wider mb-1">
            Formula
          </p>
          <p className="text-white font-mono text-[12px] bg-white/10 rounded-md px-2 py-1">
            {formula}
          </p>
        </div>
      )}
      {values && values.length > 0 && (
        <div>
          <p className="text-white/60 text-[11px] uppercase tracking-wider mb-1">
            Values
          </p>
          <ul className="space-y-0.5">
            {values.map((v) => (
              <li key={v.label} className="flex justify-between gap-3">
                <span className="text-white/80">{v.label}</span>
                <span className="text-white font-medium tabular-nums">
                  {v.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {result && (
        <div className="pt-1.5 border-t border-white/15">
          <p className="text-white/60 text-[11px] uppercase tracking-wider mb-0.5">
            Result
          </p>
          <p className="text-white font-semibold">{result}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Small "i" icon trigger to attach a tooltip next to a value.
 */
export function InfoIcon({ size = 14 }: { size?: number }) {
  return (
    <span className="inline-flex items-center justify-center text-text-muted hover:text-text-secondary transition cursor-help">
      <Info size={size} />
    </span>
  );
}
