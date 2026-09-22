"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  /** Small muted suffix, e.g. a price or "sold out". */
  hint?: string;
  disabled?: boolean;
}

interface ChipsProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Wrap onto several lines instead of scrolling sideways (pickers with many options). */
  wrap?: boolean;
  className?: string;
  /** Visible label above the chips; also names the radio group for screen readers. */
  label?: string;
  "aria-label"?: string;
}

/**
 * Single-select chips: filters, categories and small pickers (size, payment).
 * The row is 44px tall so thumbs hit it easily; chips themselves stay compact.
 */
export default function Chips<T extends string>({
  options,
  value,
  onChange,
  wrap = false,
  className,
  label,
  "aria-label": ariaLabel,
}: ChipsProps<T>) {
  const labelId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  // Which edges have more content behind them, so the fade only shows where there is something to reach.
  const [overflow, setOverflow] = useState({ start: false, end: false });

  // One tab stop for the group (the selected chip); arrow keys move and select, like a native radio group.
  const enabled = options.filter((o) => !o.disabled);
  const tabStop = enabled.find((o) => o.value === value)?.value ?? enabled[0]?.value;

  const measure = useCallback(() => {
    const el = groupRef.current;
    if (!el || wrap) return;
    const max = el.scrollWidth - el.clientWidth;
    // Sub-pixel layout means scrollLeft rarely lands exactly on 0 or max.
    setOverflow({ start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 });
  }, [wrap]);

  // Measure before paint so the fade is never wrong on the first frame.
  useLayoutEffect(measure, [measure, options]);

  useEffect(() => {
    if (wrap) return;
    const el = groupRef.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, wrap]);

  /*
   * Keep the selected chip in view. Without this a selection near the end of a long row — the
   * period pickers run to seven presets — stays off-screen after the page re-renders, so the
   * screen looks like it ignored the tap.
   */
  useEffect(() => {
    if (wrap) return;
    groupRef.current
      ?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
      ?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [value, wrap]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key) || enabled.length === 0) return;
    event.preventDefault();
    const current = Math.max(0, enabled.findIndex((o) => o.value === value));
    const last = enabled.length - 1;
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? last : event.key === "ArrowRight" || event.key === "ArrowDown" ? (current + 1) % enabled.length : (current - 1 + enabled.length) % enabled.length;
    onChange(enabled[next].value);
    requestAnimationFrame(() => {
      groupRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
    });
  };

  return (
    <>
    {label && (
      <span id={labelId} className="block text-label">
        {label}
      </span>
    )}
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? labelId : undefined}
      onKeyDown={handleKeyDown}
      onScroll={wrap ? undefined : measure}
      /*
       * The scrollbar is hidden, so without a fade an overflowing row reads as cut off rather
       * than scrollable — on Finance that hid three of seven presets behind a hard edge.
       * The mask softens whichever side still has content.
       */
      style={
        !wrap && (overflow.start || overflow.end)
          ? {
              maskImage: `linear-gradient(to right, ${overflow.start ? "transparent, black 1.5rem" : "black"}, ${
                overflow.end ? "black calc(100% - 1.5rem), transparent" : "black"
              })`,
            }
          : undefined
      }
      className={cn(
        "flex gap-2 py-1",
        wrap
          ? "flex-wrap"
          : "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={option.value === tabStop ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              // 36px to look, 44px to hit: the pseudo-element extends the tap area 4px above and below.
              // 36px to look, 44px to hit: the pseudo-element extends the tap area 4px above and below.
              "relative flex h-9 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3.5 text-label transition-[background-color,transform,border-color] after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
              /*
               * Selected is ink, not brand. Yellow is the primary *action* on a screen; when
               * filters were yellow too, the eye had nothing to lock onto and the button you
               * actually wanted competed with a row of filters for attention.
               */
              active
                ? "border-ink bg-ink text-ink-foreground"
                : "border-border bg-surface text-foreground active:bg-surface-2",
              option.disabled && "cursor-not-allowed opacity-45 active:scale-100"
            )}
          >
            {option.label}
            {option.hint && (
              <span className={cn("text-caption normal-case tracking-normal", active ? "text-ink-muted" : "text-muted")}>
                {option.hint}
              </span>
            )}
            {option.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-caption tabular-nums tracking-normal",
                  active ? "bg-white/15 text-ink-foreground" : "bg-muted-bg text-muted"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
    </>
  );
}
