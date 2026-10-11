import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiClient } from "../../services/apiClient";
import { Button } from "../../components/ui/Button";
import { useNotifications } from "../../context/NotificationContext";

type Account = { id: string; code: string; name: string; type: number; normalBalance: number };
type Approval = { id: string; action: number; resourceId: string; summary: string; status: number; requestedBy?: string; decidedBy?: string; decisionNote?: string; createdAt: string };
type PermissionUser = { userId: string; userName: string; email: string; permissions: string[] };
type Dimension = { id: string; code: string; name: string; dimensionType: string };
type Asset = { id: string; assetNumber: string; name: string; acquisitionDate: string; acquisitionCost: number; salvageValue: number; usefulLifeMonths: number; accumulatedDepreciation: number; bookValue: number; assetAccountId: string; depreciationExpenseAccountId: string; accumulatedDepreciationAccountId: string; disposedDate?: string | null };
type Budget = { id: string; accountId: string; accountCode: string; accountName: string; dimensionId?: string | null; dimensionCode?: string | null; startDate: string; endDate: string; amount: number; actual: number; variance: number; notes?: string | null };
type Document = { id: string; resourceType: string; resourceId: string; fileName: string; contentType: string; storageReference: string; description?: string | null; createdAt: string };
const input = "min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";
const label = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300";
const card = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";
const money = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(value);
const actionNames = ["Journal", "Period close", "Stock write-off", "Financial correction"];
const statusNames = ["Pending", "Approved", "Rejected", "Applied"];
const permissionNames = ["catalog.manage", "purchases.manage", "sales.manage", "inventory.manage", "accounting.manage", "accounting.approve", "accounting.dimensions.manage", "accounting.documents.manage", "accounting.assets.manage", "accounting.budgets.manage"];

