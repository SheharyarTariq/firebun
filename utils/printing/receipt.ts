/**
 * Receipt model, ESC/POS encoder and HTML renderer. Pure: runs on the server (route handler)
 * and in the browser (encoding right before printing). No React, no database.
 */
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import { format } from "date-fns";
import { formatMoney, formatOrderNumber, toShopTime } from "@/utils/helper";

export type ReceiptCopy = "customer" | "kitchen";

export interface ReceiptItem {
  qty: number;
  name: string;
  /** Line total; null on the kitchen copy. */
  amount: number | null;
  /** Deal contents, one per line. */
  children: string[];
  note: string | null;
}

export interface ReceiptModel {
  copy: ReceiptCopy;
  columns: number;
  shopName: string;
  headerLines: string[];
  orderNumber: string;
  dateTime: string;
  orderType: string;
  staff: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  /** "Paid: Cash", "PAY ON DELIVERY", "CANCELLED" */
  paymentLine: string;
  customerLines: string[];
  footer: string;
}

/** The subset of an order (with lines and creator) the receipt needs. */
export interface ReceiptOrderInput {
  dailySeq: number;
  createdAt: Date | string;
  orderType: "takeaway" | "dine_in" | "delivery";
  status: "pending" | "completed" | "cancelled";
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  total: number;
  paymentMethod: "cash" | "online" | null;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  note: string | null;
  createdByUser: { name: string };
  items: {
    id: number;
    parentOrderItemId: number | null;
    nameSnapshot: string;
    variantNameSnapshot: string;
    quantity: number;
    lineTotal: number;
    note: string | null;
  }[];
}

export interface ReceiptSettingsInput {
  shopName: string;
  phone: string | null;
  phone2: string | null;
  address: string | null;
  receiptHeaderLines: string[];
  receiptFooter: string;
  charsPerLine: number;
}

const ORDER_TYPE_LABELS = { takeaway: "Takeaway", dine_in: "Dine-in", delivery: "Delivery" } as const;
const PAYMENT_LABELS = { cash: "Cash", online: "Online" } as const;

function lineLabel(name: string, variant: string): string {
  return variant === "Regular" ? name : `${name} (${variant})`;
}

/** Generic 58 mm printers only know code page 437; map the app's typography to ASCII. */
export function toAscii(text: string): string {
  return text
    .replace(/[—–]/g, "-")
    .replace(/[·•]/g, "-")
    .replace(/×/g, "x")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7e\n]/g, "?");
}

/** "17 Sep 2:05 PM" — short enough for half a 32-column line. */
function receiptDateTime(date: Date | string): string {
  return format(toShopTime(date), "d MMM h:mm a");
}

function money(amount: number): string {
  // "Rs 1,230" → "1,230" (the currency is implied on a bill)
  return formatMoney(amount).replace(/^Rs\s?/, "");
}

export function buildReceiptModel(
  order: ReceiptOrderInput,
  settings: ReceiptSettingsInput,
  copy: ReceiptCopy = "customer"
): ReceiptModel {
  const parents = order.items.filter((i) => i.parentOrderItemId === null);
  const items: ReceiptItem[] = parents.map((p) => ({
    qty: p.quantity,
    name: lineLabel(p.nameSnapshot, p.variantNameSnapshot),
    amount: copy === "kitchen" ? null : p.lineTotal,
    children: order.items
      .filter((c) => c.parentOrderItemId === p.id)
      .map((c) => `${c.quantity}x ${lineLabel(c.nameSnapshot, c.variantNameSnapshot)}`),
    note: p.note,
  }));

  const paymentLine =
    order.status === "cancelled"
      ? "CANCELLED"
      : order.paymentMethod
        ? `Paid: ${PAYMENT_LABELS[order.paymentMethod]}`
        : "PAY ON DELIVERY";

  const customerLines = [
    order.customerName,
    order.customerPhone,
    order.deliveryAddress,
    order.note ? `Note: ${order.note}` : null,
  ].filter((v): v is string => Boolean(v && v.trim()));

  const headerLines = [
    ...settings.receiptHeaderLines,
    [settings.phone, settings.phone2].filter(Boolean).join(" / "),
    settings.address ?? "",
  ].filter((l) => l.trim() !== "");

  return {
    copy,
    columns: settings.charsPerLine,
    shopName: settings.shopName,
    headerLines: copy === "kitchen" ? [] : headerLines,
    orderNumber: formatOrderNumber(order.dailySeq),
    dateTime: receiptDateTime(order.createdAt),
    orderType: ORDER_TYPE_LABELS[order.orderType],
    staff: order.createdByUser.name,
    items,
    subtotal: order.subtotal,
    discount: order.discountAmount,
    delivery: order.deliveryCharge,
    total: order.total,
    paymentLine,
    customerLines,
    footer: copy === "kitchen" ? "" : settings.receiptFooter,
  };
}

