import { withPageTitle } from "../../../components/layout/PageTitle";
import { Navigate, Route } from "react-router-dom";
import { ProductFormPage } from "../product/pages/ProductFormPage";
import { ProductListPage } from "../product/pages/ProductListPage";
import { StockInventoryPage } from "../stock/pages/StockInventoryPage";
import { StockGroupProductsPage } from "../stock/pages/StockGroupProductsPage";
import { PurchaseAccountingPage } from "../accounting/pages/PurchaseAccountingPage";
import { PurchaseBillPaymentsPage } from "../accounting/pages/PurchaseBillPaymentsPage";
import { PurchaseBillScanPage } from "../scan-bill/pages/PurchaseBillScanPage";

export const purchaseRoutes = <>
  <Route path="/purchase/scan-bill" element={withPageTitle("Purchase Bill Scan", <PurchaseBillScanPage />)} />
  <Route path="/purchase/accounting" element={withPageTitle("Purchase Accounting", <PurchaseAccountingPage />)} />
  <Route path="/purchase/accounting/payments" element={withPageTitle("Purchase Bill Payments", <PurchaseBillPaymentsPage />)} />
  <Route path="/purchase/stock" element={withPageTitle("Stock Inventory", <StockInventoryPage />)} />
  <Route path="/purchase/stock/:brandId/:productModelId/:variantId" element={withPageTitle("Stock Products", <StockGroupProductsPage />)} />
  <Route path="/purchase/products">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={withPageTitle("Purchase Products", <ProductListPage />)} />
    <Route path="add" element={withPageTitle("Add Purchase Product", <ProductFormPage mode="create" />)} />
    <Route path="bulk-update" element={withPageTitle("Bulk Update Purchase Product", <ProductFormPage mode="bulk-update" />)} />
    <Route path=":id/edit" element={withPageTitle("Edit Purchase Product", <ProductFormPage mode="edit" />)} />
  </Route>
</>;
