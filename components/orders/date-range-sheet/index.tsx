"use client";

import { useState } from "react";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import Input from "@/components/common/Input";
import { rangeForPreset, type DateRange } from "@/utils/helper";

type Mode = "day" | "range";

const QUICK_RANGES = [
  { preset: "last7", label: "7 days" },
  { preset: "last30", label: "30 days" },
  { preset: "thisMonth", label: "This month" },
  { preset: "lastMonth", label: "Last month" },
] as const;

interface DateRangeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessDate: string;
  /** The span on screen, or null when one day is. */
  range: DateRange | null;
  todayBusinessDate: string;
  /** `from === to` means a single day. */
  onApply: (range: DateRange) => void;
}

/** Pick one business day or a from/to span for the orders list. Remount with a new `key` per open. */
export default function DateRangeSheet({ open, onOpenChange, businessDate, range, todayBusinessDate, onApply }: DateRangeSheetProps) {
  const [mode, setMode] = useState<Mode>(range ? "range" : "day");
  const [day, setDay] = useState(businessDate);
  const [from, setFrom] = useState(range?.from ?? businessDate);
  const [to, setTo] = useState(range?.to ?? businessDate);

  const rangeError = from && to && from > to ? "Before “From”" : undefined;
  const valid = mode === "day" ? !!day : !!from && !!to && !rangeError;

  const handleSubmit = () => {
    if (!valid) return;
    onApply(mode === "day" ? { from: day, to: day } : { from, to });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Show orders for"
      onSubmit={handleSubmit}
      footer={
        <Button type="submit" size="lg" className="w-full" disabled={!valid}>
          Show orders
        </Button>
      }
    >
      <div className="space-y-4">
        <Chips<Mode>
          aria-label="Day or range"
          value={mode}
          onChange={setMode}
          options={[
            { value: "day", label: "One day" },
            { value: "range", label: "Date range" },
          ]}
        />

        {mode === "day" ? (
          <Input label="Date" type="date" max={todayBusinessDate} value={day} onChange={(e) => setDay(e.target.value)} />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {QUICK_RANGES.map(({ preset, label }) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = rangeForPreset(preset, todayBusinessDate);
                    setFrom(next.from);
                    setTo(next.to);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 items-start gap-2">
              <Input label="From" type="date" max={todayBusinessDate} value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input
                label="To"
                type="date"
                max={todayBusinessDate}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                error={rangeError}
              />
            </div>
            <p className="text-xs text-muted">Up to 92 days at a time.</p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
