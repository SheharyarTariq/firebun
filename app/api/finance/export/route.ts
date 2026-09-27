import { getSession } from "@/server/auth/dal";
import { buildFinanceCsv, FINANCE_DATASETS, type FinanceDataset } from "@/server/finance/exports";
import { isIsoDate } from "@/utils/helper";

/** GET /api/finance/export?type=orders|purchases|expenses&from=yyyy-mm-dd&to=yyyy-mm-dd — admin only. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!FINANCE_DATASETS.includes(type as FinanceDataset) || !isIsoDate(from) || !isIsoDate(to)) {
    return new Response("Bad request", { status: 400 });
  }

  const csv = await buildFinanceCsv(type as FinanceDataset, { from, to });
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="firebun-${type}-${from}-to-${to}.csv"`,
      "cache-control": "no-store",
    },
  });
}
