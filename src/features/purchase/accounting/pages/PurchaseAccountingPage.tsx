import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { History as HistoryIcon } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import type { GridColumn } from "../../../../types/grid";
import { DynamicGrid } from "../../../dynamic-grid/DynamicGrid";
import { createResourceApi } from "../../../shared/resourceApi";
import type { PurchaseBill } from "../types/purchaseAccounting.types";
import { APP_ROUTES } from "../../../../config/routes";

const billsApi = createResourceApi<PurchaseBill>("/purchases/bills");
const currency = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const paymentRoute = (bill: PurchaseBill) => `${APP_ROUTES.purchase.accountingPayment}?vendorId=${encodeURIComponent(bill.vendorId)}&billNumber=${encodeURIComponent(bill.billNumber)}`;

const columns: GridColumn<PurchaseBill>[] = [
  { id: "vendorName", header: "Vendor", accessor: "vendorName", searchable: true, sortable: true },
  { id: "billNumber", header: "Bill Number", accessor: "billNumber", searchable: true, sortable: true },
  { id: "billDate", header: "Bill Date", accessor: "billDate", sortable: true },
  { id: "dueDate", header: "Due Date", accessor: "dueDate", sortable: true },
  { id: "totalAmount", header: "Bill Total", accessor: "totalAmount", align: "right", isAmount: true, cell: (_, row) => currency(row.totalAmount) },
  { id: "amountPaid", header: "Paid", accessor: "amountPaid", align: "right", isAmount: true, cell: (_, row) => currency(row.amountPaid) },
  { id: "balance", header: "Balance Due", accessor: "balance", align: "right", isAmount: true, cell: (_, row) => currency(row.balance) },
  {
    id: "paymentStatus", header: "Status", accessor: "paymentStatus", sortable: true,
    cell: (_, row) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-700" : row.paymentStatus === "Partially paid" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{row.paymentStatus}</span>,
  },
  {
    id: "payments", header: "Payments", accessor: "paymentStatus", sortable: false,
    cell: (_, row) => <Link className="font-medium text-[var(--tenant-primary)] hover:underline" to={paymentRoute(row)}>View / Record</Link>,
  },
];

export function PurchaseAccountingPage() {
  const navigate = useNavigate();
  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-2xl font-semibold tracking-tight">Purchase Accounting</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track vendor bills, payments made, and outstanding payables.</p></div>
        <Button variant="secondary" onClick={() => navigate(`${APP_ROUTES.settings.auditLogs}?tableName=purchase_payments`)}><HistoryIcon size={16} /> Payment Audit</Button>
      </header>
      <DynamicGrid
        title="Vendor Bills"
        description="Bill totals include product taxes less line discounts. Record payments in one or more installments."
        columns={columns}
        mode="server"
        serverSource={billsApi.serverSource}
        getRowId={(bill) => bill.id}
        selectable={false}
        emptyMessage="No vendor bills found. Add a bill number while receiving products."
      />
    </section>
  );
}
