import { Button } from "../../components/ui/Button";
export type CorrectionNote = { id: string; sourceId: string; kind: string; billNumber: string; noteNumber: string; noteDate: string; reason: string; disposition: string; totalAmount: number; refunded: number; refundAvailable: number; taxableAmount: number; cgstRate: number; sgstRate: number; cgstAmount: number; sgstAmount: number; igstAmount?: number };
export type CorrectionSnapshot = { partyName: string; partyMobile: string; partyAddress: string; productName: string; serialNumber: string; reconstructed: boolean };
export type NoteRefund = { id: string; paymentDate: string; amount: number; paymentMode: string; reference: string };
const money = (n:number) => n.toLocaleString("en-IN",{style:"currency",currency:"INR"});
export function CorrectionDocument({ note, snapshot, refunds, onClose }: { note: CorrectionNote; snapshot: CorrectionSnapshot; refunds: NoteRefund[]; onClose: () => void }) {
  return <dialog open aria-label="Credit or debit note" className="fixed inset-0 z-50 max-h-[90vh] w-full max-w-2xl overflow-auto rounded border bg-white p-6 shadow-xl dark:bg-slate-900">
    <style>{`@media print { body * {visibility:hidden} [data-correction-document], [data-correction-document] * {visibility:visible} [data-correction-document] {position:absolute;inset:0;width:100%;color:black;background:white} .correction-no-print {display:none} }`}</style>
    <div data-correction-document className="space-y-4"><h2 className="text-xl font-semibold">{note.kind==="Sale"?"Credit note":"Debit note"}</h2>
      <p>{note.noteNumber} · {note.noteDate}</p><p>Original {note.kind.toLowerCase()} invoice: {note.billNumber}</p>
      <address className="not-italic">{snapshot.partyName}<br/>{snapshot.partyAddress}<br/>{snapshot.partyMobile}</address>
      <p>{snapshot.productName}<br/>Serial: {snapshot.serialNumber}</p><p>Reason: {note.reason}<br/>Stock disposition: {note.disposition}</p>
      <table className="w-full text-left"><tbody><tr><th>Taxable credit</th><td>{money(note.taxableAmount)}</td></tr><tr><th>CGST reversal ({note.cgstRate}%)</th><td>{money(note.cgstAmount)}</td></tr><tr><th>SGST reversal ({note.sgstRate}%)</th><td>{money(note.sgstAmount)}</td></tr><tr><th>IGST reversal</th><td>{money(note.igstAmount ?? 0)}</td></tr><tr><th>Total credit</th><td>{money(note.totalAmount)}</td></tr></tbody></table>
      <h3 className="font-semibold">Refund history</h3>{refunds.length===0?<p>No refunds recorded.</p>:<table className="w-full text-left text-sm"><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>{refunds.map(r=><tr key={r.id}><td>{r.paymentDate}</td><td>{r.paymentMode}</td><td>{r.reference}</td><td>{money(r.amount)}</td></tr>)}</tbody></table>}
      {snapshot.reconstructed&&<p className="text-sm">Original invoice contact/product details were reconstructed from the records available at upgrade.</p>}
    </div><div className="correction-no-print mt-4 flex gap-2"><Button onClick={()=>window.print()}>Print / save PDF</Button><Button variant="secondary" onClick={onClose}>Close</Button></div>
  </dialog>;
}
