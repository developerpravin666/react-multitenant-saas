import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiClient, type PagedData } from "../../services/apiClient";
import { Button } from "../../components/ui/Button";
import { useAccountingAccess } from "./AccountingAccess";
import { CorrectionDocument, type CorrectionNote, type CorrectionSnapshot, type NoteRefund } from "./CorrectionDocument";
import { formatDate } from "../../lib/date";

type Note = CorrectionNote;
type Source = {
  id: string;
  billNumber?: string;
  serialNumber?: string;
  productName?: string;
  customerName?: string;
  vendorName?: string;
  brandName?: string;
  productModelName?: string;
  variantName?: string;
  colorName?: string;
  totalAmount: number;
  paymentStatus?: string;
  isActive?: boolean;
  isSold?: boolean;
};
type SkuPurchase = { id: string; billNumber: string; description: string; quantity: number; date: string; totalAmount?: number };
const input = "w-full rounded border border-slate-300 bg-transparent p-2";
const money = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR" });
export function InvoiceCorrectionsPage() {
  const { can } = useAccountingAccess();
  const [notes, setNotes] = useState<Note[]>([]); const [sources, setSources] = useState<Source[]>([]);
  const [kind, setKind] = useState("Sale"); const [search, setSearch] = useState(""); const [source, setSource] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [refund, setRefund] = useState<Note | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [document, setDocument] = useState<{ note: Note; snapshot: CorrectionSnapshot; refunds: NoteRefund[] } | null>(null);
  const viewNote = async (note: Note) => {
    try {
      const [snapshot, refunds] = await Promise.all([
        apiClient.get<CorrectionSnapshot>(`/accounting/snapshots/${note.kind}/${note.sourceId}`)
          .catch(() => ({
            partyName: note.kind === "Sale" ? "Customer" : "Supplier",
            partyMobile: "",
            partyAddress: "",
            productName: note.billNumber,
            serialNumber: "",
            reconstructed: true
          })),
        apiClient.get<NoteRefund[]>(`/accounting/corrections/${note.id}/refunds`).catch(() => [])
      ]);
      setDocument({ note, snapshot, refunds });
    }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load the note."); }
  };
  const load = useCallback(async () => setNotes(await apiClient.get<Note[]>("/accounting/corrections")), []);
  useEffect(() => { void load().catch(e => setError(e.message)); }, [load]);
  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      const endpoint = kind === "Sale" ? "/sales/accounting/bills" : "/products";
      const query = new URLSearchParams({ page: "1", pageSize: "100", search });
      if (kind === "Sale") {
        void Promise.all([
          apiClient.get<PagedData<Source>>(`${endpoint}?${query}`).catch(() => ({ items: [] as Source[] })),
          apiClient.get<PagedData<Source>>(`/sales/invoices?${query}`).catch(() => ({ items: [] as Source[] }))
        ])
          .then(([legacy, invoices]) => {
            if (!cancelled) {
              const combined = [...invoices.items, ...legacy.items].filter(s => s.paymentStatus !== "Returned" && s.paymentStatus !== "Cancelled");
              setSources(combined);
              setSource("");
            }
          })
          .catch(e => { if (!cancelled) setError(e.message); });
      } else {
        void Promise.all([
          apiClient.get<PagedData<Source>>(`${endpoint}?${query}`).catch(() => ({ items: [] as Source[] })),
          apiClient.get<SkuPurchase[]>("/inventory/skus/purchases").catch(() => [] as SkuPurchase[])
        ])
          .then(([products, skus]) => {
            if (!cancelled) {
              const term = search.trim().toLowerCase();
              const filteredSkus: Source[] = skus
                .filter(sku => !term || (sku.billNumber?.toLowerCase().includes(term) || sku.description?.toLowerCase().includes(term)))
                .map(sku => ({
                  id: sku.id,
                  billNumber: sku.billNumber,
                  serialNumber: "Accessory / SKU",
                  productName: `${sku.description} (Qty: ${sku.quantity})`,
                  totalAmount: sku.totalAmount ?? 0,
                  isActive: true,
                  isSold: false
                }));
              const availableProducts = products.items.filter(s => s.isActive && !s.isSold);
              setSources([...availableProducts, ...filteredSkus]);
              setSource("");
            }
          })
          .catch(e => { if (!cancelled) setError(e.message); });
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [kind, search, refreshKey]);
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [noteReason, setNoteReason] = useState("");
  const [noteDisposition, setNoteDisposition] = useState("Restock");
  const [noteErrors, setNoteErrors] = useState<Record<string, string>>({});

  const [refundDate, setRefundDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMode, setRefundMode] = useState("Cash");
  const [refundReference, setRefundReference] = useState("");
  const [refundErrors, setRefundErrors] = useState<Record<string, string>>({});

  const clearNoteError = (key: string) => {
    if (noteErrors[key]) setNoteErrors(prev => { const c = { ...prev }; delete c[key]; return c; });
  };
  const clearRefundError = (key: string) => {
    if (refundErrors[key]) setRefundErrors(prev => { const c = { ...prev }; delete c[key]; return c; });
  };

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true); setError(""); try { await work(); await load(); setRefund(null); setSource(""); setNoteReason(""); setRefreshKey(k => k + 1); }
    catch (e) { setError(e instanceof Error ? e.message : "Action failed."); } finally { setBusy(false); }
  };
  const postNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!source) errors.source = "Please choose an invoice / purchase unit.";
    if (!noteDate) errors.date = "Note date is required.";
    if (!noteReason.trim()) errors.reason = "Reason for return or cancellation is required.";
    if (Object.keys(errors).length > 0) {
      setNoteErrors(errors);
      return;
    }
    setNoteErrors({});
    void run(() => apiClient.post("/accounting/corrections", {
      kind,
      sourceId: source,
      noteDate,
      reason: noteReason.trim(),
      disposition: kind === "Purchase" ? "Supplier" : noteDisposition
    }));
  };
  const postRefund = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!refund) return;
    const errors: Record<string, string> = {};
    if (!refundDate) errors.date = "Refund date is required.";
    const amt = Number(refundAmount);
    if (!refundAmount || isNaN(amt) || amt <= 0 || amt > refund.refundAvailable) {
      errors.amount = `Amount must be between ₹0.01 and ${money(refund.refundAvailable)}.`;
    }
    if (Object.keys(errors).length > 0) {
      setRefundErrors(errors);
      return;
    }
    setRefundErrors({});
    void run(() => apiClient.post(`/accounting/corrections/${refund.id}/refunds`, {
      paymentDate: refundDate,
      amount: amt,
      paymentMode: refundMode,
      reference: refundReference.trim() || undefined
    }));
  };
  return <div className="space-y-5"><h1 className="text-2xl font-semibold">Returns & corrections</h1>
    <p>Return or cancel an entire sales invoice or a full serialized purchase unit. The original invoice stays in history; a linked credit/debit note reverses its ledger and GST entries.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="grid gap-3 md:grid-cols-2"><label>Invoice type<select className={input} value={kind} onChange={e => { setKind(e.target.value); setSource(""); clearNoteError("source"); }}><option>Sale</option><option>Purchase</option></select></label><label>Find invoice or serial<input className={input} value={search} onChange={e => setSearch(e.target.value)} /></label></div>
    {can(kind === "Sale" ? "sales.manage" : "purchases.manage") && <form onSubmit={postNote} noValidate className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="text-xs font-medium">Invoice / purchase unit <span className="text-rose-500">*</span></label>
        <select
          className={`${input} mt-1 ${noteErrors.source ? "border-rose-500 bg-rose-50/20" : ""}`}
          aria-invalid={Boolean(noteErrors.source)}
          value={source}
          onChange={e => { setSource(e.target.value); clearNoteError("source"); }}
        >
          <option value="">Choose a unit</option>
          {sources.map(s => {
            const desc = s.customerName || s.productName || [s.brandName, s.productModelName, s.variantName, s.colorName].filter(Boolean).join(" ") || s.vendorName;
            const parts = [s.billNumber, s.serialNumber, desc, money(s.totalAmount)].filter(Boolean);
            return <option key={s.id} value={s.id}>{parts.join(" · ")}</option>;
          })}
        </select>
        {noteErrors.source && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{noteErrors.source}</p>}
      </div>

      <div>
        <label className="text-xs font-medium">Note date <span className="text-rose-500">*</span></label>
        <input
          type="date"
          className={`${input} mt-1 ${noteErrors.date ? "border-rose-500 bg-rose-50/20" : ""}`}
          aria-invalid={Boolean(noteErrors.date)}
          value={noteDate}
          onChange={e => { setNoteDate(e.target.value); clearNoteError("date"); }}
        />
        {noteErrors.date && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{noteErrors.date}</p>}
      </div>

      {kind === "Sale" && <div>
        <label className="text-xs font-medium">Returned stock</label>
        <select className={`${input} mt-1`} value={noteDisposition} onChange={e => setNoteDisposition(e.target.value)}>
          <option value="Restock">Restock for resale</option>
          <option value="WriteOff">Write off damaged stock</option>
        </select>
      </div>}

      <div className="md:col-span-2">
        <label className="text-xs font-medium">Reason <span className="text-rose-500">*</span></label>
        <textarea
          maxLength={400}
          className={`${input} mt-1 ${noteErrors.reason ? "border-rose-500 bg-rose-50/20" : ""}`}
          aria-invalid={Boolean(noteErrors.reason)}
          value={noteReason}
          onChange={e => { setNoteReason(e.target.value); clearNoteError("reason"); }}
          placeholder="Reason for returning this invoice or device..."
        />
        {noteErrors.reason && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{noteErrors.reason}</p>}
      </div>

      <div className="md:col-span-2">
        <Button type="submit" disabled={busy || !source}>Post {kind === "Sale" ? "credit" : "debit"} note</Button>
      </div>
    </form>}
    <div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>Note / invoice</th><th>Date</th><th>Reason / stock</th><th>Credit</th><th>Refunded</th><th>Actions</th></tr></thead><tbody>{notes.map(n => <tr key={n.id} className="border-t"><td className="py-3">{n.noteNumber}<div>{n.kind} · {n.billNumber}</div></td><td>{formatDate(n.noteDate)}</td><td>{n.reason}<div>{n.disposition}</div></td><td>{money(n.totalAmount)}</td><td>{money(n.refunded)}</td><td><Button variant="secondary" onClick={() => void viewNote(n)}>View note</Button>{can(n.kind === "Sale" ? "sales.manage" : "purchases.manage") && n.refundAvailable > 0 && <Button onClick={() => { setRefund(n); setRefundAmount(String(n.refundAvailable)); const today = new Date().toISOString().slice(0, 10); setRefundDate(today < n.noteDate ? n.noteDate : today); setRefundErrors({}); }}>Record refund</Button>}</td></tr>)}</tbody></table></div>
    {document && <CorrectionDocument {...document} onClose={() => setDocument(null)} />}
    {refund && <form onSubmit={postRefund} noValidate className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
      <h2 className="md:col-span-2 font-semibold">{refund.kind === "Sale" ? "Refund customer" : "Refund received from supplier"} · available {money(refund.refundAvailable)}</h2>
      <div>
        <label className="text-xs font-medium">Date <span className="text-rose-500">*</span></label>
        <input
          type="date"
          min={refund.noteDate}
          className={`${input} mt-1 ${refundErrors.date ? "border-rose-500 bg-rose-50/20" : ""}`}
          aria-invalid={Boolean(refundErrors.date)}
          value={refundDate}
          onChange={e => { setRefundDate(e.target.value); clearRefundError("date"); }}
        />
        {refundErrors.date && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{refundErrors.date}</p>}
      </div>

      <div>
        <label className="text-xs font-medium">Amount <span className="text-rose-500">*</span></label>
        <input
          type="number"
          step="0.01"
          className={`${input} mt-1 ${refundErrors.amount ? "border-rose-500 bg-rose-50/20" : ""}`}
          aria-invalid={Boolean(refundErrors.amount)}
          value={refundAmount}
          onChange={e => { setRefundAmount(e.target.value); clearRefundError("amount"); }}
        />
        {refundErrors.amount && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{refundErrors.amount}</p>}
      </div>

      <div>
        <label className="text-xs font-medium">Payment method</label>
        <select className={`${input} mt-1`} value={refundMode} onChange={e => setRefundMode(e.target.value)}>
          <option>Cash</option>
          <option>Bank</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium">Reference</label>
        <input className={`${input} mt-1`} maxLength={100} value={refundReference} onChange={e => setRefundReference(e.target.value)} placeholder="Transaction / UPI ref" />
      </div>

      <div className="md:col-span-2 flex gap-2">
        <Button type="submit" disabled={busy}>Save refund</Button>
        <Button variant="secondary" onClick={() => setRefund(null)}>Cancel</Button>
      </div>
    </form>}
  </div>;
}
