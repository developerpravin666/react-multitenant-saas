import { useState } from "react";
import { apiClient } from "../../services/apiClient";

export interface TenantProfile {
  id: string; name: string; ownerName: string | null; ownerEmail: string | null;
  ownerMobile: string | null; stateCode: string | null; gstin: string | null; address: string | null;
}

export function TenantManagementDialog({ tenant, mode, onClose, onSaved }: {
  tenant: TenantProfile; mode: "profile" | "password"; onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [profile, setProfile] = useState({
    name: tenant.name, ownerName: tenant.ownerName ?? "", ownerEmail: tenant.ownerEmail ?? "",
    ownerMobile: tenant.ownerMobile ?? "", stateCode: tenant.stateCode ?? "",
    gstin: tenant.gstin ?? "", address: tenant.address ?? "",
  });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = mode === "profile" ? "Edit tenant profile" : "Reset owner password";
  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (mode === "password") {
      if (password !== confirmation) { setError("Passwords do not match."); return; }
      if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        setError("Use at least 8 characters including uppercase, lowercase and a number."); return;
      }
    }
    setBusy(true);
    try {
      if (mode === "profile") await apiClient.put(`/admin/tenants/${tenant.id}/profile`, profile);
      else await apiClient.post(`/admin/tenants/${tenant.id}/owner-password`, { password });
      setPassword(""); setConfirmation("");
      await onSaved(mode === "profile" ? "Tenant profile and owner login details updated." : "Owner password reset successfully.");
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save changes."); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="tenant-management-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
      <h2 id="tenant-management-title" className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{tenant.name}</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        {mode === "profile" ? <>
          {([
            ["name", "Store name", 200], ["ownerName", "Owner name", 150],
            ["ownerEmail", "Owner email", 150], ["ownerMobile", "Owner mobile", 20],
            ["stateCode", "State code", 2], ["gstin", "GSTIN", 15], ["address", "Address", 500],
          ] as const).map(([key, label, maxLength]) => <label key={key} className="block text-sm font-medium">
            {label}
            <input className={inputClass} type={key === "ownerEmail" ? "email" : "text"}
              required={["name", "ownerName", "ownerEmail", "ownerMobile"].includes(key)} maxLength={maxLength}
              value={profile[key]} onChange={e => setProfile({ ...profile, [key]: e.target.value })} disabled={busy} />
          </label>)}
          <p className="text-xs text-slate-500">Changing owner email or mobile updates their sign-in details. Billing settings are managed separately in the store.</p>
        </> : <>
          <label className="block text-sm font-medium">New password
            <input className={inputClass} type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
          </label>
          <label className="block text-sm font-medium">Confirm password
            <input className={inputClass} type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} />
          </label>
          <p className="text-xs text-slate-500">Use at least 8 characters including uppercase, lowercase and a number. Existing sessions cannot refresh after this reset; access tokens remain valid until expiry. For pending stores, this password applies when approved.</p>
        </>}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : mode === "profile" ? "Save profile" : "Reset password"}</button>
        </div>
      </form>
    </section>
  </div>;
}