export function sampleReceiptModel(settings: ReceiptSettingsInput, copy: ReceiptCopy = "customer"): ReceiptModel {
  return buildReceiptModel(
    {
      dailySeq: 42,
      createdAt: new Date(),
      orderType: "takeaway",
      status: "completed",
      subtotal: 1280,
      discountAmount: 50,
      deliveryCharge: 0,
      total: 1230,
      paymentMethod: "cash",
      customerName: null,
      customerPhone: null,
      deliveryAddress: null,
      note: null,
      createdByUser: { name: "Test print" },
      items: [
        { id: 1, parentOrderItemId: null, nameSnapshot: "Zinger Burger", variantNameSnapshot: "Regular", quantity: 2, lineTotal: 700, note: "extra spicy" },
        { id: 2, parentOrderItemId: null, nameSnapshot: "Deal 1", variantNameSnapshot: "Regular", quantity: 1, lineTotal: 580, note: null },
        { id: 3, parentOrderItemId: 2, nameSnapshot: "Zinger Burger", variantNameSnapshot: "Regular", quantity: 1, lineTotal: 0, note: null },
        { id: 4, parentOrderItemId: 2, nameSnapshot: "Fries", variantNameSnapshot: "S", quantity: 1, lineTotal: 0, note: null },
        { id: 5, parentOrderItemId: 2, nameSnapshot: "Coca-Cola", variantNameSnapshot: "Regular", quantity: 1, lineTotal: 0, note: null },
      ],
    },
    settings,
    copy
  );
}

// ---------------------------------------------------------------------------
// ESC/POS
// ---------------------------------------------------------------------------

