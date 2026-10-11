export interface DashboardMetricCards {
  monthlyRevenue: number;
  totalReceivables: number;
  totalPayables: number;
  netGstLiability: number;
  inventoryValuation: number;
  inStockUnits: number;
  unpaidInvoicesCount: number;
}

export interface DashboardRecentInvoice {
  id: string;
  billNumber: string;
  customerName: string;
  invoiceDate: string;
  totalAmount: number;
  balance: number;
  paymentStatus: string;
}

export interface DashboardLowStockAlert {
  brand: string;
  productModel: string;
  availableCount: number;
}

export interface DashboardSummary {
  metrics: DashboardMetricCards;
  recentInvoices: DashboardRecentInvoice[];
  lowStockAlerts: DashboardLowStockAlert[];
}

