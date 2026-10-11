import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { APP_ROUTES } from "../../../../config/routes";
import { apiClient } from "../../../../services/apiClient";
import type { CustomerBillTemplate } from "../../accounting/types/customerBill.types";
import { defaultCustomerBillTemplate } from "../../accounting/types/customerBill.types";
import type { SalesInvoiceDetails } from "../types/salesInvoice.types";
import "../../accounting/components/customerBill.css";

const currency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SalesInvoicePrintPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<SalesInvoiceDetails | null>(null);
  const [template, setTemplate] = useState<CustomerBillTemplate>(defaultCustomerBillTemplate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [invoiceData, snapshot] = await Promise.all([
        apiClient.get<SalesInvoiceDetails>(`/sales/invoices/${encodeURIComponent(id)}`),
        apiClient.get<{ partyName: string; partyMobile: string; partyAddress: string; partyEmail?: string; detailsJson: string }>(`/accounting/snapshots/Sale/${encodeURIComponent(id)}`),
      ]);
      const frozen = JSON.parse(snapshot.detailsJson) as { seller?: CustomerBillTemplate | null };
      setDetails({ ...invoiceData, invoice: { ...invoiceData.invoice, customerName: snapshot.partyName,
        customerMobile: snapshot.partyMobile, customerAddress: snapshot.partyAddress, customerEmail: snapshot.partyEmail } });
      setTemplate({ ...defaultCustomerBillTemplate, ...frozen.seller });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load invoice details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="p-8 text-center text-sm text-slate-500">Loading invoice document…</p>;
  if (!details) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-red-600">{error ?? "Invoice not found."}</p>
        <Button variant="secondary" onClick={() => navigate(APP_ROUTES.sale.invoices.list)} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    );
  }

  const { invoice, lines, payments } = details;
  const pageSize = template.paperSize === "Thermal80" ? "80mm auto" : `${template.paperSize} portrait`;

  return (
    <section className="space-y-4">
      <style>{`@page { size: ${pageSize}; margin: 0; }`}</style>

      {/* Control bar */}
      <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate(APP_ROUTES.sale.invoices.list)}>
            <ArrowLeft size={16} /> All Invoices
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Tax Invoice — {invoice.billNumber}
            </h1>
            <p className="text-xs text-slate-500">Customer: {invoice.customerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()}>
            <Printer size={16} /> Print Tax Invoice
          </Button>
        </div>
      </header>

      {/* Printable Invoice Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950">
        <article id="customer-bill-print" className={`customer-bill-document paper-${template.paperSize}`}>
          {/* Header */}
          <header className="customer-bill-header">
            <div>
              <h1>{template.companyName || "Your Business Name"}</h1>
              {template.companyAddress ? <p>{template.companyAddress}</p> : null}
              {template.companyMobile ? <p>Phone: {template.companyMobile}</p> : null}
              {template.companyEmail ? <p>Email: {template.companyEmail}</p> : null}
              {template.taxRegistrationNumber ? <p>GSTIN: {template.taxRegistrationNumber}</p> : null}
              {template.stateName || template.stateCode ? (
                <p>State: {template.stateName || ""} {template.stateCode ? `(${template.stateCode})` : ""}</p>
              ) : null}
            </div>
            <div className="customer-bill-title">
              <h2>{template.billTitle || "TAX INVOICE"}</h2>
              <strong>{invoice.billNumber}</strong>
              <span>Date: {invoice.invoiceDate}</span>
              {invoice.dueDate !== invoice.invoiceDate ? <span>Due Date: {invoice.dueDate}</span> : null}
              <span className="mt-1 inline-block text-[11px] font-semibold text-slate-600">
                Supply: {invoice.supplyType === 1 ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
              </span>
            </div>
          </header>

          {/* Customer / Bill To */}
          <section className="customer-bill-customer">
            <h3>Bill To</h3>
            <strong>{invoice.customerName}</strong>
            <span>Phone: {invoice.customerMobile}</span>
            {invoice.customerAddress ? <span>Address: {invoice.customerAddress}</span> : null}
            {template.showCustomerEmail && invoice.customerEmail ? <span>Email: {invoice.customerEmail}</span> : null}
            {invoice.customerGstin ? <span>GSTIN: <strong>{invoice.customerGstin}</strong></span> : null}
            {invoice.placeOfSupplyStateName || invoice.placeOfSupplyStateCode ? (
              <span>Place of Supply: <strong>{invoice.placeOfSupplyStateName || invoice.placeOfSupplyStateCode} ({invoice.placeOfSupplyStateCode})</strong></span>
            ) : null}
          </section>

          {/* Multi-line items table */}
          <table className="customer-bill-items">
            <thead>
              <tr>
                <th style={{ width: "32px" }}>#</th>
                <th>Item Description</th>
                {template.showSerialNumber ? <th>Serial / IMEI</th> : null}
                <th>HSN/SAC</th><th className="number" style={{ width: "45px" }}>Qty / Unit</th>
                <th className="number">Rate</th>
                {template.showDiscount ? <th className="number">Disc</th> : null}
                <th className="number">{invoice.supplyType === 1 ? "IGST" : "GST"}</th>
                <th className="number">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.lineNumber}</td>
                  <td>
                    <strong>{l.itemDescription}</strong>
                  </td>
                  {template.showSerialNumber ? (
                    <td>
                      {l.serialNumber ? (
                        <span>
                          {l.serialNumber}
                          {l.serialNumber1 ? ` / ${l.serialNumber1}` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                  <td>{l.hsnSac || "—"}</td><td className="number">{l.quantity} {l.unitOfMeasure || "NOS"}</td>
                  <td className="number">{currency(l.unitPrice)}</td>
                  {template.showDiscount ? (
                    <td className="number">{l.discount > 0 ? currency(l.discount) : "—"}</td>
                  ) : null}
                  <td className="number">{invoice.supplyType === 1 ? `${l.igstRate || (l.cgstRate + l.sgstRate)}%` : `${l.cgstRate + l.sgstRate}%`}</td>
                  <td className="number">{currency(l.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary and payment details */}
          <div className="customer-bill-summary">
            <div className="customer-bill-payment-history">
              {template.showPaymentHistory ? (
                <>
                  <h3>Payment History</h3>
                  {payments.length > 0 ? (
                    payments.map((p) => (
                      <p key={p.id}>
                        {p.paymentDate} · {p.paymentMode}
                        {p.referenceNumber ? ` · ${p.referenceNumber}` : ""}
                        <strong>{currency(p.amount)}</strong>
                      </p>
                    ))
                  ) : (
                    <p className="text-slate-400">No payments recorded</p>
                  )}
                </>
              ) : null}
              {invoice.notes ? (
                <div style={{ marginTop: "12px", fontSize: "11px", color: "#64748b" }}>
                  <strong>Notes:</strong> {invoice.notes}
                </div>
              ) : null}
            </div>

            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{currency(invoice.subTotal)}</dd>
              </div>
              {template.showDiscount && invoice.discount > 0 ? (
                <div>
                  <dt>Total Discount</dt>
                  <dd>− {currency(invoice.discount)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Taxable Amount</dt>
                <dd>{currency(invoice.taxableAmount)}</dd>
              </div>
              {invoice.igstAmount > 0 ? (
                <div>
                  <dt>IGST</dt>
                  <dd>{currency(invoice.igstAmount)}</dd>
                </div>
              ) : null}
              {invoice.cgstAmount > 0 ? (
                <div>
                  <dt>CGST</dt>
                  <dd>{currency(invoice.cgstAmount)}</dd>
                </div>
              ) : null}
              {invoice.sgstAmount > 0 ? (
                <div>
                  <dt>SGST</dt>
                  <dd>{currency(invoice.sgstAmount)}</dd>
                </div>
              ) : null}
              <div className="customer-bill-grand-total">
                <dt>Invoice Total</dt>
                <dd>{currency(invoice.totalAmount)}</dd>
              </div>
              <div>
                <dt>Amount Received</dt>
                <dd>{currency(invoice.amountPaid)}</dd>
              </div>
              {template.showBalanceDue ? (
                <div>
                  <dt>Balance Due</dt>
                  <dd className={invoice.balance > 0 ? "font-bold text-rose-600" : ""}>
                    {currency(invoice.balance)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          {/* Footer */}
          <footer className="customer-bill-footer">
            <p>{template.footerNote || "Thank you for your business!"}</p>
            <span>Authorized Signatory</span>
          </footer>
        </article>
      </div>
    </section>
  );
}

