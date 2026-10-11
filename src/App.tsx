import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterTenantPage } from "./features/auth/RegisterTenantPage";
import { TenantApprovalsPage } from "./features/settings/tenants/TenantApprovalsPage";
import { ForgotPasswordPage, ResetPasswordPage } from "./features/auth/PasswordRecoveryPages";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { ChangePasswordPage } from "./features/auth/ChangePasswordPage";
import { productRoutes } from "./features/products/routes/ProductRoutes";
import { TaxFormPage } from "./features/settings/tax/pages/TaxFormPage";
import { TaxListPage } from "./features/settings/tax/pages/TaxListPage";
import { FinanceVendorFormPage } from "./features/settings/finance-vendor/pages/FinanceVendorFormPage";
import { FinanceVendorListPage } from "./features/settings/finance-vendor/pages/FinanceVendorListPage";
import { CustomerBillSettingsPage } from "./features/settings/customer-bill/CustomerBillSettingsPage";
import { AuditLogsPage } from "./features/settings/audit-logs/AuditLogsPage";
import { GeneralLedgerPage } from "./features/accounting/GeneralLedgerPage";
import { AgingReportPage } from "./features/accounting/AgingReportPage";
import { AccountingPeriodsPage } from "./features/accounting/AccountingPeriodsPage";
import { BankReconciliationPage } from "./features/accounting/BankReconciliationPage";
import { StockMovementsPage } from "./features/accounting/StockMovementsPage";
import { TaxReportsPage } from "./features/accounting/TaxReportsPage";
import { PartyStatementPage } from "./features/accounting/pages/PartyStatementPage";
import { AccountingControlsPage } from "./features/accounting/AccountingControlsPage";
import { InvoiceCorrectionsPage } from "./features/accounting/InvoiceCorrectionsPage";
import { OpeningBalancesPage } from "./features/accounting/OpeningBalancesPage";
import { OpeningStockFormPage } from "./features/accounting/OpeningStockFormPage";
import { StaffAccessPage } from "./features/accounting/StaffAccessPage";
import { AcceptInvitationPage } from "./features/auth/AcceptInvitationPage";
import { purchaseRoutes } from "./features/purchase/routes/PurchaseRoutes";
import { saleRoutes } from "./features/sale/routes/SaleRoutes";
import { APP_ROUTES } from "./config/routes";
import { DashboardPage } from "./features/dashboard/pages/DashboardPage";
import { AdminLoginPage } from "./features/auth/AdminLoginPage";
import { useAuth } from "./features/auth/AuthContext";
import { ProductOwnerDashboardPage } from "./features/admin/ProductOwnerDashboardPage";
import { TenantDirectoryPage } from "./features/admin/TenantDirectoryPage";
import { DatabaseMigrationsPage } from "./features/admin/DatabaseMigrationsPage";
import { SystemSettingsPage } from "./features/admin/SystemSettingsPage";
import { MasterImportPage } from "./features/products/import/MasterImportPage";
import { FeatureFlagsAdminPage } from "./features/feature-flags/FeatureFlagsAdminPage";
import { TableManagementDashboardPage } from "./features/admin/TableManagementDashboardPage";

function RootDashboard() {
  const { isProductOwner } = useAuth();
  return isProductOwner ? <ProductOwnerDashboardPage /> : <DashboardPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/register-tenant" element={<RegisterTenantPage />} />
      <Route path="/register" element={<RegisterTenantPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<RootDashboard />} />
          <Route path="/account/change-password" element={<ChangePasswordPage />} />
          <Route path={APP_ROUTES.generalLedger} element={<GeneralLedgerPage />} />
          <Route path={APP_ROUTES.accountingAging} element={<AgingReportPage />} />
          <Route path={APP_ROUTES.taxReports} element={<TaxReportsPage />} />
          <Route path={APP_ROUTES.partyStatement} element={<PartyStatementPage />} />
          <Route path={APP_ROUTES.accountingPeriods} element={<AccountingPeriodsPage />} />
          <Route path={APP_ROUTES.bankReconciliation} element={<BankReconciliationPage />} />
          <Route path={APP_ROUTES.stockMovements} element={<StockMovementsPage />} />
          <Route path={APP_ROUTES.accountingControls} element={<AccountingControlsPage />} />
          <Route path="/accounting/corrections" element={<InvoiceCorrectionsPage />} />
          <Route path="/accounting/opening-balances" element={<OpeningBalancesPage />} />
          <Route path="/accounting/opening-stock/add" element={<OpeningStockFormPage />} />
          <Route path="/accounting/staff" element={<StaffAccessPage />} />
          {productRoutes}
          {purchaseRoutes}
          {saleRoutes}
          <Route path="/settings/taxes">
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={<TaxListPage />} />
            <Route path="add" element={<TaxFormPage mode="create" />} />
            <Route path=":id/edit" element={<TaxFormPage mode="edit" />} />
          </Route>
          <Route path="/settings/finance-vendors">
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={<FinanceVendorListPage />} />
            <Route path="add" element={<FinanceVendorFormPage mode="create" />} />
            <Route path=":id/edit" element={<FinanceVendorFormPage mode="edit" />} />
          </Route>
          <Route path={APP_ROUTES.settings.customerBill} element={<CustomerBillSettingsPage />} />
          <Route path={APP_ROUTES.settings.auditLogs} element={<AuditLogsPage />} />
          <Route path={APP_ROUTES.settings.tenantApprovals} element={<TenantApprovalsPage />} />
          <Route path={APP_ROUTES.settings.databaseTables} element={<TableManagementDashboardPage />} />

          {/* Product Owner Console Routes */}
          <Route path="/admin" element={<Navigate to={APP_ROUTES.admin.dashboard} replace />} />
          <Route path={APP_ROUTES.admin.dashboard} element={<ProductOwnerDashboardPage />} />
          <Route path={APP_ROUTES.admin.tenants} element={<TenantDirectoryPage />} />
          <Route path={APP_ROUTES.admin.pendingApprovals} element={<TenantApprovalsPage />} />
          <Route path={APP_ROUTES.admin.databaseMigrations} element={<DatabaseMigrationsPage />} />
          <Route path={APP_ROUTES.admin.databaseTables} element={<TableManagementDashboardPage />} />
          <Route path={APP_ROUTES.admin.systemSettings} element={<SystemSettingsPage />} />
          <Route path={APP_ROUTES.admin.featureFlags} element={<FeatureFlagsAdminPage />} />
          <Route path={APP_ROUTES.admin.mastersImport} element={<MasterImportPage isAdminMode={true} />} />

          <Route path="**" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
