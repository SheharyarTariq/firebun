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
      <Chips<PeriodPreset>
        aria-label="Period"
        value={preset}
        onChange={(p) => onChange(p === "custom" ? { preset: p, range: { from, to } } : { preset: p })}
        options={presets.map((p) => ({ value: p, label: LABELS[p] }))}
      />
      {preset === "custom" && (
        <div className="flex items-end gap-2">
          <Input label="From" type="date" max={today} value={from} onChange={(e) => setFrom(e.target.value)} containerClassName="flex-1" className="h-10 text-sm" />
          <Input label="To" type="date" max={today} value={to} onChange={(e) => setTo(e.target.value)} containerClassName="flex-1" className="h-10 text-sm" />
          <Button
            className="h-10"
            disabled={!from || !to || from > to}
            onClick={() => onChange({ preset: "custom", range: { from, to } })}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
