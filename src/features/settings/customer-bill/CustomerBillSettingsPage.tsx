import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Check, RotateCcw, Mic } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { apiClient } from "../../../services/apiClient";
import { useVoiceTyping } from "../../voice-typing/VoiceTypingContext";
import { CustomerBillDocument } from "../../sale/accounting/components/CustomerBillDocument";
import { defaultCustomerBillTemplate, type CustomerBillTemplate, type PrintableSalesBill } from "../../sale/accounting/types/customerBill.types";
import { INDIAN_GST_STATES } from "../../sale/invoices/types/salesInvoice.types";

const fieldClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const exampleBill: PrintableSalesBill = {
  billNumber: "SM-2026-000001",
  billDate: new Date().toISOString().slice(0, 10),
  customerName: "Sample Customer",
  customerMobile: "+91 98765 43210",
  customerAddress: "Customer address",
  customerEmail: "customer@example.com",
  productName: "Brand · Model · Variant · Color",
  serialNumber: "SN-123456789",
  sellingPrice: 24999,
  discount: 1000,
  taxableAmount: 23999,
  cgstRate: 9,
  cgstAmount: 2160,
  sgstRate: 9,
  sgstAmount: 2160,
  totalAmount: 28319,
  amountPaid: 10000,
  balance: 18319,
  paymentStatus: "Partially paid",
  payments: [{ id: "sample-payment", amount: 10000, paymentMode: "UPI", paymentDate: new Date().toISOString().slice(0, 10), referenceNumber: "UPI123456" }],
};

const visibilityOptions: [keyof CustomerBillTemplate, string][] = [
  ["showCustomerEmail", "Show customer email"],
  ["showSerialNumber", "Show product serial number"],
  ["showDiscount", "Show discount"],
  ["showPaymentHistory", "Show payment history"],
  ["showBalanceDue", "Show balance due"],
];

