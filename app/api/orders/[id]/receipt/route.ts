import { getSession } from "@/server/auth/dal";
import { getOrderDetails } from "@/server/orders/queries";
import { getSettings } from "@/server/settings/queries";
import {
  buildReceiptModel,
  renderReceiptHtml,
  sampleReceiptModel,
  type ReceiptCopy,
} from "@/utils/printing/receipt";

/**
 * GET /api/orders/[id]/receipt?format=json|html&copy=customer|kitchen&print=1
 * `id` may be "sample" for a test print. The proxy skips /api, so auth is checked here.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await context.params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  const copy: ReceiptCopy = url.searchParams.get("copy") === "kitchen" ? "kitchen" : "customer";
  const autoPrint = url.searchParams.get("print") === "1";

  const settings = await getSettings();
  let model;
  if (id === "sample") {
    model = sampleReceiptModel(settings, copy);
  } else {
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) return new Response("Not found", { status: 404 });
    const order = await getOrderDetails(orderId);
    if (!order) return new Response("Not found", { status: 404 });
    model = buildReceiptModel(order, settings, copy);
  }

  if (format === "html") {
    return new Response(renderReceiptHtml(model, autoPrint), {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return Response.json(model, { headers: { "cache-control": "no-store" } });
}
