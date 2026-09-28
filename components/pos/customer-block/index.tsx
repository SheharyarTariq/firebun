"use client";

import { useRef, useState } from "react";
import { Check, Search, UserPlus } from "lucide-react";
import { listCustomersAction, type PickerCustomer } from "@/app/(app)/customers/actions";
import Card from "@/components/common/Card";
import Input from "@/components/common/Input";
import { callAction } from "@/utils/call-action";
import { customerLabel, formatPhone, normalisePhone } from "@/utils/helper";
import { useCart } from "../cart-store";

interface CustomerBlockProps {
  errors: Record<string, string>;
  clearError: (field: string) => void;
}

/** Enough rows to scroll through without rendering a whole book into the sheet. */
const MAX_ROWS = 40;

/**
 * Who the order is for, on every order type. One of name or phone is required — the phone is
 * what files someone as a customer, a name alone is only recorded on the order.
 *
 * The book is fetched once when the search field is first opened and filtered in the browser
 * after that, so typing never waits on the network.
 */
export default function CustomerBlock({ errors, clearError }: CustomerBlockProps) {
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<PickerCustomer[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    if (all !== null || loading) return;
    setLoading(true);
    const result = await callAction(listCustomersAction());
    setLoading(false);
    setAll(result.ok ? result.data : []);
  };

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setOpen(true);
    void load();
  };

  // A tap on a row fires pointerdown before blur, so the list can close on blur safely.
  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const choose = (match: PickerCustomer) => {
    cart.setCustomer({ customerId: match.id, customerName: match.name ?? "", customerPhone: match.phone });
    setQuery("");
    setOpen(false);
    clearError("customerName");
    clearError("customerPhone");
  };

  const text = query.trim().toLowerCase();
  const digits = normalisePhone(text);
  const rows = (all ?? []).filter(
    (c) =>
      !text ||
      customerLabel(c).toLowerCase().includes(text) ||
      (digits.length >= 3 && c.phone.includes(digits))
  );

  const picked = cart.customerId !== null;

  return (
    <div className="space-y-3 rounded-field border border-border p-3">
      <div className="relative">
        <Input
          label="Find a customer"
          placeholder="Name or phone number"
          autoComplete="off"
          value={query}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          startIcon={<Search className="h-4 w-4" />}
          hint={
            loading
              ? "Loading…"
              : all?.length === 0
                ? "Nobody on file yet — fill in the fields below."
                : "Tap to see everyone, or type to narrow it down."
          }
        />

        {open && rows.length > 0 && (
          <Card className="absolute z-20 mt-1 max-h-64 w-full divide-y divide-border overflow-y-auto p-0 shadow-lg">
            {rows.slice(0, MAX_ROWS).map((c) => (
              <button
                key={c.id}
                type="button"
                // pointerdown, not click: blur would otherwise close the list first.
                onPointerDown={(e) => {
                  e.preventDefault();
                  choose(c);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors active:bg-muted-bg"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{customerLabel(c)}</span>
                  {c.name && <span className="block text-xs text-muted">{formatPhone(c.phone)}</span>}
                </span>
              </button>
            ))}
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 items-start gap-3">
        <Input
          label="Name"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={60}
          value={cart.customerName}
          onChange={(e) => {
            // Typing over a picked customer makes this someone new again.
            cart.setCustomer({ customerId: null, customerName: e.target.value });
            clearError("customerName");
            clearError("customerPhone");
          }}
          error={errors.customerName}
        />
        <Input
          label="Phone"
          type="tel"
          inputMode="tel"
          placeholder="03xx xxxxxxx"
          autoComplete="off"
          value={cart.customerPhone}
          onChange={(e) => {
            cart.setCustomer({ customerId: null, customerPhone: e.target.value });
            clearError("customerName");
            clearError("customerPhone");
          }}
          error={errors.customerPhone}
        />
      </div>

      <Input
        label="Address (optional)"
        placeholder="Street, block, landmark"
        autoComplete="off"
        maxLength={200}
        value={cart.deliveryAddress}
        onChange={(e) => {
          cart.setCustomer({ deliveryAddress: e.target.value });
          clearError("deliveryAddress");
        }}
        error={errors.deliveryAddress}
      />

      <p className="flex items-center gap-1.5 text-xs text-muted">
        {picked ? <Check className="h-3.5 w-3.5 text-success" /> : <UserPlus className="h-3.5 w-3.5" />}
        {picked
          ? "On file — this order joins their history."
          : cart.customerPhone.trim()
            ? "They go on file when you place the order."
            : "A number files them as a customer; a name alone is only kept on this order."}
      </p>
    </div>
  );
}
