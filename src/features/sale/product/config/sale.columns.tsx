import { useState } from "react";
import type { GridColumn } from "../../../../types/grid";
import { Link } from "react-router-dom";
import { APP_ROUTES } from "../../../../config/routes";
import type { SaleRecord } from "../types/sale.types";
import { FinanceEmiModal } from "../components/FinanceEmiModal";
import { Calendar, CreditCard } from "lucide-react";

const currency = (value?: number | null) =>
  `₹${(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function PlanDetailsCell({ row }: { row: SaleRecord }) {
  const [showEmiModal, setShowEmiModal] = useState(false);

  const isFinance = row.paymentMode === "Finance";
  const hasEmis = Boolean(row.numberOfEmi && row.numberOfEmi > 0);

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-2">
        <Link
          to={APP_ROUTES.sale.products.payment(row.id)}
          className="font-semibold text-[var(--tenant-primary)] hover:underline"
        >
          {row.paymentMode ? "Manage Payments" : "Record Payment"}
        </Link>

        {isFinance && hasEmis && (
          <button
            type="button"
            onClick={() => setShowEmiModal(true)}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 cursor-pointer"
            title="View EMI list of details, due dates and customer reminder"
          >
            <Calendar className="size-2.5" />
            <span>EMI List & Reminders</span>
          </button>
        )}
      </div>

      {isFinance && (
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {row.financeVendorName || "Finance"} · {row.numberOfEmi || 0} EMIs × {currency(row.emiAmount)}
          {row.firstInstallmentDate && (
            <span className="block text-[10px] text-indigo-600 dark:text-indigo-400">
              1st Due: {new Date(row.firstInstallmentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
        </span>
      )}

      {showEmiModal && (
        <FinanceEmiModal sale={row} onClose={() => setShowEmiModal(false)} />
      )}
    </div>
  );
}

function BalanceAmountCell({ row }: { row: SaleRecord }) {
  const total = row.totalAmount ?? row.sellingPrice ?? 0;
  const paid = row.paidAmount ?? 0;
  const balance = row.balanceAmount !== undefined ? row.balanceAmount : Math.max(0, total - paid);

  const isPaid = balance <= 0.01;
  const isPartial = balance > 0.01 && paid > 0;

  return (
    <div className="flex flex-col items-end">
      <span
        className={`font-bold ${
          isPaid
            ? "text-emerald-600 dark:text-emerald-400"
            : isPartial
            ? "text-amber-600 dark:text-amber-400"
            : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {currency(balance)}
      </span>
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
          isPaid
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            : isPartial
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
            : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
        }`}
      >
        {isPaid ? "Paid in Full" : isPartial ? `Partially Paid (${currency(paid)})` : "Unpaid"}
      </span>
    </div>
  );
}

export const saleColumns: GridColumn<SaleRecord>[] = [
  {
    id: "productName",
    header: "Product",
    accessor: "productName",
    searchable: true,
    sortable: true,
    tooltip: (value) => String(value ?? "—"),
    cell: (value) => (
      <span className="block max-w-64 truncate">
        {String(value ?? "—")}
      </span>
    ),
  },
  {
    id: "serialNumber",
    header: "Serial Number",
    accessor: "serialNumber",
    searchable: true,
    hidden: true,
    cell: (value) => (
      <span className="block max-w-48 truncate">
        {String(value ?? "—")}
      </span>
    ),
  },
  {
    id: "billNumber",
    header: "Sales Bill",
    accessor: "billNumber",
    searchable: true,
    cell: (_, row) => (
      <Link className="font-medium text-[var(--tenant-primary)] hover:underline" to={APP_ROUTES.sale.accountingPayment(row.id)}>
        {row.billNumber}
      </Link>
    ),
  },
  { id: "customerName", header: "Customer", accessor: "customerName", searchable: true, sortable: true },
  { id: "customerMobile", header: "Mobile", accessor: "customerMobile", searchable: true },
  { id: "customerEmail", header: "Email", accessor: "customerEmail", hidden: true },
  { id: "saleDate", header: "Sale Date", accessor: "saleDate", sortable: true },
  {
    id: "totalAmount",
    header: "Selling Price",
    accessor: "sellingPrice",
    sortable: true,
    align: "right",
    isAmount: true,
    cell: (_, row) => currency(row.totalAmount ?? row.sellingPrice),
  },
  {
    id: "paidAmount",
    header: "Paid Amount",
    accessor: "paidAmount",
    align: "right",
    isAmount: true,
    cell: (_, row) => (
      <span className="font-semibold text-slate-700 dark:text-slate-300">
        {currency(row.paidAmount ?? 0)}
      </span>
    ),
  },
  {
    id: "balanceAmount",
    header: "Balance Amount",
    accessor: "balanceAmount",
    align: "right",
    sortable: true,
    isAmount: true,
    cell: (_, row) => <BalanceAmountCell row={row} />,
  },
  {
    id: "discount",
    header: "Discount",
    accessor: "discount",
    align: "right",
    isAmount: true,
    hidden: true,
    cell: (_, row) => currency(row.discount),
  },
  {
    id: "paymentMode",
    header: "Payment Plan",
    accessor: "paymentMode",
    cell: (value) => (
      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
        <CreditCard className="size-3 text-slate-400" />
        <span>{String(value ?? "Not recorded")}</span>
      </span>
    ),
  },
  {
    id: "paymentDetails",
    header: "Plan & EMI Details",
    accessor: "paymentMode",
    cell: (_, row) => <PlanDetailsCell row={row} />,
  },
];
