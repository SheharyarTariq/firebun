"use client";

import { useState } from "react";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import Input from "@/components/common/Input";
import type { DateRange, PeriodPreset } from "@/utils/helper";

interface PeriodPickerProps {
  preset: PeriodPreset;
  range: DateRange;
  /** Today's business date, the upper bound for custom ranges. */
  today: string;
  /** Which presets to offer, in order. */
  presets?: PeriodPreset[];
  onChange: (next: { preset: PeriodPreset; range?: DateRange }) => void;
}

const LABELS: Record<PeriodPreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "7 days",
  last30: "30 days",
  thisMonth: "This month",
  lastMonth: "Last month",
  custom: "Custom",
};

/** Preset chips plus a from/to picker for custom ranges (used by Expenses and Finance). */
export default function PeriodPicker({
  preset,
  range,
  today,
  presets = ["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth", "custom"],
  onChange,
}: PeriodPickerProps) {
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  return (
    <div className="space-y-2">
      {/*
        * `wrap`, not a scrolling row: at 360px seven presets pushed 343px off-screen, so
        * "This month", "Last month" and "Custom" could not be reached at all without knowing
        * to swipe a row that gave no sign it scrolled.
        */}
      <Chips<PeriodPreset>
        wrap
        aria-label="Period"
        value={preset}
        onChange={(p) => onChange(p === "custom" ? { preset: p, range: { from, to } } : { preset: p })}
        options={presets.map((p) => ({ value: p, label: LABELS[p] }))}
      />
      {preset === "custom" && (
        /*
         * Phone: From and To side by side, Apply full width under them. From `sm` all three sit
         * on one capped row — full-width date fields on a monitor were ~950px each.
         * `items-start`, not `items-end`: an error under one field used to lift that field and
         * its label out of line with the other.
         */
        <div className="grid grid-cols-2 items-start gap-2 sm:max-w-xl sm:grid-cols-[1fr_1fr_auto]">
          <Input label="From" type="date" max={today} value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input
            label="To"
            type="date"
            max={today}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            error={from && to && from > to ? "Before “From”" : undefined}
          />
          <div className="col-span-2 sm:col-span-1">
            {/* Stands in for a label so Apply lines up with the fields beside it. */}
            <span aria-hidden className="mb-1.5 hidden text-sm font-medium sm:block">
              &nbsp;
            </span>
            <Button
              size="lg"
              className="w-full"
              disabled={!from || !to || from > to}
              onClick={() => onChange({ preset: "custom", range: { from, to } })}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
