import { SkuInventoryPanel } from "./SkuInventoryPanel";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { apiClient, type PagedData } from "../../services/apiClient";
import { useNotifications } from "../../context/NotificationContext";

type Movement = { movementDate: string; movementType: string; productId: string; serialNumber: string; reference: string | null; quantity: number; inventoryValueChange: number; note: string | null };
type Product = { id: string; serialNumber: string; isActive: boolean; isSold: boolean };
const field = "min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";
const money = (value: number) => value.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

export function StockMovementsPage() {
  const notifications = useNotifications();
  const [movements, setMovements] = useState<PagedData<Movement> | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const query = new URLSearchParams({ page: String(page), pageSize: "30" });
    if (search.trim()) query.set("search", search.trim());
    setMovements(await apiClient.get<PagedData<Movement>>(`/inventory/movements?${query}`));
  }, [page, search]);
  useEffect(() => { void load().catch(() => notifications.error("Unable to load stock movements", "Refresh the page and try again.")); }, [load, notifications]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ page: "1", pageSize: "20", search: productSearch });
      void apiClient.get<PagedData<Product>>(`/products?${query}`).then(result => { if (active) setProducts(result.items.filter(product => product.isActive && !product.isSold)); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [productSearch]);
  const writeOff = async () => {
    if (!selectedProductId || !reason.trim()) return;
    setBusy(true);
    try {
      await apiClient.post("/inventory/adjustments/write-off", { productId: selectedProductId, adjustmentDate: date, reason });
      notifications.success("Inventory written off", "Stock value and the inventory ledger have been updated.");
      setReason(""); setSelectedProductId(""); setProductSearch(""); await load();
    } catch (cause) { notifications.error("Write-off failed", cause instanceof Error ? cause.message : "Check the product and date."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4">
    <header><h1 className="text-xl font-semibold">Stock Movements</h1><p className="mt-0.5 text-xs text-slate-500">Serialized stock uses specific identification: each sale relieves the exact unit’s purchase cost.</p></header>
    <SkuInventoryPanel onChanged={() => void load()} />
    <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"><h2 className="text-sm font-semibold">Write off unsold inventory</h2><p className="text-xs text-slate-600 dark:text-slate-300">This removes the unit from available stock and posts its carrying cost to operating expenses.</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]"><input className={field} placeholder="Search serial number" value={productSearch} onChange={event => setProductSearch(event.target.value)} /><select className={field} value={selectedProductId} onChange={event => setSelectedProductId(event.target.value)}><option value="">Select product</option>{products.map(product => <option key={product.id} value={product.id}>{product.serialNumber}</option>)}</select><input className={field} type="date" value={date} onChange={event => setDate(event.target.value)} /><input className={field} maxLength={300} placeholder="Reason" value={reason} onChange={event => setReason(event.target.value)} /><Button disabled={busy || !selectedProductId || !reason.trim()} isLoading={busy} onClick={() => void writeOff()}>Write off</Button></div></section>
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Movement ledger</h2><div className="flex gap-2"><input className={field} placeholder="Serial, bill, or reason" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /><Button variant="secondary" onClick={() => void load()}><RefreshCw size={14} /> Refresh</Button></div></div><div className="overflow-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="p-2">Date</th><th className="p-2">Movement</th><th className="p-2">Serial</th><th className="p-2">Reference / Reason</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Value change</th></tr></thead><tbody>{movements?.items.map((row, index) => <tr key={`${row.productId}-${row.movementType}-${row.movementDate}-${index}`} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2">{row.movementDate}</td><td className="p-2">{row.movementType}</td><td className="p-2 font-mono">{row.serialNumber}</td><td className="p-2">{row.reference ?? "—"}{row.note ? <div className="text-xs text-slate-500">{row.note}</div> : null}</td><td className="p-2 text-right">{row.quantity}</td><td className="p-2 text-right">{money(row.inventoryValueChange)}</td></tr>)}</tbody></table></div><footer className="flex justify-end gap-2 text-sm"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span className="self-center text-xs text-slate-500">{page} / {movements?.totalPages ?? 0}</span><Button variant="secondary" disabled={page >= (movements?.totalPages ?? 0)} onClick={() => setPage(value => value + 1)}>Next</Button></footer></section>
  </section>;
}
