import { withPageTitle } from "./components/layout/PageTitle";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { NotFoundPage } from "./pages/NotFoundPage";
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
import { EmailTemplatesPage } from "./features/admin/EmailTemplatesPage";
import { AdminRoute } from "./features/auth/AdminRoute";

function RootDashboard() {
  const { isProductOwner } = useAuth();
  return isProductOwner
    ? withPageTitle("Platform Dashboard", <ProductOwnerDashboardPage />)
    : withPageTitle("Dashboard", <DashboardPage />);
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={withPageTitle("Sign In", <LoginPage />)} />
      <Route path="/admin/login" element={withPageTitle("Administrator Sign In", <AdminLoginPage />)} />
      <Route path="/register-tenant" element={withPageTitle("Register Business", <RegisterTenantPage />)} />
      <Route path="/register" element={withPageTitle("Register Business", <RegisterTenantPage />)} />
      <Route path="/accept-invitation" element={withPageTitle("Accept Invitation", <AcceptInvitationPage />)} />
      <Route path="/forgot-password" element={withPageTitle("Forgot Password", <ForgotPasswordPage />)} />
      <Route path="/reset-password" element={withPageTitle("Reset Password", <ResetPasswordPage />)} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<RootDashboard />} />
          <Route path="/account/change-password" element={withPageTitle("Change Password", <ChangePasswordPage />)} />
          <Route path={APP_ROUTES.generalLedger} element={withPageTitle("General Ledger", <GeneralLedgerPage />)} />
          <Route path={APP_ROUTES.accountingAging} element={withPageTitle("Aging Report", <AgingReportPage />)} />
          <Route path={APP_ROUTES.taxReports} element={withPageTitle("Tax Reports", <TaxReportsPage />)} />
          <Route path={APP_ROUTES.partyStatement} element={withPageTitle("Party Statement", <PartyStatementPage />)} />
          <Route path={APP_ROUTES.accountingPeriods} element={withPageTitle("Accounting Periods", <AccountingPeriodsPage />)} />
          <Route path={APP_ROUTES.bankReconciliation} element={withPageTitle("Bank Reconciliation", <BankReconciliationPage />)} />
          <Route path={APP_ROUTES.stockMovements} element={withPageTitle("Stock Movements", <StockMovementsPage />)} />
          <Route path={APP_ROUTES.accountingControls} element={withPageTitle("Accounting Controls", <AccountingControlsPage />)} />
          <Route path="/accounting/corrections" element={withPageTitle("Invoice Corrections", <InvoiceCorrectionsPage />)} />
          <Route path="/accounting/opening-balances" element={withPageTitle("Opening Balances", <OpeningBalancesPage />)} />
          <Route path="/accounting/opening-stock/add" element={withPageTitle("Add Opening Stock", <OpeningStockFormPage />)} />
          <Route path="/accounting/staff" element={withPageTitle("Staff Access", <StaffAccessPage />)} />
          {productRoutes}
          {purchaseRoutes}
          {saleRoutes}
          <Route path="/settings/taxes">
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={withPageTitle("Taxes", <TaxListPage />)} />
            <Route path="add" element={withPageTitle("Add Tax", <TaxFormPage mode="create" />)} />
            <Route path=":id/edit" element={withPageTitle("Edit Tax", <TaxFormPage mode="edit" />)} />
          </Route>
          <Route path="/settings/finance-vendors">
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={withPageTitle("Finance Vendors", <FinanceVendorListPage />)} />
            <Route path="add" element={withPageTitle("Add Finance Vendor", <FinanceVendorFormPage mode="create" />)} />
            <Route path=":id/edit" element={withPageTitle("Edit Finance Vendor", <FinanceVendorFormPage mode="edit" />)} />
          </Route>
          <Route path={APP_ROUTES.settings.customerBill} element={withPageTitle("Customer Bill Settings", <CustomerBillSettingsPage />)} />
          <Route path={APP_ROUTES.settings.auditLogs} element={withPageTitle("Audit Logs", <AuditLogsPage />)} />
          <Route path={APP_ROUTES.settings.tenantApprovals} element={withPageTitle("Tenant Approvals", <TenantApprovalsPage />)} />
          <Route element={<AdminRoute />}>
            <Route path={APP_ROUTES.settings.databaseTables} element={withPageTitle("Database Tables", <TableManagementDashboardPage />)} />
            <Route path={APP_ROUTES.admin.databaseTables} element={withPageTitle("Database Tables", <TableManagementDashboardPage />)} />
          </Route>

          {/* Product Owner Console Routes */}
          <Route path="/admin" element={<Navigate to={APP_ROUTES.admin.dashboard} replace />} />
          <Route path={APP_ROUTES.admin.dashboard} element={withPageTitle("Platform Dashboard", <ProductOwnerDashboardPage />)} />
          <Route path={APP_ROUTES.admin.tenants} element={withPageTitle("Tenant Directory", <TenantDirectoryPage />)} />
          <Route path={APP_ROUTES.admin.pendingApprovals} element={withPageTitle("Tenant Approvals", <TenantApprovalsPage />)} />
          <Route path={APP_ROUTES.admin.databaseMigrations} element={withPageTitle("Database Migrations", <DatabaseMigrationsPage />)} />
          <Route path={APP_ROUTES.admin.systemSettings} element={withPageTitle("System Settings", <SystemSettingsPage />)} />
          <Route path={APP_ROUTES.admin.featureFlags} element={withPageTitle("Feature Flags", <FeatureFlagsAdminPage />)} />
          <Route path={APP_ROUTES.admin.mastersImport} element={withPageTitle("Import Masters", <MasterImportPage isAdminMode={true} />)} />
          <Route path={APP_ROUTES.admin.emailTemplates} element={withPageTitle("Email Templates", <EmailTemplatesPage />)} />

        </Route>
      </Route>
      <Route path="/not-found" element={withPageTitle("Page Not Found", <NotFoundPage />)} />
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  );
}
