import { DynamicGrid } from "../../../dynamic-grid/DynamicGrid";
import { useNavigate } from "react-router-dom";
import { APP_ROUTES } from "../../../../config/routes";
import { stockColumns } from "../config/stock.columns";
import type { StockGroup } from "../types/stock.types";
import { stockGroupSource } from "./stockApi";

export function StockInventoryPage() {
  const navigate = useNavigate();
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Stock Inventory</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Available products grouped by brand, model, and variant. View a group to select an individual product for sale.
        </p>
      </header>
      <DynamicGrid
        title="Stock Inventory"
        columns={stockColumns}
        mode="server"
        serverSource={stockGroupSource}
        getRowId={(item: StockGroup) => `${item.brandId}:${item.productModelId}:${item.variantId}`}
        selectable={false}
        onView={(group: StockGroup) => navigate(
          APP_ROUTES.purchase.stockProducts(group.brandId, group.productModelId, group.variantId),
          { state: { group } },
        )}
        emptyMessage="No available products are in stock."
      />
    </section>
  );
}
