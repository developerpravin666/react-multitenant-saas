import { Navigate, Route } from "react-router-dom";
import { ProductFormPage } from "../product/pages/ProductFormPage";
import { ProductListPage } from "../product/pages/ProductListPage";
import { StockInventoryPage } from "../stock/pages/StockInventoryPage";
import { StockGroupProductsPage } from "../stock/pages/StockGroupProductsPage";
import { PurchaseAccountingPage } from "../accounting/pages/PurchaseAccountingPage";
import { PurchaseBillPaymentsPage } from "../accounting/pages/PurchaseBillPaymentsPage";

export const purchaseRoutes = <>
  <Route path="/purchase/accounting" element={<PurchaseAccountingPage />} />
  <Route path="/purchase/accounting/payments" element={<PurchaseBillPaymentsPage />} />
  <Route path="/purchase/stock" element={<StockInventoryPage />} />
  <Route path="/purchase/stock/:brandId/:productModelId/:variantId" element={<StockGroupProductsPage />} />
  <Route path="/purchase/products">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={<ProductListPage />} />
    <Route path="add" element={<ProductFormPage mode="create" />} />
    <Route path="bulk-update" element={<ProductFormPage mode="bulk-update" />} />
    <Route path=":id/edit" element={<ProductFormPage mode="edit" />} />
  </Route>
</>;
