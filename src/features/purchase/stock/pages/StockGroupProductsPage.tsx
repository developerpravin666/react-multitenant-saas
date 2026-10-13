import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../../components/ui/Button";
import { APP_ROUTES } from "../../../../config/routes";
import { DynamicGrid } from "../../../dynamic-grid/DynamicGrid";
import type { GridAction, GridColumn } from "../../../../types/grid";
import type { AvailableStockProduct, StockGroup } from "../types/stock.types";
import { availableProductsSource } from "./stockApi";

const currency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const columns: GridColumn<AvailableStockProduct>[] = [
  { id: "serialNumber", header: "Serial Number (IMEI 1)", accessor: "serialNumber", searchable: true, sortable: true },
  { id: "serialNumber1", header: "Serial Number 2 (IMEI 2)", accessor: "serialNumber1", searchable: true },
  { id: "colorName", header: "Color", accessor: "colorName", searchable: true, sortable: true },
  {
    id: "costWithoutGst",
    header: "Cost (Excl. GST)",
    accessor: "costWithoutGst",
    sortable: true,
    align: "right",
    isAmount: true,
    showTotal: true,
    cell: (_, row) => (
      <span className="font-semibold text-slate-800 dark:text-slate-200">
        {currency(row.costWithoutGst)}
      </span>
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
    id: "gstAmount",
    header: "GST Amount",
    accessor: "gstAmount",
    sortable: true,
    align: "right",
    isAmount: true,
    showTotal: true,
    cell: (_, row) => (
      <span className="font-medium text-amber-700 dark:text-amber-400">
        {currency(row.gstAmount)}
      </span>
    ),
  },
  {
    id: "totalAmount",
    header: "Cost (Incl. GST)",
    accessor: "totalAmount",
    sortable: true,
    align: "right",
    isAmount: true,
    showTotal: true,
    cell: (_, row) => (
      <span className="font-bold text-emerald-700 dark:text-emerald-400">
        {currency(row.totalAmount)}
      </span>
    ),
  },
];

export function StockGroupProductsPage() {
  const { brandId = "", productModelId = "", variantId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const group = (location.state as { group?: StockGroup } | null)?.group;
  const source = useMemo(
    () => availableProductsSource(brandId, productModelId, variantId),
    [brandId, productModelId, variantId],
  );
  const actions: GridAction<AvailableStockProduct>[] = [
    {
      id: "select-for-sale",
      label: "Select for sale",
      icon: "view",
      onClick: (product) => navigate(APP_ROUTES.sale.products.add, {
        state: { initialValues: { productId: product.id } },
      }),
    },
  ];

  const footerSummary = useMemo(() => {
    if (!group) return undefined;
    return {
      costWithoutGst: group.totalProductCostWithoutGst,
      gstAmount: group.totalGstAmount,
      totalAmount: group.totalProductCostWithGst,
    };
  }, [group]);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Available Products</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {group
              ? `${group.brandName} · ${group.modelName} · ${group.variantName}`
              : "Choose an available product to start a sale."}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate(APP_ROUTES.purchase.stock)}>Back to stock</Button>
      </header>

      {group && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">Available Qty</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{group.totalQuantity} units</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">Cost (Excl. GST)</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{currency(group.totalProductCostWithoutGst)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total GST ({group.gstRate ?? 18}%)</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{currency(group.totalGstAmount)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <p className="text-xs text-emerald-800 dark:text-emerald-300">Total Valuation (With GST)</p>
            <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{currency(group.totalProductCostWithGst)}</p>
          </div>
        </div>
      )}

      <DynamicGrid
        title="Available Products"
        description="Only active, unsold products are listed. Select a product to continue to sales."
        columns={columns}
        mode="server"
        serverSource={source}
        getRowId={(product) => product.id}
        actions={actions}
        selectable={false}
        footerSummary={footerSummary}
        footerLabel="Group Total"
        emptyMessage="No available products remain in this group."
      />
    </section>
  );
}
