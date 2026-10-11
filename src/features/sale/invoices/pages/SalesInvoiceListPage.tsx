import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Printer, CreditCard, Zap } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import type { GridColumn } from "../../../../types/grid";
import { APP_ROUTES } from "../../../../config/routes";
import { DynamicGrid } from "../../../dynamic-grid/DynamicGrid";
import { createResourceApi } from "../../../shared/resourceApi";
import { apiClient } from "../../../../services/apiClient";
import { useNotifications } from "../../../../context/NotificationContext";
import type { SalesInvoiceSummary } from "../types/salesInvoice.types";
import { MultiInvoicePaymentModal } from "../components/MultiInvoicePaymentModal";

const invoicesApi = createResourceApi<SalesInvoiceSummary>("/sales/invoices");
const currency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SalesInvoiceListPage() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [paymentModal, setPaymentModal] = useState<SalesInvoiceSummary | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>("Cash");
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payRef, setPayRef] = useState<string>("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [showMultiPayModal, setShowMultiPayModal] = useState(false);
  const [gridKey, setGridKey] = useState(0);

  const openPaymentModal = (invoice: SalesInvoiceSummary) => {
    setPaymentModal(invoice);
    setPayAmount(invoice.balance);
    setPayMode("Cash");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayRef("");
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;
    if (payAmount <= 0 || payAmount > paymentModal.balance) {
      notifications.error("Invalid Amount", `Payment must be between ₹1 and ₹${paymentModal.balance}`);
      return;
    }

    setPaySubmitting(true);
    try {
      await apiClient.post(`/sales/invoices/${paymentModal.id}/payments`, {
        amount: payAmount,
        paymentMode: payMode,
        paymentDate: payDate,
        referenceNumber: payRef || undefined,
      });
      notifications.success("Payment Recorded", `Received ${currency(payAmount)} against ${paymentModal.billNumber}`);
      setPaymentModal(null);
      setGridKey((k) => k + 1);
    } catch (err) {
      notifications.error("Payment Failed", err instanceof Error ? err.message : "Unable to record payment.");
    } finally {
      setPaySubmitting(false);
    }
  };

  const columns: GridColumn<SalesInvoiceSummary>[] = [
    {
      id: "billNumber",
      header: "Invoice #",
      accessor: "billNumber",
      searchable: true,
      sortable: true,
      cell: (_, row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{row.billNumber}</span>
      ),
    },
    {
      id: "invoiceDate",
      header: "Date",
      accessor: "invoiceDate",
      sortable: true,
    },
    {
      id: "customerName",
      header: "Customer",
      accessor: "customerName",
      searchable: true,
      sortable: true,
    },
    {
      id: "customerMobile",
      header: "Mobile",
      accessor: "customerMobile",
      searchable: true,
    },
    {
      id: "itemCount",
      header: "Items",
      accessor: "itemCount",
      align: "center",
      cell: (_, row) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {row.itemCount} items
        </span>
      ),
    },
    {
      id: "supplyType",
      header: "Supply Type",
      accessor: "supplyType",
      align: "center",
      cell: (_, row) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${row.supplyType === 1
              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
        >
          {row.supplyType === 1 ? "Inter (IGST)" : "Intra (CGST+SGST)"}
          {row.placeOfSupplyStateCode ? ` · ${row.placeOfSupplyStateCode}` : ""}
        </span>
      ),
    },
    {
      id: "totalAmount",
      header: "Total",
      accessor: "totalAmount",
      align: "right",
      isAmount: true,
      cell: (_, row) => <span className="font-medium">{currency(row.totalAmount)}</span>,
    },
    {
      id: "amountPaid",
      header: "Paid",
      accessor: "amountPaid",
      align: "right",
      isAmount: true,
      cell: (_, row) => <span className="text-emerald-600 dark:text-emerald-400">{currency(row.amountPaid)}</span>,
    },
    {
      id: "balance",
      header: "Balance",
      accessor: "balance",
      align: "right",
      isAmount: true,
      cell: (_, row) => (
        <span className={row.balance > 0 ? "font-semibold text-rose-600 dark:text-rose-400" : "text-slate-400"}>
          {currency(row.balance)}
        </span>
      ),
    },
    {
      id: "paymentStatus",
      header: "Status",
      accessor: "paymentStatus",
      sortable: true,
      cell: (_, row) => {
        const colors =
          row.paymentStatus === "Paid"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : row.paymentStatus === "Partially paid"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
              : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
        return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors}`}>{row.paymentStatus}</span>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      accessor: "id",
      sortable: false,
      cell: (_, row) => (
        <div className="flex items-center gap-2">
          {row.balance > 0 && (
            <button
              type="button"
              onClick={() => openPaymentModal(row)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              title="Record Payment"
            >
              <CreditCard size={14} /> Pay
            </button>
          )}
          <Link
            to={APP_ROUTES.sale.invoices.print(row.id)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--tenant-primary)] hover:underline"
            title="Print Tax Invoice"
          >
            <Printer size={14} /> Print
          </Link>
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Sales Invoices</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Create and track multi-line sales invoices with serialized and standard items.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowMultiPayModal(true)}>
            <Zap size={15} /> Smart Multi-Pay (FIFO)
          </Button>
          <Button onClick={() => navigate(APP_ROUTES.sale.invoices.new)}>
            <Plus size={16} /> New Multi-Line Invoice
          </Button>
        </div>
      </header>

      <DynamicGrid
        key={gridKey}
        title="Invoices Register"
        description="Multi-item invoices with live tax and ledger postings."
        columns={columns}
        mode="server"
        serverSource={invoicesApi.serverSource}
        getRowId={(row) => row.id}
        selectable={false}
        emptyMessage="No sales invoices found. Click 'New Multi-Line Invoice' to record a sale."
      />

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Record Payment — {paymentModal.billNumber}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Customer: {paymentModal.customerName} ({paymentModal.customerMobile}) · Outstanding:{" "}
              <strong className="text-rose-600">{currency(paymentModal.balance)}</strong>
            </p>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={paymentModal.balance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Mode</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Reference / Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cheque No."
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setPaymentModal(null)} disabled={paySubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={paySubmitting}>
                  {paySubmitting ? "Recording…" : "Save Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMultiPayModal && (
        <MultiInvoicePaymentModal
          onClose={() => setShowMultiPayModal(false)}
          onSuccess={() => {
            setShowMultiPayModal(false);
            setGridKey((k) => k + 1);
          }}
        />
      )}
    </section>
  );
}

