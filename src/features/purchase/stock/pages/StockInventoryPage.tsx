import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Boxes, Receipt, DollarSign } from "lucide-react";
import { DynamicGrid } from "../../../dynamic-grid/DynamicGrid";
import { APP_ROUTES } from "../../../../config/routes";
import { stockColumns } from "../config/stock.columns";
import type { StockGroup, StockTotalsSummary } from "../types/stock.types";
import { stockGroupSource, fetchStockSummary } from "./stockApi";

const currency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function StockInventoryPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<StockTotalsSummary | null>(null);

  useEffect(() => {
    fetchStockSummary()
      .then((res) => setSummary(res))
      .catch((err) => console.warn("Failed to load inventory summary", err));
  }, []);

  const footerSummary = useMemo(() => {
    if (!summary) return undefined;
    return {
      totalQuantity: summary.totalQuantity,
      totalProductCostWithoutGst: summary.totalCostWithoutGst,
      totalGstAmount: summary.totalGstAmount,
      totalProductCostWithGst: summary.totalCostWithGst,
    };
  }, [summary]);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock Inventory</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Available products grouped by brand, model, and variant with comprehensive GST & cost breakdown.
          </p>
        </div>
      </header>

      {/* Database Inventory Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Boxes className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Stock Quantity</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {summary.totalQuantity.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-500">units</span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Package className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cost (Without GST)</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {currency(summary.totalCostWithoutGst)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Receipt className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total GST Valuation</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {currency(summary.totalGstAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-xs dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                <DollarSign className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Total Stock Value (With GST)</p>
                <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                  {currency(summary.totalCostWithGst)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <DynamicGrid
        title="Stock Inventory"
        columns={stockColumns}
        mode="server"
        serverSource={stockGroupSource}
        getRowId={(item: StockGroup) => `${item.brandId}:${item.productModelId}:${item.variantId}`}
        selectable={false}
        footerSummary={footerSummary}
        footerLabel="Total In Stock"
        onView={(group: StockGroup) => navigate(
          APP_ROUTES.purchase.stockProducts(group.brandId, group.productModelId, group.variantId),
          { state: { group } },
        )}
        emptyMessage="No available products are in stock."
      />
    </section>
  );
}