export function CustomerBillSettingsPage() {
  const { isVoiceFeatureEnabled, setVoiceFeatureEnabled } = useVoiceTyping();
  const [template, setTemplate] = useState<CustomerBillTemplate>(defaultCustomerBillTemplate);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const getFieldClass = (hasError: boolean) =>
    `mt-1 w-full rounded-lg border ${
      hasError
        ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-slate-100"
        : "border-slate-300 bg-white text-slate-900 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
    } px-3 py-2 text-sm outline-none transition`;

  const load = useCallback(async () => {
    try {
      setError(null);
      setTemplate(await apiClient.get<CustomerBillTemplate>("/settings/customer-bill"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load customer bill settings.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function update<K extends keyof CustomerBillTemplate>(key: K, value: CustomerBillTemplate[K]) {
    setTemplate((current) => ({ ...current, [key]: value }));
    clearFieldError(key as string);
    setSaved(false);
  }

  function onText(key: "companyName" | "companyAddress" | "companyMobile" | "companyEmail" | "taxRegistrationNumber" | "billTitle" | "footerNote") {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(key, event.target.value as CustomerBillTemplate[typeof key]);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!template.companyName?.trim()) {
      errors.companyName = "Business name is required.";
    }
    if (!template.companyAddress?.trim()) {
      errors.companyAddress = "Business address is required.";
    }
    if (!template.companyMobile?.trim()) {
      errors.companyMobile = "Business phone is required.";
    }
    if (template.companyEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(template.companyEmail.trim())) {
      errors.companyEmail = "Please enter a valid email address.";
    }
    if (template.taxRegistrationNumber?.trim()) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(template.taxRegistrationNumber.trim())) {
        errors.taxRegistrationNumber = "Invalid GSTIN format (e.g. 27AABCU9603R1ZM).";
      }
    }
    if (!template.billTitle?.trim()) {
      errors.billTitle = "Bill heading is required.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function save() {
    if (!validate()) {
      setError("Please correct the form fields highlighted in red below.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setTemplate(await apiClient.put<CustomerBillTemplate>("/settings/customer-bill", template));
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save customer bill settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading bill template…</p>;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div><h1 className="text-xl font-semibold tracking-tight">Customer Bill</h1><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Configure the sales bill layout, business details, and visible information.</p></div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setTemplate(defaultCustomerBillTemplate); setSaved(false); setFieldErrors({}); }}><RotateCcw size={15} /> Reset preview</Button>
          <Button onClick={() => void save()} disabled={saving}><Check size={15} /> {saving ? "Saving…" : saved ? "Saved" : "Save template"}</Button>
        </div>
      </header>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{error}</div> : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(320px,400px)_1fr]">
        <form noValidate className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div><h2 className="text-base font-semibold">Business and layout</h2><p className="mt-0.5 text-xs text-slate-500">These settings apply to printed sales bills for this tenant.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium">Business name <span className="text-rose-500">*</span></label>
              <input
                className={getFieldClass(Boolean(fieldErrors.companyName))}
                maxLength={200}
                aria-invalid={Boolean(fieldErrors.companyName)}
                value={template.companyName}
                onChange={onText("companyName")}
              />
              {fieldErrors.companyName && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {fieldErrors.companyName}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium">Business address <span className="text-rose-500">*</span></label>
              <textarea
                className={getFieldClass(Boolean(fieldErrors.companyAddress))}
                rows={2}
                maxLength={500}
                aria-invalid={Boolean(fieldErrors.companyAddress)}
                value={template.companyAddress}
                onChange={onText("companyAddress")}
              />
              {fieldErrors.companyAddress && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {fieldErrors.companyAddress}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium">Business phone <span className="text-rose-500">*</span></label>
              <input
                className={getFieldClass(Boolean(fieldErrors.companyMobile))}
                maxLength={20}
                aria-invalid={Boolean(fieldErrors.companyMobile)}
                value={template.companyMobile}
                onChange={onText("companyMobile")}
              />
              {fieldErrors.companyMobile && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {fieldErrors.companyMobile}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium">Email (Optional)</label>
              <input
                type="email"
                className={getFieldClass(Boolean(fieldErrors.companyEmail))}
                maxLength={256}
                aria-invalid={Boolean(fieldErrors.companyEmail)}
                value={template.companyEmail ?? ""}
                onChange={onText("companyEmail")}
              />
              {fieldErrors.companyEmail && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {fieldErrors.companyEmail}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium">GSTIN / Tax ID</label>
              <input
                className={getFieldClass(Boolean(fieldErrors.taxRegistrationNumber))}
                maxLength={50}
                aria-invalid={Boolean(fieldErrors.taxRegistrationNumber)}
                placeholder="e.g. 27AABCU9603R1ZM"
                value={template.taxRegistrationNumber ?? ""}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  update("taxRegistrationNumber", val);
                  if (val.length >= 2 && !template.stateCode) {
                    const matchedState = INDIAN_GST_STATES.find(s => s.code === val.slice(0, 2));
                    if (matchedState) {
                      update("stateCode", matchedState.code);
                      update("stateName", matchedState.name);
                    }
                  }
                }}
              />
              {fieldErrors.taxRegistrationNumber && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {fieldErrors.taxRegistrationNumber}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium">Home State (GST)</label>
              <select
                className={getFieldClass(false)}
                value={template.stateCode ?? ""}
                onChange={(e) => {
                  const code = e.target.value;
                  const found = INDIAN_GST_STATES.find(s => s.code === code);
                  update("stateCode", code || null);
                  update("stateName", found?.name ?? null);
                }}
              >
                <option value="">Select State / UT</option>
                {INDIAN_GST_STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium">Bill heading <span className="text-rose-500">*</span></label>
              <input
                className={getFieldClass(Boolean(fieldErrors.billTitle))}
                maxLength={80}
                aria-invalid={Boolean(fieldErrors.billTitle)}
                value={template.billTitle}
                onChange={onText("billTitle")}
              />
              {fieldErrors.billTitle && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {fieldErrors.billTitle}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium">Paper size</label>
              <select
                className={getFieldClass(false)}
                value={template.paperSize}
                onChange={(event) => update("paperSize", event.target.value as CustomerBillTemplate["paperSize"])}
              >
                <option value="A4">A4</option>
                <option value="A5">A5</option>
                <option value="Thermal80">80 mm thermal receipt</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium">Footer note</label>
              <textarea
                className={getFieldClass(false)}
                rows={2}
                maxLength={500}
                value={template.footerNote}
                onChange={onText("footerNote")}
              />
            </div>
          </div>
          <fieldset className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800"><legend className="px-1 text-xs font-semibold">Show on printed bill</legend>
            {visibilityOptions.map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(template[key])} onChange={(event) => update(key, event.target.checked as CustomerBillTemplate[typeof key])} className="size-4 accent-[var(--tenant-primary)]" />{label}</label>)}
          </fieldset>
        </form>

        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Live preview</h2><span className="text-xs text-slate-500">Sample data · {template.paperSize}</span></div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950"><CustomerBillDocument template={template} bill={exampleBill} /></div>
        </div>
      </div>

      {/* Voice Dictation Preference */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`grid size-9 place-items-center rounded-xl text-white ${isVoiceFeatureEnabled ? "bg-indigo-600" : "bg-slate-500"}`}>
              <Mic className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Voice Typing & Speech Dictation</h3>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${isVoiceFeatureEnabled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                  {isVoiceFeatureEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Allow billers and staff to fill in customer billing fields and product forms by voice (Alt + V).
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isVoiceFeatureEnabled}
            onClick={() => setVoiceFeatureEnabled(!isVoiceFeatureEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              isVoiceFeatureEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
            }`}
            title={isVoiceFeatureEnabled ? "Click to Disable Voice Typing" : "Click to Enable Voice Typing"}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isVoiceFeatureEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
