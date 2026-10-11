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
  { id: "serialNumber", header: "Serial Number", accessor: "serialNumber", searchable: true, sortable: true },
  { id: "serialNumber1", header: "Serial Number 1", accessor: "serialNumber1", searchable: true },
  { id: "colorName", header: "Color", accessor: "colorName", searchable: true, sortable: true },
  { id: "totalAmount", header: "Product Cost", accessor: "totalAmount", sortable: true, align: "right", isAmount: true, cell: (_, row) => currency(row.totalAmount) },
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
      <DynamicGrid
        title="Available Products"
        description="Only active, unsold products are listed. Select a product to continue to sales."
        columns={columns}
        mode="server"
        serverSource={source}
        getRowId={(product) => product.id}
        actions={actions}
        selectable={false}
        emptyMessage="No available products remain in this group."
      />
    </section>
  );
}
