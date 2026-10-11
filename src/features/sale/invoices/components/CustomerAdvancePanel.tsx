import { useEffect, useState } from "react";
import { apiClient } from "../../../../services/apiClient";
import { Button } from "../../../../components/ui/Button";
import type { UnpaidCustomerInvoice } from "../types/salesInvoice.types";

type Advance = { id: string; paymentDate: string; remainingAmount: number; referenceNumber?: string };
export function CustomerAdvancePanel({ customerId, invoices, onChanged }: { customerId: string; invoices: UnpaidCustomerInvoice[]; onChanged: () => void }) {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [selected, setSelected] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [mode, setMode] = useState("Cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setSelected(""); setAmount(0); setInvoiceId(""); setError("");
    apiClient.get<Advance[]>(`/sales/invoices/advances/${customerId}`)
      .then(rows => { if (active) setAdvances(rows); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not load advances."); });
    return () => { active = false; };
  }, [customerId, revision]);
  const act = async (refund: boolean) => {
    const advance = advances.find(a => a.id === selected);
    if (!advance || amount <= 0 || amount > advance.remainingAmount || !date || (!refund && !invoiceId)) {
      setError("Choose an advance, a valid amount and date, and an invoice when applying credit."); return;
    }
    setBusy(true); setError("");
    try {
      await apiClient.post(`/sales/invoices/advances/${refund ? "refund" : "apply"}`, refund
        ? { advanceId: selected, amount, paymentDate: date, paymentMode: mode, referenceNumber: reference || null }
        : { advanceId: selected, invoiceId, amount, applicationDate: date });
      setRevision(r => r + 1); onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Advance action failed."); }
    finally { setBusy(false); }
  };
  if (!advances.length && !error) return null;
  const field = "rounded border bg-transparent p-2 text-xs";
  return <section className="my-4 space-y-3 rounded border p-3">
    <h3 className="font-semibold">Existing customer advances</h3>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="grid gap-2 sm:grid-cols-2">
      <select aria-label="Customer advance" className={field} value={selected} onChange={e => { setSelected(e.target.value); setAmount(advances.find(a => a.id === e.target.value)?.remainingAmount ?? 0); }}>
        <option value="">Choose an advance</option>{advances.map(a => <option key={a.id} value={a.id}>{a.paymentDate} · ₹{a.remainingAmount.toFixed(2)} · {a.referenceNumber}</option>)}
      </select>
      <select aria-label="Invoice for advance" className={field} value={invoiceId} onChange={e => setInvoiceId(e.target.value)}>
        <option value="">Choose invoice to apply credit</option>{invoices.map(i => <option key={i.invoiceId} value={i.invoiceId}>{i.billNumber} · ₹{i.balance.toFixed(2)}</option>)}
      </select>
      <input aria-label="Advance amount" className={field} type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} />
      <input aria-label="Advance action date" className={field} type="date" value={date} onChange={e => setDate(e.target.value)} />
      <select aria-label="Advance refund method" className={field} value={mode} onChange={e => setMode(e.target.value)}><option>Cash</option><option>Bank</option></select>
      <input aria-label="Advance refund reference" className={field} maxLength={100} placeholder="Refund reference" value={reference} onChange={e => setReference(e.target.value)} />
    </div>
    <div className="flex gap-2"><Button type="button" disabled={busy || !selected || !invoiceId} onClick={() => void act(false)}>Apply advance</Button><Button type="button" variant="secondary" disabled={busy || !selected} onClick={() => void act(true)}>Refund advance</Button></div>
  </section>;
}
