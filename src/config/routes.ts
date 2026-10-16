export const APP_ROUTES = {
  dashboard: "/",
  contraVoucher: "/accounting/contra",
  journalVoucher: "/accounting/journal",
  generalLedger: "/accounting/general-ledger",
  accountingAging: "/accounting/aging",
  taxReports: "/accounting/tax-reports",
  partyStatement: "/accounting/party-statement",
  accountingPeriods: "/accounting/periods",
  accountingControls: "/accounting/controls",
  bankReconciliation: "/accounting/bank-reconciliation",
  stockMovements: "/purchase/stock-movements",
  godowns: "/inventory/godowns",
  stockValuation: "/inventory/valuation",

  products: {
    root: "/products",

    vendors: {
      list: "/products/vendors/list",
      add: "/products/vendors/add",
      edit: (id: string) => `/products/vendors/${id}/edit`,
      statement: (id: string) => `/accounting/party-statement?partyType=Vendor&partyId=${id}`,
    },

    brands: {
      list: "/products/brands/list",
      add: "/products/brands/add",
      edit: (id: string) => `/products/brands/${id}/edit`,
    },

    types: {
      list: "/products/types/list",
      add: "/products/types/add",
      edit: (id: string) => `/products/types/${id}/edit`,
    },

    models: {
      list: "/products/models/list",
      add: "/products/models/add",
      edit: (id: string) => `/products/models/${id}/edit`,
    },

    variants: {
      list: "/products/variants/list",
      add: "/products/variants/add",
      edit: (id: string) => `/products/variants/${id}/edit`,
    },

    colors: {
      list: "/products/colors/list",
      add: "/products/colors/add",
      edit: (id: string) => `/products/colors/${id}/edit`,
    },
    importMasters: "/products/import-masters",
  },

  purchase: {
    stock: "/purchase/stock",
    accounting: "/purchase/accounting",
    accountingPayment: "/purchase/accounting/payments",
    scanBill: "/purchase/scan-bill",
    stockProducts: (brandId: string, modelId: string, variantId: string) =>
      `/purchase/stock/${brandId}/${modelId}/${variantId}`,
    products: {
      list: "/purchase/products/list",
      add: "/purchase/products/add",
      bulkUpdate: "/purchase/products/bulk-update",
      edit: (id: string) => `/purchase/products/${id}/edit`,
    },
  },

  sale: {
    invoices: {
      list: "/sales/invoices",
      new: "/sales/invoices/new",
      add: "/sales/invoices/new",
      print: (id: string) => `/sales/invoices/${id}/print`,
    },
    compliance: "/sales/compliance",
    accounting: "/sales/accounting",
    customers: {
      list: "/sales/customers/list",
      add: "/sales/customers/add",
      edit: (id: string) => `/sales/customers/${id}/edit`,
      history: (id: string) => `/sales/customers/${id}/history`,
      statement: (id: string) => `/accounting/party-statement?partyType=Customer&partyId=${id}`,
    },
    products: {
      list: "/sales/products/list",
      add: "/sales/products/add",
      edit: (id: string) => `/sales/products/${id}/edit`,
      payment: (id: string) => `/sales/products/${id}/payment`,
    },
    accountingPayment: (id: string) => `/sales/accounting/payments/${id}`,
    printCustomerBill: (id: string) => `/sales/accounting/print/${id}`,
  },

  settings: {
    customerBill: "/settings/customer-bill",
    auditLogs: "/settings/audit-logs",
    tax: {
      list: "/settings/taxes/list",
      add: "/settings/taxes/add",
      edit: (id: string) => `/settings/taxes/${id}/edit`,
    },
    financeVendors: {
      list: "/settings/finance-vendors/list",
      add: "/settings/finance-vendors/add",
      edit: (id: string) => `/settings/finance-vendors/${id}/edit`,
    },
    tenantApprovals: "/settings/tenant-approvals",
    databaseTables: "/settings/database-tables",
  },

  admin: {
    dashboard: "/admin/dashboard",
    tenants: "/admin/tenants",
    pendingApprovals: "/admin/tenants/pending",
    databaseMigrations: "/admin/database-migrations",
    databaseTables: "/admin/database-tables",
    systemSettings: "/admin/system-settings",
    featureFlags: "/admin/feature-flags",
    mastersImport: "/admin/masters-import",
    emailTemplates: "/admin/email-templates",
    login: "/admin/login",
  },
} as const;
