import { withPageTitle } from "../../../components/layout/PageTitle";
import { Navigate, Route } from "react-router-dom";
import { SaleProductFormPage } from "../product/pages/SaleProductFormPage";
import { SaleProductListPage } from "../product/pages/SaleProductListPage";
import { SalesPaymentPage } from "../product/pages/SalesPaymentPage";
import { SalesAccountingPage } from "../accounting/pages/SalesAccountingPage";
import { SalesBillPaymentsPage } from "../accounting/pages/SalesBillPaymentsPage";
import { CustomerListPage } from "../customers/CustomerListPage";
import { CustomerFormPage } from "../customers/CustomerFormPage";
import { CustomerHistoryPage } from "../customers/CustomerHistoryPage";
import { CustomerBillPrintPage } from "../accounting/pages/CustomerBillPrintPage";
import { SalesInvoiceListPage } from "../invoices/pages/SalesInvoiceListPage";
import { SalesInvoiceFormPage } from "../invoices/pages/SalesInvoiceFormPage";
import { SalesInvoicePrintPage } from "../invoices/pages/SalesInvoicePrintPage";
import { EWayBillAndEInvoicePage } from "../../compliance/pages/EWayBillAndEInvoicePage";

export const saleRoutes = (
  <>
    <Route path="/sales/invoices" element={withPageTitle("Sales Invoices", <SalesInvoiceListPage />)} />
    <Route path="/sales/invoices/new" element={withPageTitle("New Sales Invoice", <SalesInvoiceFormPage />)} />
    <Route path="/sales/invoices/:id/print" element={withPageTitle("Print Sales Invoice", <SalesInvoicePrintPage />)} />
    <Route path="/sales/compliance" element={withPageTitle("E-Way Bill & E-Invoice", <EWayBillAndEInvoicePage />)} />
    <Route path="/compliance/eway-einvoice" element={withPageTitle("E-Way Bill & E-Invoice", <EWayBillAndEInvoicePage />)} />
    <Route path="/sales/accounting" element={withPageTitle("Sales Accounting", <SalesAccountingPage />)} />
    <Route path="/sales/accounting/payments/:id" element={withPageTitle("Sales Bill Payments", <SalesBillPaymentsPage />)} />
    <Route path="/sales/accounting/print/:id" element={withPageTitle("Print Customer Bill", <CustomerBillPrintPage />)} />
    <Route path="/sales/customers">
      <Route index element={<Navigate to="list" replace />} />
      <Route path="list" element={withPageTitle("Customers", <CustomerListPage />)} />
      <Route path="add" element={withPageTitle("Add Customer", <CustomerFormPage mode="create" />)} />
      <Route path=":id/edit" element={withPageTitle("Edit Customer", <CustomerFormPage mode="edit" />)} />
      <Route path=":id/history" element={withPageTitle("Customer History", <CustomerHistoryPage />)} />
    </Route>
    <Route path="/sales/products">
      <Route index element={<Navigate to="list" replace />} />
      <Route path="list" element={withPageTitle("Sales", <SaleProductListPage />)} />
      <Route path="add" element={withPageTitle("Add Sale", <SaleProductFormPage mode="create" />)} />
      <Route path=":id/payment" element={withPageTitle("Sales Payment", <SalesPaymentPage />)} />
      <Route path=":id/edit" element={withPageTitle("Edit Sale", <SaleProductFormPage mode="edit" />)} />
    </Route>
  </>
);
