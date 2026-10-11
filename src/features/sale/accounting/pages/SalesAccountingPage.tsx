import { Link } from "react-router-dom";
import { Plus, History as HistoryIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../../components/ui/Button";
import type { GridColumn } from "../../../../types/grid";
import { APP_ROUTES } from "../../../../config/routes";
import { DynamicGrid } from "../../../dynamic-grid/DynamicGrid";
import { createResourceApi } from "../../../shared/resourceApi";
import type { SalesBill } from "../types/salesAccounting.types";

const salesBillsApi = createResourceApi<SalesBill>("/sales/accounting/bills");
const currency = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const columns: GridColumn<SalesBill>[] = [
  { id: "billNumber", header: "Bill Number", accessor: "billNumber", searchable: true, sortable: true },
  { id: "productName", header: "Product", accessor: "productName", searchable: true, sortable: true },
  { id: "customerName", header: "Customer", accessor: "customerName", searchable: true, sortable: true },
  { id: "customerMobile", header: "Mobile", accessor: "customerMobile", searchable: true },
  { id: "billDate", header: "Bill Date", accessor: "billDate", sortable: true },
  { id: "dueDate", header: "Due Date", accessor: "dueDate", sortable: true },
  { id: "totalAmount", header: "Bill Total", accessor: "totalAmount", align: "right", isAmount: true, cell: (_, bill) => currency(bill.totalAmount) },
  { id: "amountPaid", header: "Received", accessor: "amountPaid", align: "right", isAmount: true, cell: (_, bill) => currency(bill.amountPaid) },
  { id: "balance", header: "Balance Due", accessor: "balance", align: "right", isAmount: true, cell: (_, bill) => currency(bill.balance) },
  {
    id: "paymentStatus", header: "Status", accessor: "paymentStatus", sortable: true,
    cell: (_, bill) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${bill.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : bill.paymentStatus === "Partially paid" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{bill.paymentStatus}</span>,
  },
  {
    id: "payments", header: "Payments", accessor: "paymentStatus", sortable: false,
    cell: (_, bill) => <Link className="font-medium text-[var(--tenant-primary)] hover:underline" to={APP_ROUTES.sale.accountingPayment(bill.id)}>View / Record</Link>,
  },
];

export function SalesAccountingPage() {
  const navigate = useNavigate();
  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-semibold tracking-tight">Sales Bills & Payments</h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Track customer invoices, received payments, and outstanding balances.</p></div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate(APP_ROUTES.sale.invoices.new)}><Plus size={16} /> New Multi-Line Invoice</Button>
          <Button variant="secondary" onClick={() => navigate(`${APP_ROUTES.settings.auditLogs}?tableName=sales_receipts`)}><HistoryIcon size={16} /> Payment Audit</Button>
        </div>
      </header>
      <DynamicGrid
        title="Sales Bills"
        description="Each completed product sale creates a bill. Record payments in one or more installments."
        columns={columns}
        mode="server"
        serverSource={salesBillsApi.serverSource}
        getRowId={(bill) => bill.id}
        selectable={false}
        emptyMessage="No sales bills found. Record a product sale to create a bill."
      />
    </section>
  );
}
