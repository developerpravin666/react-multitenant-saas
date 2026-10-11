import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { APP_ROUTES } from "../../../../config/routes";
import { apiClient } from "../../../../services/apiClient";
import { CustomerBillDocument } from "../components/CustomerBillDocument";
import type { CustomerBillTemplate, PrintableSalesBill } from "../types/customerBill.types";
import { defaultCustomerBillTemplate } from "../types/customerBill.types";
import type { SalesBillDetails } from "../types/salesAccounting.types";

export function CustomerBillPrintPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bill, setBill] = useState<PrintableSalesBill | null>(null);
  const [template, setTemplate] = useState<CustomerBillTemplate>(defaultCustomerBillTemplate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [details, settings, snapshot] = await Promise.all([
        apiClient.get<SalesBillDetails>(`/sales/accounting/bills/${encodeURIComponent(id)}`),
        apiClient.get<CustomerBillTemplate>("/settings/customer-bill"),
        apiClient.get<{ detailsJson: string }>(`/accounting/snapshots/Sale/${encodeURIComponent(id)}`),
      ]);
      const frozen = JSON.parse(snapshot.detailsJson);
      const seller = frozen.seller ?? frozen.Seller;
      const normalizedSeller = seller ? Object.fromEntries(Object.entries(seller).map(([key,value]) => [key.replace(/_([a-z])/g,(_,letter:string)=>letter.toUpperCase()).replace(/^./,letter=>letter.toLowerCase()),value])) : {};
      setTemplate({ ...settings, ...normalizedSeller });
      setBill({
        billNumber: details.bill.billNumber,
        billDate: details.bill.billDate,
        customerName: details.bill.customerName,
        customerMobile: details.bill.customerMobile,
        customerAddress: details.bill.customerAddress,
        customerEmail: details.bill.customerEmail,
        productName: details.bill.productName,
        serialNumber: details.bill.serialNumber,
        sellingPrice: details.bill.sellingPrice,
        discount: details.bill.discount,
        taxableAmount: details.bill.taxableAmount,
        cgstRate: details.bill.cgstRate,
        cgstAmount: details.bill.cgstAmount,
        sgstRate: details.bill.sgstRate,
        sgstAmount: details.bill.sgstAmount,
        totalAmount: details.bill.totalAmount,
        amountPaid: details.bill.amountPaid,
        balance: details.bill.balance,
        paymentStatus: details.bill.paymentStatus,
        payments: details.payments,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load this sales bill.");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <p className="text-sm text-slate-500">Loading printable bill…</p>;
  if (!bill) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error ?? "Sales bill not found."}</div>;

  const pageSize = template.paperSize === "Thermal80" ? "80mm auto" : `${template.paperSize} portrait`;
  return (
    <section className="space-y-3">
      <style>{`@page { size: ${pageSize}; margin: 0; }`}</style>
      <header className="no-print flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-semibold tracking-tight">Print customer bill</h1><p className="text-xs text-slate-500">Review the bill, then print or save it as PDF.</p></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => navigate(APP_ROUTES.sale.accountingPayment(id))}>Back to bill</Button><Button onClick={() => window.print()}><Printer size={16} /> Print bill</Button></div>
      </header>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950"><CustomerBillDocument template={template} bill={bill} /></div>
    </section>
  );
}