/** Encodes one receipt as ESC/POS bytes for a 58 mm (32-column) generic printer. */
export function encodeReceipt(model: ReceiptModel): Uint8Array {
  const columns = model.columns;
  const encoder = new ReceiptPrinterEncoder({
    language: "esc-pos",
    columns,
    feedBeforeCut: 4,
    newline: "\n",
  });
  const t = toAscii;
  const half = Math.floor(columns / 2);
  const rule = () => encoder.line("-".repeat(columns));

  encoder.initialize().codepage("cp437");

  // Header
  encoder.align("center").bold(true).size(2, 2).line(t(model.shopName.toUpperCase())).size(1, 1).bold(false);
  for (const line of model.headerLines) encoder.line(t(line));
  if (model.copy === "kitchen") encoder.bold(true).line("*** KITCHEN COPY ***").bold(false);
  rule();

  // Meta
  encoder.align("left").table(
    [
      { width: half, align: "left" },
      { width: columns - half, align: "right" },
    ],
    [
      [t(`Order ${model.orderNumber}`), t(model.dateTime)],
      [t(model.orderType), t(`By ${model.staff}`)],
    ]
  );
  rule();

  // Items
  const qtyWidth = 3;
  const amountWidth = model.copy === "kitchen" ? 0 : 8;
  const nameWidth = columns - qtyWidth - amountWidth;
  const rows: string[][] = [];
  for (const item of model.items) {
    rows.push([
      `${item.qty}x`,
      t(item.name),
      ...(amountWidth ? [item.amount === null ? "" : money(item.amount)] : []),
    ]);
    for (const child of item.children) rows.push(["", t(`- ${child}`), ...(amountWidth ? [""] : [])]);
    if (item.note) rows.push(["", t(`* ${item.note}`), ...(amountWidth ? [""] : [])]);
  }
  encoder.table(
    [
      { width: qtyWidth, align: "left" },
      { width: nameWidth, align: "left", overflow: "wrap" },
      ...(amountWidth ? [{ width: amountWidth, align: "right" as const }] : []),
    ],
    rows
  );
  rule();

  if (model.copy === "customer") {
    // Totals
    const totals: string[][] = [["Subtotal", money(model.subtotal)]];
    if (model.discount > 0) totals.push(["Discount", `-${money(model.discount)}`]);
    if (model.delivery > 0) totals.push(["Delivery", money(model.delivery)]);
    encoder.table(
      [
        { width: half, align: "left" },
        { width: columns - half, align: "right" },
      ],
      totals
    );
    encoder.bold(true).size(1, 2).table(
      [
        { width: half, align: "left" },
        { width: columns - half, align: "right" },
      ],
      [["TOTAL", `Rs ${money(model.total)}`]]
    ).size(1, 1).bold(false);
    encoder.line(t(model.paymentLine));
  } else {
    encoder.bold(true).line(t(model.paymentLine === "CANCELLED" ? "CANCELLED" : model.orderType.toUpperCase())).bold(false);
  }

  // Customer / delivery
  if (model.customerLines.length > 0) {
    rule();
    for (const line of model.customerLines) encoder.line(t(line));
  }

  // Footer
  if (model.footer) {
    rule();
    encoder.align("center").line(t(model.footer));
  }

  encoder.newline(1).cut();
  return encoder.encode();
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

// ---------------------------------------------------------------------------
// HTML (browser print transport and previews)
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** Self-contained page sized for 58 mm paper. `autoPrint` calls window.print() on load. */
export function renderReceiptHtml(model: ReceiptModel, autoPrint = false): string {
  const e = escapeHtml;
  const row = (left: string, right: string, cls = "") =>
    `<div class="row ${cls}"><span>${e(left)}</span><span>${e(right)}</span></div>`;

  const items = model.items
    .map((item) => {
      const children = item.children.map((c) => `<div class="sub">- ${e(c)}</div>`).join("");
      const note = item.note ? `<div class="sub note">* ${e(item.note)}</div>` : "";
      return `<div class="item"><div class="row"><span>${item.qty}x ${e(item.name)}</span><span>${item.amount === null ? "" : e(money(item.amount))}</span></div>${children}${note}</div>`;
    })
    .join("");

  const totals =
    model.copy === "customer"
      ? [
          row("Subtotal", money(model.subtotal)),
          model.discount > 0 ? row("Discount", `-${money(model.discount)}`) : "",
          model.delivery > 0 ? row("Delivery", money(model.delivery)) : "",
          row("TOTAL", `Rs ${money(model.total)}`, "total"),
          `<div>${e(model.paymentLine)}</div>`,
        ].join("")
      : `<div class="total">${e(model.paymentLine === "CANCELLED" ? "CANCELLED" : model.orderType.toUpperCase())}</div>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${e(model.shopName)} ${e(model.orderNumber)}</title>
<style>
  @page { size: 58mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { width: 58mm; padding: 2mm 3mm; box-sizing: border-box; font: 11px/1.35 "Courier New", Courier, monospace; }
  .center { text-align: center; }
  .shop { font-size: 18px; font-weight: 700; letter-spacing: 1px; }
  .rule { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .row span:last-child { white-space: nowrap; }
  .item { margin: 2px 0; }
  .sub { padding-left: 12px; }
  .note { font-style: italic; }
  .total { font-size: 15px; font-weight: 700; margin-top: 2px; }
  .kitchen { font-weight: 700; }
</style></head>
<body${autoPrint ? ' onload="window.print()"' : ""}>
  <div class="center shop">${e(model.shopName.toUpperCase())}</div>
  ${model.headerLines.map((l) => `<div class="center">${e(l)}</div>`).join("")}
  ${model.copy === "kitchen" ? '<div class="center kitchen">*** KITCHEN COPY ***</div>' : ""}
  <div class="rule"></div>
  ${row(`Order ${model.orderNumber}`, model.dateTime)}
  ${row(model.orderType, `By ${model.staff}`)}
  <div class="rule"></div>
  ${items}
  <div class="rule"></div>
  ${totals}
  ${model.customerLines.length ? `<div class="rule"></div>${model.customerLines.map((l) => `<div>${e(l)}</div>`).join("")}` : ""}
  ${model.footer ? `<div class="rule"></div><div class="center">${e(model.footer)}</div>` : ""}
</body></html>`;
}
