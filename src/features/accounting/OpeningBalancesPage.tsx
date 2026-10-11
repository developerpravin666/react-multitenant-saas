import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { Button } from "../../components/ui/Button";
import { useAccountingAccess } from "./AccountingAccess";
type Account = { id: string; code: string; name: string; type: number };
type Party = { id: string; name: string };
type Stock = { id: string; serialNumber: string; cost: number };
type Line = { accountId: string; debit: number; credit: number };
type PartyLine = { kind: string; partyId: string; reference: string; dueDate: string; amount: number };
type Item = { id: string; kind: string; partyName: string; reference: string; dueDate: string; amount: number; settled: number; balance: number; cutoverDate: string };
type Reconciliation = { asOf: string; receivableSubledger: number; receivableLedger: number; receivableDifference: number; payableSubledger: number; payableLedger: number; payableDifference: number; stockSubledger: number; stockLedger: number; stockDifference: number };
const input = "w-full rounded border bg-transparent p-2";
const today = () => new Date().toISOString().slice(0, 10);
const afterCutover = (date: string) => { const next = new Date(`${date.slice(0, 10)}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1); return next.toISOString().slice(0, 10); };
const money = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR" });
export function OpeningBalancesPage() {
  const { can } = useAccountingAccess(); const manage = can("accounting.manage");
  const [date, setDate] = useState(today); const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Party[]>([]); const [vendors, setVendors] = useState<Party[]>([]);
  const [stock, setStock] = useState<Stock[]>([]); const [items, setItems] = useState<Item[]>([]); const [report, setReport] = useState<Reconciliation | null>(null);
  const [lines, setLines] = useState<Line[]>([{ accountId: "", debit: 0, credit: 0 }]); const [parties, setParties] = useState<PartyLine[]>([]);
  const [settlement, setSettlement] = useState<Item | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [chart, c, v, s, o, r] = await Promise.all([apiClient.get<Account[]>("/general-ledger/accounts"), apiClient.get<Party[]>("/accounting/opening-customers"), apiClient.get<Party[]>("/vendors/all"), apiClient.get<Stock[]>(`/accounting/opening-stock?cutover=${date}`), apiClient.get<Item[]>("/accounting/opening-items"), apiClient.get<Reconciliation>(`/accounting/reconciliation?asOf=${date}`)]);
    setAccounts(chart.filter(a => a.type < 3)); setCustomers(c); setVendors(v); setStock(s); setItems(o); setReport(r);
  }, [date]);
  useEffect(() => { void load().catch(e => setError(e.message)); }, [load]);
  const run = async (work: () => Promise<unknown>) => { setBusy(true); setError(""); try { await work(); await load(); setSettlement(null); } catch (e) { setError(e instanceof Error ? e.message : "Action failed."); } finally { setBusy(false); } };
  const importBalances = (e: FormEvent) => {
    e.preventDefault();
    if (lines.some(l => !l.accountId || (l.debit === 0 && l.credit === 0))) {
      setError("Please select an account and specify debit or credit for each balance line.");
      return;
    }
    if (parties.some(p => !p.partyId || !p.reference.trim() || p.amount <= 0)) {
      setError("Please select a party, invoice reference, and amount for each outstanding item.");
      return;
    }
    void run(() => apiClient.post("/general-ledger/opening-balances", { cutoverDate: date, lines, parties, stockProductIds: stock.map(s => s.id) }));
  };
  const settle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const amt = Number(f.get("amount"));
    if (!f.get("date") || isNaN(amt) || amt <= 0) {
      setError("Please provide a valid settlement date and positive amount.");
      return;
    }
    if (settlement) void run(() => apiClient.post(`/accounting/opening-items/${settlement.id}/settlements`, { paymentDate: f.get("date"), amount: amt, paymentMode: f.get("mode") }));
  };
  return <div className="space-y-5"><h1 className="text-2xl font-semibold">Opening balances & reconciliation</h1>
    {error && <p role="alert" className="text-red-700">{error}</p>}<label>Cutover / report date<input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} /></label>
    {report && <div className="overflow-auto"><table className="w-full text-left"><thead><tr><th>Control</th><th>Subledger</th><th>GL</th><th>Difference</th></tr></thead><tbody>{[["Receivables", report.receivableSubledger, report.receivableLedger, report.receivableDifference], ["Payables", report.payableSubledger, report.payableLedger, report.payableDifference], ["Stock", report.stockSubledger, report.stockLedger, report.stockDifference]].map(([label, sub, gl, diff]) => <tr key={label} className="border-t"><td>{label}</td><td>{money(Number(sub))}</td><td>{money(Number(gl))}</td><td className={Number(diff) !== 0 ? "text-red-700" : ""}>{money(Number(diff))}</td></tr>)}</tbody></table></div>}
    {manage && <form onSubmit={importBalances} noValidate className="space-y-4 rounded border p-4"><h2 className="text-lg font-semibold">Import opening balances once</h2><p>Import before posting transactions at cutover. Customer balances must match 1100, vendor balances 2000, and all opening stock net costs 1200. Any remaining difference posts to retained earnings.</p>
      <Button type="button" disabled={busy} onClick={() => void run(() => apiClient.post("/general-ledger/accounts/initialize", {}))}>Initialize accounts</Button> <Link className="underline" to="/accounting/opening-stock/add">Import opening stock</Link>
      {lines.map((l, i) => <div key={i} className="grid gap-2 md:grid-cols-4"><select required aria-label={`Account ${i + 1}`} className={input} value={l.accountId} onChange={e => setLines(a => a.map((x, j) => i === j ? { ...x, accountId: e.target.value } : x))}><option value="">Select balance-sheet account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select>{(["debit", "credit"] as const).map(side => <label key={side}>{side}<input type="number" min="0" step="0.01" value={l[side]} className={input} onChange={e => setLines(a => a.map((x, j) => i === j ? { ...x, [side]: Number(e.target.value) } : x))} /></label>)}<Button type="button" variant="secondary" onClick={() => setLines(a => a.filter((_, j) => j !== i))}>Remove</Button></div>)}
      <Button type="button" variant="secondary" onClick={() => setLines(a => [...a, { accountId: "", debit: 0, credit: 0 }])}>Add account balance</Button>
      <h3 className="font-semibold">Customer / vendor outstanding items</h3>{parties.map((p, i) => <div key={i} className="grid gap-2 md:grid-cols-6"><select className={input} value={p.kind} onChange={e => setParties(a => a.map((x, j) => i === j ? { ...x, kind: e.target.value, partyId: "" } : x))}><option>Customer</option><option>Vendor</option></select><select required className={input} aria-label="Party" value={p.partyId} onChange={e => setParties(a => a.map((x, j) => i === j ? { ...x, partyId: e.target.value } : x))}><option value="">Select party</option>{(p.kind === "Customer" ? customers : vendors).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select><input required placeholder="Invoice reference" maxLength={100} className={input} value={p.reference} onChange={e => setParties(a => a.map((x, j) => i === j ? { ...x, reference: e.target.value } : x))} /><input required type="date" aria-label="Due date" className={input} value={p.dueDate} onChange={e => setParties(a => a.map((x, j) => i === j ? { ...x, dueDate: e.target.value } : x))} /><input required type="number" min="0.01" step="0.01" aria-label="Opening amount" className={input} value={p.amount} onChange={e => setParties(a => a.map((x, j) => i === j ? { ...x, amount: Number(e.target.value) } : x))} /><Button type="button" variant="secondary" onClick={() => setParties(a => a.filter((_, j) => j !== i))}>Remove</Button></div>)}
      <Button type="button" variant="secondary" onClick={() => setParties(a => [...a, { kind: "Customer", partyId: "", reference: "", dueDate: date, amount: 0 }])}>Add outstanding item</Button>
      <p>Opening stock: {stock.length} units · net cost {money(stock.reduce((s, x) => s + x.cost, 0))}</p><Button type="submit" disabled={busy || !lines.length}>Post reconciled opening balances</Button>
    </form>}
    <h2 className="text-lg font-semibold">Opening outstanding items</h2><table className="w-full text-left text-sm"><thead><tr><th>Party / reference</th><th>Due</th><th>Balance</th><th>Actions</th></tr></thead><tbody>{items.map(x => <tr key={x.id} className="border-t"><td className="py-3">{x.kind} · {x.partyName} · {x.reference}</td><td>{x.dueDate}</td><td>{money(x.balance)}</td><td>{manage && x.balance > 0 && <Button onClick={() => setSettlement(x)}>{x.kind === "Customer" ? "Receive payment" : "Pay vendor"}</Button>}</td></tr>)}</tbody></table>
    {settlement && <form onSubmit={settle} noValidate className="grid gap-3 rounded border p-4 md:grid-cols-3"><label>Date<input required name="date" type="date" min={afterCutover(settlement.cutoverDate)} defaultValue={today() > afterCutover(settlement.cutoverDate) ? today() : afterCutover(settlement.cutoverDate)} className={input} /></label><label>Amount<input required name="amount" type="number" min="0.01" max={settlement.balance} step="0.01" className={input} /></label><label>Method<select name="mode" className={input}><option>Cash</option><option>Bank</option></select></label><Button type="submit" disabled={busy}>Save settlement</Button><Button variant="secondary" onClick={() => setSettlement(null)}>Cancel</Button></form>}
  </div>;
}
