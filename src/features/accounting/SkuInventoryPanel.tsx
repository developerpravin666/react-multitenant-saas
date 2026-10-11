import { useEffect, useState, type FormEvent } from "react";
import { apiClient, type PagedData } from "../../services/apiClient";
import { Button } from "../../components/ui/Button";

export type StockSku = {
  id: string;
  code: string;
  name: string;
  hsnSac: string;
  unitOfMeasure: string;
  quantity: number;
  inventoryValue: number;
  isActive?: boolean;
};

type Choice = { id: string; name: string; cgst?: number; sgst?: number };
type Purchase = { id: string; billNumber: string; description: string; quantity: number; date: string };

const baseField =
  "rounded-lg border bg-white px-2.5 py-1.5 text-sm dark:bg-slate-900 transition-colors";

export function SkuInventoryPanel({ onChanged }: { onChanged: () => void }) {
  const [skus, setSkus] = useState<StockSku[]>([]);
  const [vendors, setVendors] = useState<Choice[]>([]);
  const [taxes, setTaxes] = useState<Choice[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const getFieldClass = (key: string, extra = "") =>
    fieldErrors[key]
      ? `${baseField} border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white ${extra}`
      : `${baseField} border-slate-300 dark:border-slate-700 ${extra}`;

  async function refresh() {
    setSkus(await apiClient.get<StockSku[]>("/inventory/skus"));
    setPurchases(await apiClient.get<Purchase[]>("/inventory/skus/purchases"));
  }

  useEffect(() => {
    void refresh().catch((e) => setError(String(e)));
    void Promise.all([
      apiClient.get<PagedData<Choice>>("/vendors?pageSize=100"),
      apiClient.get<PagedData<Choice>>("/taxes?pageSize=100"),
    ])
      .then(([v, t]) => {
        setVendors(v.items);
        setTaxes(t.items);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const submit = (action: string) => async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const errs: Record<string, string> = {};

    if (action === "create") {
      const code = String(d.get("code") || "").trim();
      const name = String(d.get("name") || "").trim();
      const hsn = String(d.get("hsn") || "").trim();
      const unit = String(d.get("unit") || "").trim();

      if (!code) errs.create_code = "SKU code is required.";
      if (!name) errs.create_name = "Accessory name is required.";
      if (!hsn) {
        errs.create_hsn = "HSN is required.";
      } else if (!/^(\d{4}|\d{6}|\d{8})$/.test(hsn)) {
        errs.create_hsn = "HSN must be 4, 6, or 8 digits.";
      }
      if (!unit) errs.create_unit = "Unit is required.";
    } else if (action === "receive") {
      const sku = String(d.get("sku") || "").trim();
      const vendor = String(d.get("vendor") || "").trim();
      const bill = String(d.get("bill") || "").trim();
      const date = String(d.get("date") || "").trim();
      const qtyVal = Number(d.get("qty"));
      const costVal = Number(d.get("cost"));

      if (!sku) errs.receive_sku = "Choose an SKU.";
      if (!vendor) errs.receive_vendor = "Select a supplier.";
      if (!bill) errs.receive_bill = "Bill number is required.";
      if (!date) errs.receive_date = "Date is required.";
      if (!qtyVal || qtyVal <= 0) errs.receive_qty = "Quantity must be greater than 0.";
      if (isNaN(costVal) || costVal < 0) errs.receive_cost = "Valid unit cost is required.";
    } else if (action === "opening") {
      const sku = String(d.get("sku") || "").trim();
      const date = String(d.get("date") || "").trim();
      const qtyVal = Number(d.get("qty"));
      const costVal = Number(d.get("cost"));

      if (!sku) errs.opening_sku = "Choose an SKU.";
      if (!date) errs.opening_date = "Date is required.";
      if (!qtyVal || qtyVal <= 0) errs.opening_qty = "Quantity must be greater than 0.";
      if (isNaN(costVal) || costVal < 0) errs.opening_cost = "Valid unit cost is required.";
    } else if (action === "writeoff") {
      const sku = String(d.get("sku") || "").trim();
      const date = String(d.get("date") || "").trim();
      const qtyVal = Number(d.get("qty"));
      const reason = String(d.get("reason") || "").trim();

      if (!sku) errs.writeoff_sku = "Choose an SKU.";
      if (!date) errs.writeoff_date = "Date is required.";
      if (!qtyVal || qtyVal <= 0) errs.writeoff_qty = "Quantity must be greater than 0.";
      if (!reason) errs.writeoff_reason = "Reason is required.";
    } else if (action === "return") {
      const purchase = String(d.get("purchase") || "").trim();
      const date = String(d.get("date") || "").trim();
      const reason = String(d.get("reason") || "").trim();

      if (!purchase) errs.return_purchase = "Choose a purchase receipt.";
      if (!date) errs.return_date = "Date is required.";
      if (!reason) errs.return_reason = "Return reason is required.";
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errs }));
      return;
    }

    setBusy(true);
    setError("");
    try {
      if (action === "create")
        await apiClient.post("/inventory/skus", {
          code: String(d.get("code") || "").trim(),
          name: String(d.get("name") || "").trim(),
          hsnSac: String(d.get("hsn") || "").trim(),
          unitOfMeasure: String(d.get("unit") || "").trim(),
        });
      if (action === "opening")
        await apiClient.post("/inventory/skus/opening-stock", {
          skuId: d.get("sku"),
          date: d.get("date"),
          quantity: Number(d.get("qty")),
          unitCost: Number(d.get("cost")),
        });
      if (action === "receive")
        await apiClient.post("/inventory/skus/receipts", {
          skuId: d.get("sku"),
          vendorId: d.get("vendor"),
          billNumber: d.get("bill"),
          date: d.get("date"),
          quantity: Number(d.get("qty")),
          unitCost: Number(d.get("cost")),
          paymentTermsDays: Number(d.get("terms")),
          taxId: d.get("tax") || null,
          interState: d.get("interstate") === "on",
        });
      if (action === "writeoff")
        await apiClient.post("/inventory/skus/write-off", {
          skuId: d.get("sku"),
          date: d.get("date"),
          quantity: Number(d.get("qty")),
          reason: d.get("reason"),
        });
      if (action === "return")
        await apiClient.post("/accounting/corrections", {
          kind: "Purchase",
          sourceId: d.get("purchase"),
          noteDate: d.get("date"),
          reason: d.get("reason"),
          disposition: "Supplier",
        });
      await refresh();
      onChanged();
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const renderSkuSelect = (actionPrefix: string) => (
    <div className="flex flex-col">
      <select
        name="sku"
        aria-label="Stock SKU"
        onChange={() => clearFieldError(`${actionPrefix}_sku`)}
        aria-invalid={Boolean(fieldErrors[`${actionPrefix}_sku`])}
        className={getFieldClass(`${actionPrefix}_sku`)}
      >
        <option value="">Choose SKU *</option>
        {skus.map((s) => (
          <option key={s.id} value={s.id}>
            {s.code} · {s.name} · {s.quantity} {s.unitOfMeasure}
          </option>
        ))}
      </select>
      {fieldErrors[`${actionPrefix}_sku`] && (
        <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
          {fieldErrors[`${actionPrefix}_sku`]}
        </p>
      )}
    </div>
  );

  const renderDateField = (actionPrefix: string) => (
    <div className="flex flex-col">
      <input
        aria-label="Stock date"
        className={getFieldClass(`${actionPrefix}_date`)}
        name="date"
        type="date"
        defaultValue={new Date().toLocaleDateString("en-CA")}
        onChange={() => clearFieldError(`${actionPrefix}_date`)}
        aria-invalid={Boolean(fieldErrors[`${actionPrefix}_date`])}
      />
      {fieldErrors[`${actionPrefix}_date`] && (
        <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
          {fieldErrors[`${actionPrefix}_date`]}
        </p>
      )}
    </div>
  );

  const renderQtyField = (actionPrefix: string) => (
    <div className="flex flex-col">
      <input
        aria-label="Stock quantity"
        className={getFieldClass(`${actionPrefix}_qty`)}
        name="qty"
        type="number"
        min="0.0001"
        step="0.0001"
        placeholder="Quantity *"
        onChange={() => clearFieldError(`${actionPrefix}_qty`)}
        aria-invalid={Boolean(fieldErrors[`${actionPrefix}_qty`])}
      />
      {fieldErrors[`${actionPrefix}_qty`] && (
        <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
          {fieldErrors[`${actionPrefix}_qty`]}
        </p>
      )}
    </div>
  );

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold text-slate-900 dark:text-white">Accessory SKU inventory</h2>
      <p className="text-xs text-slate-500">
        Stock uses moving average cost. Enter purchases and movements chronologically. Pay supplier bills from Purchase
        accounting; record refunds from Returns & Corrections.
      </p>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      {/* 1. Create SKU */}
      <form onSubmit={submit("create")} noValidate className="flex flex-wrap items-start gap-2">
        <div className="flex flex-col">
          <input
            aria-label="SKU code"
            className={getFieldClass("create_code")}
            name="code"
            maxLength={40}
            placeholder="SKU code *"
            onChange={() => clearFieldError("create_code")}
            aria-invalid={Boolean(fieldErrors.create_code)}
          />
          {fieldErrors.create_code && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.create_code}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <input
            aria-label="SKU name"
            className={getFieldClass("create_name")}
            name="name"
            maxLength={200}
            placeholder="Accessory name *"
            onChange={() => clearFieldError("create_name")}
            aria-invalid={Boolean(fieldErrors.create_name)}
          />
          {fieldErrors.create_name && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.create_name}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <input
            aria-label="SKU HSN"
            className={getFieldClass("create_hsn")}
            name="hsn"
            placeholder="HSN (4/6/8 digits) *"
            onChange={() => clearFieldError("create_hsn")}
            aria-invalid={Boolean(fieldErrors.create_hsn)}
          />
          {fieldErrors.create_hsn && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.create_hsn}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <input
            aria-label="SKU unit"
            className={getFieldClass("create_unit")}
            name="unit"
            maxLength={10}
            defaultValue="NOS"
            onChange={() => clearFieldError("create_unit")}
            aria-invalid={Boolean(fieldErrors.create_unit)}
          />
          {fieldErrors.create_unit && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.create_unit}
            </p>
          )}
        </div>
        <Button type="submit" disabled={busy}>
          Create SKU
        </Button>
      </form>

      {/* 2. Receive stock */}
      <form onSubmit={submit("receive")} noValidate className="flex flex-wrap items-start gap-2">
        {renderSkuSelect("receive")}
        <div className="flex flex-col">
          <select
            aria-label="SKU supplier"
            name="vendor"
            className={getFieldClass("receive_vendor")}
            onChange={() => clearFieldError("receive_vendor")}
            aria-invalid={Boolean(fieldErrors.receive_vendor)}
          >
            <option value="">Supplier *</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {fieldErrors.receive_vendor && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.receive_vendor}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <input
            aria-label="Supplier bill"
            className={getFieldClass("receive_bill")}
            name="bill"
            maxLength={100}
            placeholder="Supplier bill *"
            onChange={() => clearFieldError("receive_bill")}
            aria-invalid={Boolean(fieldErrors.receive_bill)}
          />
          {fieldErrors.receive_bill && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.receive_bill}
            </p>
          )}
        </div>
        {renderDateField("receive")}
        {renderQtyField("receive")}
        <div className="flex flex-col">
          <input
            aria-label="SKU unit cost"
            className={getFieldClass("receive_cost")}
            name="cost"
            type="number"
            min="0"
            step="0.01"
            placeholder="Tax-excl unit cost *"
            onChange={() => clearFieldError("receive_cost")}
            aria-invalid={Boolean(fieldErrors.receive_cost)}
          />
          {fieldErrors.receive_cost && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.receive_cost}
            </p>
          )}
        </div>
        <input
          aria-label="Payment terms days"
          className={baseField}
          name="terms"
          type="number"
          min="0"
          max="3650"
          defaultValue="0"
        />
        <select aria-label="Purchase GST rate" name="tax" className={baseField}>
          <option value="">No GST</option>
          {taxes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.cgst}% + {t.sgst}%
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 self-center text-xs text-slate-700 dark:text-slate-300">
          <input name="interstate" type="checkbox" className="rounded" /> Interstate purchase (IGST)
        </label>
        <Button type="submit" disabled={busy}>
          Receive stock
        </Button>
      </form>

      {/* 3. Stage opening stock */}
      <form onSubmit={submit("opening")} noValidate className="flex flex-wrap items-start gap-2">
        {renderSkuSelect("opening")}
        {renderDateField("opening")}
        {renderQtyField("opening")}
        <div className="flex flex-col">
          <input
            aria-label="Opening SKU unit cost"
            name="cost"
            className={getFieldClass("opening_cost")}
            type="number"
            min="0"
            step="0.01"
            placeholder="Opening unit cost *"
            onChange={() => clearFieldError("opening_cost")}
            aria-invalid={Boolean(fieldErrors.opening_cost)}
          />
          {fieldErrors.opening_cost && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.opening_cost}
            </p>
          )}
        </div>
        <Button type="submit" disabled={busy}>
          Stage opening SKU stock
        </Button>
        <p className="w-full text-xs text-slate-500">
          Use only before cutover for a new SKU. Include this carrying value in account 1200 when importing Opening
          Balances. Staged stock is unavailable until the import commits.
        </p>
      </form>

      {/* 4. Write off */}
      <form onSubmit={submit("writeoff")} noValidate className="flex flex-wrap items-start gap-2">
        {renderSkuSelect("writeoff")}
        {renderDateField("writeoff")}
        {renderQtyField("writeoff")}
        <div className="flex flex-col">
          <input
            aria-label="SKU write-off reason"
            className={getFieldClass("writeoff_reason")}
            name="reason"
            maxLength={300}
            placeholder="Write-off reason *"
            onChange={() => clearFieldError("writeoff_reason")}
            aria-invalid={Boolean(fieldErrors.writeoff_reason)}
          />
          {fieldErrors.writeoff_reason && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.writeoff_reason}
            </p>
          )}
        </div>
        <Button type="submit" disabled={busy}>
          Write off quantity
        </Button>
      </form>

      {/* 5. Return to supplier */}
      <form onSubmit={submit("return")} noValidate className="flex flex-wrap items-start gap-2">
        <div className="flex flex-col">
          <select
            aria-label="Accessory supplier return"
            name="purchase"
            className={getFieldClass("return_purchase")}
            onChange={() => clearFieldError("return_purchase")}
            aria-invalid={Boolean(fieldErrors.return_purchase)}
          >
            <option value="">Choose whole purchase receipt to return *</option>
            {purchases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.billNumber} · {p.description} · {p.quantity}
              </option>
            ))}
          </select>
          {fieldErrors.return_purchase && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.return_purchase}
            </p>
          )}
        </div>
        {renderDateField("return")}
        <div className="flex flex-col">
          <input
            aria-label="Supplier return reason"
            className={getFieldClass("return_reason")}
            name="reason"
            maxLength={300}
            placeholder="Return reason *"
            onChange={() => clearFieldError("return_reason")}
            aria-invalid={Boolean(fieldErrors.return_reason)}
          />
          {fieldErrors.return_reason && (
            <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {fieldErrors.return_reason}
            </p>
          )}
        </div>
        <Button type="submit" disabled={busy}>
          Return receipt to supplier
        </Button>
      </form>

      {/* SKU Table */}
      <div className="overflow-auto pt-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-semibold text-slate-500">
              <th className="py-2">SKU</th>
              <th>Name</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th className="text-right">Inventory value</th>
            </tr>
          </thead>
          <tbody>
            {skus.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 font-mono text-xs">{s.code}</td>
                <td>
                  {s.name}
                  {s.isActive === false ? " (staged)" : ""}
                </td>
                <td>{s.quantity}</td>
                <td>{s.unitOfMeasure}</td>
                <td className="text-right font-medium">₹{s.inventoryValue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
