import type { GridColumn } from "../../../../types/grid";
import type { StockGroup } from "../types/stock.types";

const currency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const stockColumns: GridColumn<StockGroup>[] = [
  {
    id: "brandName",
    header: "Brand",
    accessor: "brandName",
    searchable: true,
    sortable: true,
  },
  {
    id: "modelName",
    header: "Model",
    accessor: "modelName",
    searchable: true,
    sortable: true,
  },
  {
    id: "variantName",
    header: "Variant",
    accessor: "variantName",
    searchable: true,
    sortable: true,
  },
  {
    id: "totalQuantity",
    header: "Available Qty",
    accessor: "totalQuantity",
    sortable: true,
    align: "right",
    showTotal: true,
    totalFormatter: (qty) => `${qty.toLocaleString()} Units`,
    cell: (_, row) => (
      <span className="inline-flex items-center justify-end font-semibold text-slate-800 dark:text-slate-200">
        {row.totalQuantity} {row.totalQuantity === 1 ? "unit" : "units"}
      </span>
    ),
  },
  {
    id: "totalProductCostWithoutGst",
    header: "Cost (Excl. GST)",
    accessor: "totalProductCostWithoutGst",
    sortable: true,
    align: "right",
    isAmount: true,
    showTotal: true,
    cell: (_, row) => (
      <div className="text-right">
        <div className="font-semibold text-slate-900 dark:text-slate-100">
          {currency(row.totalProductCostWithoutGst)}
        </div>
        {row.totalQuantity > 1 && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Unit: {currency(row.unitCostWithoutGst)}
          </div>
        )}
      </div>
    ),
  },
  {
    id: "gstRate",
    header: "GST %",
    accessor: "gstRate",
    sortable: true,
    align: "center",
    cell: (_, row) => (
      <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
        {row.gstRate != null ? `${row.gstRate}%` : "18%"}
      </span>
    ),
  },
  {
    id: "totalGstAmount",
    header: "Total GST",
    accessor: "totalGstAmount",
    sortable: true,
    align: "right",
    isAmount: true,
    showTotal: true,
    cell: (_, row) => (
      <span className="font-medium text-amber-700 dark:text-amber-400">
        {currency(row.totalGstAmount)}
      </span>
    ),
  },
  {
    id: "totalProductCostWithGst",
    header: "Cost (Incl. GST)",
    accessor: "totalProductCostWithGst",
    sortable: true,
    align: "right",
    isAmount: true,
    showTotal: true,
    cell: (_, row) => (
      <div className="text-right">
        <div className="font-bold text-emerald-700 dark:text-emerald-400">
          {currency(row.totalProductCostWithGst)}
        </div>
        {row.totalQuantity > 1 && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Unit: {currency(row.unitCostWithGst)}
          </div>
        )}
      </div>
    ),
  },
];