export function AccountingControlsPage() {
  const notifications = useNotifications();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [proceedsAccountId, setProceedsAccountId] = useState("");
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [permissionUsers, setPermissionUsers] = useState<PermissionUser[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [busy, setBusy] = useState(false);
  const [resourceType, setResourceType] = useState("Journal");
  const [resourceId, setResourceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearError = (key: string) => {
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const getFieldClass = (key: string, extra?: string) =>
    formErrors[key]
      ? `${input} border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white ${extra ?? ""}`
      : `${input} ${extra ?? ""}`;

  const renderError = (key: string) =>
    formErrors[key] ? (
      <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
        {formErrors[key]}
      </p>
    ) : null;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [chart, approvalRows, dimensionRows, assetRows, budgetRows] = await Promise.all([
        apiClient.get<Account[]>("/general-ledger/accounts"),
        apiClient.get<Approval[]>("/accounting-approvals"),
        apiClient.get<Dimension[]>("/accounting-dimensions"),
        apiClient.get<Asset[]>("/fixed-assets"),
        apiClient.get<Budget[]>("/account-budgets"),
      ]);
      setAccounts(chart); setProceedsAccountId(current => current || chart.find(a => a.code === "1010")?.id || chart.find(a => a.code === "1000")?.id || "");
      setApprovals(approvalRows); setDimensions(dimensionRows); setAssets(assetRows); setBudgets(budgetRows);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load accounting controls."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void apiClient.get<PermissionUser[]>("/accounting-permissions").then(setPermissionUsers).catch(() => setPermissionUsers([]));
  }, []);
  useEffect(() => {
    if (!resourceId.trim()) { setDocuments([]); return; }
    void apiClient.get<Document[]>(`/supporting-documents?${new URLSearchParams({ resourceType, resourceId })}`)
      .then(setDocuments).catch(() => setDocuments([]));
  }, [resourceType, resourceId]);

  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await work(); notifications.success(success, "Changes have been saved."); await load();
      await apiClient.get<PermissionUser[]>("/accounting-permissions").then(setPermissionUsers).catch(() => setPermissionUsers([]));
    }
    catch (cause) { notifications.error("Action not completed", cause instanceof Error ? cause.message : "Please check the details."); }
    finally { setBusy(false); }
  };
  const submit = (handler: (event: FormEvent<HTMLFormElement>) => void) => (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); handler(event); };
  const createDimension = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget);
    const errors: Record<string, string> = {};
    const code = String(form.get("code") || "").trim();
    const name = String(form.get("name") || "").trim();
    if (!code) errors.dim_code = "Code is required.";
    if (!name) errors.dim_name = "Name is required.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errors }));
      notifications.error("Incomplete details", "Please fill in dimension code and name.");
      return;
    }
    void run(() => apiClient.post("/accounting-dimensions", Object.fromEntries(form)), "Dimension created");
    event.currentTarget.reset();
  };
  const submitApproval = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget);
    const errors: Record<string, string> = {};
    const resourceIdVal = String(form.get("resourceId") || "").trim();
    const summaryVal = String(form.get("summary") || "").trim();
    const payloadRaw = String(form.get("payloadJson") || "").trim();
    if (!resourceIdVal) errors.approval_resourceId = "Resource ID is required.";
    if (!summaryVal) errors.approval_summary = "Summary is required.";
    if (!payloadRaw) {
      errors.approval_payloadJson = "Action payload JSON is required.";
    } else {
      try { JSON.parse(payloadRaw); }
      catch { errors.approval_payloadJson = "Enter a valid JSON payload."; }
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errors }));
      notifications.error("Validation error", "Please correct the highlighted fields.");
      return;
    }
    let payload: unknown;
    try { payload = JSON.parse(payloadRaw); }
    catch { return; }
    void run(() => apiClient.post("/accounting-approvals", { action: Number(form.get("action")), resourceId: resourceIdVal, summary: summaryVal, payload }), "Approval submitted");
    event.currentTarget.reset();
  };
  const addDocument = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget);
    const errors: Record<string, string> = {};
    const fileName = String(form.get("fileName") || "").trim();
    const contentType = String(form.get("contentType") || "").trim();
    const storageReference = String(form.get("storageReference") || "").trim();
    if (!fileName) errors.doc_fileName = "File name is required.";
    if (!contentType) errors.doc_contentType = "Content type is required.";
    if (!storageReference) errors.doc_storageReference = "Storage reference is required.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errors }));
      notifications.error("Validation error", "Please complete all required document fields.");
      return;
    }
    void run(() => apiClient.post("/supporting-documents", Object.fromEntries(form)), "Document linked");
    event.currentTarget.reset();
  };
  const createAsset = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget);
    const errors: Record<string, string> = {};
    const assetNumber = String(form.get("assetNumber") || "").trim();
    const name = String(form.get("name") || "").trim();
    const acquisitionDate = String(form.get("acquisitionDate") || "").trim();
    const cost = Number(form.get("cost"));
    const usefulLifeMonths = Number(form.get("usefulLifeMonths"));
    const assetAccountId = String(form.get("assetAccountId") || "").trim();
    const depreciationExpenseAccountId = String(form.get("depreciationExpenseAccountId") || "").trim();
    const accumulatedDepreciationAccountId = String(form.get("accumulatedDepreciationAccountId") || "").trim();
    const fundingAccountId = String(form.get("fundingAccountId") || "").trim();

    if (!assetNumber) errors.asset_number = "Asset number is required.";
    if (!name) errors.asset_name = "Name is required.";
    if (!acquisitionDate) errors.asset_date = "Acquisition date is required.";
    if (!cost || cost <= 0) errors.asset_cost = "Valid acquisition cost is required.";
    if (!usefulLifeMonths || usefulLifeMonths < 1) errors.asset_life = "Useful life must be at least 1 month.";
    if (!assetAccountId) errors.asset_assetAccountId = "Asset account is required.";
    if (!depreciationExpenseAccountId) errors.asset_deprAccountId = "Depreciation expense account is required.";
    if (!accumulatedDepreciationAccountId) errors.asset_accumAccountId = "Accumulated depreciation account is required.";
    if (!fundingAccountId) errors.asset_fundingAccountId = "Funding account is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errors }));
      notifications.error("Validation error", "Please fill in all required asset fields.");
      return;
    }
    const body = Object.fromEntries([...form.entries()].map(([key, value]) => [key, ["cost", "salvageValue", "usefulLifeMonths"].includes(key) ? Number(value) : value]));
    void run(() => apiClient.post("/fixed-assets", body), "Asset recorded");
    event.currentTarget.reset();
  };
  const createBudget = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget);
    const errors: Record<string, string> = {};
    const accountId = String(form.get("accountId") || "").trim();
    const amountVal = form.get("amount");
    const amount = Number(amountVal);
    const startDate = String(form.get("startDate") || "").trim();
    const endDate = String(form.get("endDate") || "").trim();

    if (!accountId) errors.budget_accountId = "Account is required.";
    if (amountVal === "" || isNaN(amount) || amount < 0) errors.budget_amount = "Valid budget amount is required.";
    if (!startDate) errors.budget_startDate = "Start date is required.";
    if (!endDate) {
      errors.budget_endDate = "End date is required.";
    } else if (startDate && endDate < startDate) {
      errors.budget_endDate = "End date must be on or after start date.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...errors }));
      notifications.error("Validation error", "Please correct the highlighted budget fields.");
      return;
    }
    const body = Object.fromEntries([...form.entries()].map(([key, value]) => [key, key === "amount" ? Number(value) : value === "" ? null : value]));
    void run(() => apiClient.post("/account-budgets", body), "Budget saved");
    event.currentTarget.reset();
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">Accounting controls</h1><p className="mt-1 text-sm text-slate-500">Approvals, evidence, reporting dimensions, assets, and budgets.</p></div>
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

    <section className={card}>
      <h2 className="text-lg font-semibold">Approval workflow</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">Submit a journal, period close, stock write-off, or correction payload. A different user must review it before it can be applied.</p>
      <form onSubmit={submit(submitApproval)} noValidate className="grid gap-3 md:grid-cols-4">
        <label><span className={label}>Action</span><select name="action" className={input}>{actionNames.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
        <div>
          <label><span className={label}>Resource ID <span className="text-rose-500">*</span></span><input name="resourceId" onChange={() => clearError("approval_resourceId")} aria-invalid={Boolean(formErrors.approval_resourceId)} className={getFieldClass("approval_resourceId")} placeholder="Source ID or target ID" /></label>
          {renderError("approval_resourceId")}
        </div>
        <div className="md:col-span-2">
          <label><span className={label}>Summary <span className="text-rose-500">*</span></span><input name="summary" onChange={() => clearError("approval_summary")} aria-invalid={Boolean(formErrors.approval_summary)} className={getFieldClass("approval_summary")} /></label>
          {renderError("approval_summary")}
        </div>
        <div className="md:col-span-4">
          <label><span className={label}>Exact action payload (JSON) <span className="text-rose-500">*</span></span><textarea name="payloadJson" onChange={() => clearError("approval_payloadJson")} aria-invalid={Boolean(formErrors.approval_payloadJson)} className={getFieldClass("approval_payloadJson", "min-h-24 font-mono")} placeholder={'Journal example: {"journalDate":"2026-10-07","description":"Correction","sourceType":"Journal","sourceId":"ref-1","lines":[{"accountId":"...","debit":100,"credit":0},{"accountId":"...","debit":0,"credit":100}]}'} /></label>
          {renderError("approval_payloadJson")}
        </div>
        <Button type="submit" disabled={busy}>Submit for review</Button>
      </form>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-2">Action</th><th>Summary</th><th>State</th><th>Requested</th><th className="text-right">Actions</th></tr></thead><tbody>
        {approvals.map(item => <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800"><td className="py-2">{actionNames[item.action] ?? "Unknown"}</td><td>{item.summary}<div className="text-xs text-slate-500">{item.resourceId}</div></td><td>{statusNames[item.status]}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td><td className="space-x-2 text-right">
          {item.status === 0 && <><Button type="button" disabled={busy} onClick={() => void run(() => apiClient.post(`/accounting-approvals/${item.id}/decision`, { approve: true }), "Approval accepted")}>Approve</Button><Button type="button" disabled={busy} onClick={() => void run(() => apiClient.post(`/accounting-approvals/${item.id}/decision`, { approve: false }), "Approval rejected")}>Reject</Button></>}
          {item.status === 1 && <Button type="button" disabled={busy} onClick={() => void run(() => apiClient.post(`/accounting-approvals/${item.id}/apply`, {}), "Approved action applied")}>Apply</Button>}
        </td></tr>)}
      </tbody></table></div>
    </section>

    {permissionUsers.length > 0 && <section className={card}>
      <h2 className="text-lg font-semibold">Accounting permissions</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">The designated tenant owner manages permissions. Permissions take effect immediately. Use Staff Access to invite users and transfer ownership.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-2">User</th>{permissionNames.map(code => <th key={code} className="px-2">{code.replace("accounting.", "")}</th>)}</tr></thead><tbody>{permissionUsers.map(user => <tr key={user.userId} className="border-b border-slate-100 dark:border-slate-800"><td className="py-2">{user.userName}<div className="text-xs text-slate-500">{user.email}</div></td>{permissionNames.map(code => <td key={code} className="px-2 text-center"><input aria-label={`${code} for ${user.userName}`} type="checkbox" checked={user.permissions.includes(code)} onChange={event => void run(() => apiClient.put(`/accounting-permissions/${user.userId}/${code}`, { granted: event.target.checked }), "Permission updated")} /></td>)}</tr>)}</tbody></table></div>
    </section>}

    <section className={card}>
      <h2 className="text-lg font-semibold">Supporting documents</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">Links evidence stored in your configured document store to a source record.</p>
      <div className="grid gap-3 md:grid-cols-2"><label><span className={label}>Resource type</span><input className={input} value={resourceType} onChange={e => setResourceType(e.target.value)} /></label><label><span className={label}>Resource ID</span><input className={input} value={resourceId} onChange={e => setResourceId(e.target.value)} /></label></div>
      <form onSubmit={submit(addDocument)} noValidate className="mt-3 grid gap-3 md:grid-cols-3">
        <input type="hidden" name="resourceType" value={resourceType} /><input type="hidden" name="resourceId" value={resourceId} />
        <div>
          <label><span className={label}>File name <span className="text-rose-500">*</span></span><input name="fileName" onChange={() => clearError("doc_fileName")} aria-invalid={Boolean(formErrors.doc_fileName)} className={getFieldClass("doc_fileName")} /></label>
          {renderError("doc_fileName")}
        </div>
        <div>
          <label><span className={label}>Content type <span className="text-rose-500">*</span></span><input name="contentType" onChange={() => clearError("doc_contentType")} aria-invalid={Boolean(formErrors.doc_contentType)} className={getFieldClass("doc_contentType")} placeholder="application/pdf" /></label>
          {renderError("doc_contentType")}
        </div>
        <div>
          <label><span className={label}>Storage reference <span className="text-rose-500">*</span></span><input name="storageReference" onChange={() => clearError("doc_storageReference")} aria-invalid={Boolean(formErrors.doc_storageReference)} className={getFieldClass("doc_storageReference")} placeholder="Storage key or secure URL" /></label>
          {renderError("doc_storageReference")}
        </div>
        <div className="md:col-span-2">
          <label><span className={label}>Description</span><input name="description" className={input} /></label>
        </div>
        <div className="self-end"><Button type="submit" disabled={busy || !resourceId.trim()}>Link evidence</Button></div>
      </form>
      <ul className="mt-4 divide-y text-sm">{documents.map(doc => <li key={doc.id} className="flex justify-between py-2"><span>{doc.fileName}<small className="ml-2 text-slate-500">{doc.description}</small></span>{/^https?:\/\//i.test(doc.storageReference) ? <a className="text-blue-600 underline" href={doc.storageReference} target="_blank" rel="noreferrer">Open</a> : <span className="text-xs text-slate-500">{doc.storageReference}</span>}</li>)}</ul>
    </section>

    <section className={card}>
      <h2 className="text-lg font-semibold">Reporting dimensions</h2><p className="mb-4 mt-1 text-sm text-slate-500">Create branches, projects, or cost centers for journal line reporting.</p>
      <form onSubmit={submit(createDimension)} noValidate className="grid gap-3 md:grid-cols-4">
        <label><span className={label}>Type</span><select name="dimensionType" className={input}><option>Branch</option><option>CostCenter</option><option>Project</option></select></label>
        <div>
          <label><span className={label}>Code <span className="text-rose-500">*</span></span><input name="code" onChange={() => clearError("dim_code")} aria-invalid={Boolean(formErrors.dim_code)} className={getFieldClass("dim_code")} /></label>
          {renderError("dim_code")}
        </div>
        <div>
          <label><span className={label}>Name <span className="text-rose-500">*</span></span><input name="name" onChange={() => clearError("dim_name")} aria-invalid={Boolean(formErrors.dim_name)} className={getFieldClass("dim_name")} /></label>
          {renderError("dim_name")}
        </div>
        <div className="self-end"><Button type="submit" disabled={busy}>Add dimension</Button></div>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">{dimensions.map(d => <span key={d.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800">{d.dimensionType}: {d.code} · {d.name}</span>)}</div>
    </section>

    <section className={card}>
      <h2 className="text-lg font-semibold">Fixed assets</h2><p className="mb-4 mt-1 text-sm text-slate-500">Straight-line depreciation by month; acquisitions, depreciation, and disposal post linked ledger journals.</p>
      <form onSubmit={submit(createAsset)} noValidate className="grid gap-3 md:grid-cols-4">
        <div>
          <label><span className={label}>Asset number <span className="text-rose-500">*</span></span><input name="assetNumber" onChange={() => clearError("asset_number")} aria-invalid={Boolean(formErrors.asset_number)} className={getFieldClass("asset_number")} /></label>
          {renderError("asset_number")}
        </div>
        <div>
          <label><span className={label}>Name <span className="text-rose-500">*</span></span><input name="name" onChange={() => clearError("asset_name")} aria-invalid={Boolean(formErrors.asset_name)} className={getFieldClass("asset_name")} /></label>
          {renderError("asset_name")}
        </div>
        <div>
          <label><span className={label}>Acquisition date <span className="text-rose-500">*</span></span><input type="date" name="acquisitionDate" onChange={() => clearError("asset_date")} aria-invalid={Boolean(formErrors.asset_date)} className={getFieldClass("asset_date")} /></label>
          {renderError("asset_date")}
        </div>
        <div>
          <label><span className={label}>Cost <span className="text-rose-500">*</span></span><input type="number" min="0.01" step="0.01" name="cost" onChange={() => clearError("asset_cost")} aria-invalid={Boolean(formErrors.asset_cost)} className={getFieldClass("asset_cost")} /></label>
          {renderError("asset_cost")}
        </div>
        <div>
          <label><span className={label}>Salvage value</span><input type="number" min="0" step="0.01" name="salvageValue" defaultValue="0" className={input} /></label>
        </div>
        <div>
          <label><span className={label}>Useful life (months) <span className="text-rose-500">*</span></span><input type="number" min="1" name="usefulLifeMonths" onChange={() => clearError("asset_life")} aria-invalid={Boolean(formErrors.asset_life)} className={getFieldClass("asset_life")} /></label>
          {renderError("asset_life")}
        </div>
        <div>
          <label><span className={label}>Asset account <span className="text-rose-500">*</span></span><select name="assetAccountId" onChange={() => clearError("asset_assetAccountId")} aria-invalid={Boolean(formErrors.asset_assetAccountId)} className={getFieldClass("asset_assetAccountId")}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></label>
          {renderError("asset_assetAccountId")}
        </div>
        <div>
          <label><span className={label}>Depreciation expense <span className="text-rose-500">*</span></span><select name="depreciationExpenseAccountId" onChange={() => clearError("asset_deprAccountId")} aria-invalid={Boolean(formErrors.asset_deprAccountId)} className={getFieldClass("asset_deprAccountId")}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></label>
          {renderError("asset_deprAccountId")}
        </div>
        <div>
          <label><span className={label}>Accumulated depreciation <span className="text-rose-500">*</span></span><select name="accumulatedDepreciationAccountId" onChange={() => clearError("asset_accumAccountId")} aria-invalid={Boolean(formErrors.asset_accumAccountId)} className={getFieldClass("asset_accumAccountId")}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></label>
          {renderError("asset_accumAccountId")}
        </div>
        <div>
          <label><span className={label}>Funding account <span className="text-rose-500">*</span></span><select name="fundingAccountId" onChange={() => clearError("asset_fundingAccountId")} aria-invalid={Boolean(formErrors.asset_fundingAccountId)} className={getFieldClass("asset_fundingAccountId")}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></label>
          {renderError("asset_fundingAccountId")}
        </div>
        <div className="self-end"><Button type="submit" disabled={busy}>Record asset</Button></div>
      </form>
      <div className="mt-5 flex flex-wrap items-end gap-2"><label><span className={label}>Disposal proceeds account</span><select className={input} value={proceedsAccountId} onChange={e => setProceedsAccountId(e.target.value)}><option value="">Select cash/bank</option>{accounts.filter(a => a.type === 0 && (a.code === "1000" || a.code === "1010")).map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></label></div>
      <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-2">Asset</th><th>Cost</th><th>Depreciated</th><th>Book value</th><th>Actions</th></tr></thead><tbody>{assets.map(a => <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800"><td className="py-2">{a.assetNumber} · {a.name}</td><td>{money(a.acquisitionCost)}</td><td>{money(a.accumulatedDepreciation)}</td><td>{money(a.bookValue)}</td><td className="space-x-2">{!a.disposedDate && <><Button type="button" disabled={busy} onClick={() => void run(() => apiClient.post(`/fixed-assets/${a.id}/depreciate`, { depreciationDate: new Date().toISOString().slice(0, 10), months: 1 }), "Depreciation posted")}>Depreciate month</Button><Button type="button" disabled={busy || !proceedsAccountId} onClick={() => { const proceeds = Number(window.prompt("Disposal proceeds", "0")); if (Number.isFinite(proceeds) && proceeds >= 0) void run(() => apiClient.post(`/fixed-assets/${a.id}/dispose`, { disposalDate: new Date().toISOString().slice(0, 10), proceeds, proceedsAccountId }), "Asset disposed"); }}>Dispose</Button></>}</td></tr>)}</tbody></table></div>
    </section>

    <section className={card}>
      <h2 className="text-lg font-semibold">Budgets and variance</h2><p className="mb-4 mt-1 text-sm text-slate-500">Set account budgets by date range and optional reporting dimension.</p>
      <form onSubmit={submit(createBudget)} noValidate className="grid gap-3 md:grid-cols-3">
        <div>
          <label><span className={label}>Account <span className="text-rose-500">*</span></span><select name="accountId" onChange={() => clearError("budget_accountId")} aria-invalid={Boolean(formErrors.budget_accountId)} className={getFieldClass("budget_accountId")}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></label>
          {renderError("budget_accountId")}
        </div>
        <div>
          <label><span className={label}>Dimension (optional)</span><select name="dimensionId" className={input}><option value="">All dimensions</option>{dimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionType}: {d.code}</option>)}</select></label>
        </div>
        <div>
          <label><span className={label}>Budget amount <span className="text-rose-500">*</span></span><input type="number" min="0" step="0.01" name="amount" onChange={() => clearError("budget_amount")} aria-invalid={Boolean(formErrors.budget_amount)} className={getFieldClass("budget_amount")} /></label>
          {renderError("budget_amount")}
        </div>
        <div>
          <label><span className={label}>Start date <span className="text-rose-500">*</span></span><input type="date" name="startDate" onChange={() => clearError("budget_startDate")} aria-invalid={Boolean(formErrors.budget_startDate)} className={getFieldClass("budget_startDate")} /></label>
          {renderError("budget_startDate")}
        </div>
        <div>
          <label><span className={label}>End date <span className="text-rose-500">*</span></span><input type="date" name="endDate" onChange={() => clearError("budget_endDate")} aria-invalid={Boolean(formErrors.budget_endDate)} className={getFieldClass("budget_endDate")} /></label>
          {renderError("budget_endDate")}
        </div>
        <div>
          <label><span className={label}>Notes</span><input name="notes" className={input} /></label>
        </div>
        <div className="self-end"><Button type="submit" disabled={busy}>Save budget</Button></div>
      </form>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-2">Account / dimension</th><th>Period</th><th>Budget</th><th>Actual</th><th>Variance</th></tr></thead><tbody>{budgets.map(b => <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800"><td className="py-2">{b.accountCode} · {b.accountName}{b.dimensionCode ? ` (${b.dimensionCode})` : ""}</td><td>{b.startDate} – {b.endDate}</td><td>{money(b.amount)}</td><td>{money(b.actual)}</td><td>{money(b.variance)}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
