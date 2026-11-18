import { useState } from "react";
import { apiClient } from "../../services/apiClient";
import { z } from "zod";
import { Boxes, Users, Check, Package } from "lucide-react";

export interface TenantProfile {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerMobile: string | null;
  stateCode: string | null;
  gstin: string | null;
  address: string | null;
  subscribedModules?: string | null;
}

const tenantProfileSchema = z.object({
  name: z.string().trim().min(1, "Store name is required."),
  ownerName: z.string().trim().min(1, "Owner name is required."),
  ownerEmail: z.string().trim().email("Please enter a valid owner email."),
  ownerMobile: z.string().trim().min(1, "Owner mobile is required."),
});

const tenantPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters including uppercase, lowercase and a number.")
      .regex(/[A-Z]/, "Use at least 8 characters including uppercase, lowercase and a number.")
      .regex(/[a-z]/, "Use at least 8 characters including uppercase, lowercase and a number.")
      .regex(/[0-9]/, "Use at least 8 characters including uppercase, lowercase and a number."),
    confirmation: z.string().min(1, "Please confirm password."),
  })
  .refine((data) => data.password === data.confirmation, {
    message: "Passwords do not match.",
    path: ["confirmation"],
  });

export function TenantManagementDialog({ tenant, mode, onClose, onSaved }: {
  tenant: TenantProfile; mode: "profile" | "password" | "modules"; onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [profile, setProfile] = useState({
    name: tenant.name, ownerName: tenant.ownerName ?? "", ownerEmail: tenant.ownerEmail ?? "",
    ownerMobile: tenant.ownerMobile ?? "", stateCode: tenant.stateCode ?? "",
    gstin: tenant.gstin ?? "", address: tenant.address ?? "",
  });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>(() => {
    if (tenant.subscribedModules) {
      return tenant.subscribedModules.split(",").map((s) => s.trim().toLowerCase());
    }
    return ["accounting_inventory", "hr_payroll"];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = mode === "profile"
    ? "Edit tenant profile"
    : mode === "password"
    ? "Reset owner password"
    : "Manage Assigned Modules";
  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

  const toggleModule = (modId: string) => {
    setSelectedModules((prev) => {
      if (prev.includes(modId)) {
        if (prev.length === 1) return prev; // At least one module
        return prev.filter((m) => m !== modId);
      }
      return [...prev, modId];
    });
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "profile") {
      const parsed = tenantProfileSchema.safeParse(profile);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please check form fields.");
        return;
      }
    } else if (mode === "password") {
      const parsed = tenantPasswordSchema.safeParse({ password, confirmation });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please check password criteria.");
        return;
      }
    } else if (mode === "modules") {
      if (selectedModules.length === 0) {
        setError("At least one subscription module must remain enabled.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "profile") {
        await apiClient.put(`/admin/tenants/${tenant.id}/profile`, profile);
        await onSaved("Tenant profile and owner login details updated.");
      } else if (mode === "password") {
        await apiClient.post(`/admin/tenants/${tenant.id}/owner-password`, { password });
        setPassword(""); setConfirmation("");
        await onSaved("Owner password reset successfully.");
      } else if (mode === "modules") {
        await apiClient.put(`/admin/tenants/${tenant.id}/modules`, { modules: selectedModules })
          .catch(() => apiClient.put(`/tenants/${tenant.id}/modules`, { modules: selectedModules }));
        await onSaved(`Assigned modules updated successfully for ${tenant.name}.`);
      }
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save changes.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="tenant-management-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
      <h2 id="tenant-management-title" className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{tenant.name}</p>
      <form onSubmit={submit} noValidate autoComplete="off" className="mt-4 space-y-3">
        {mode === "profile" ? <>
          {([
            ["name", "Store name", 200], ["ownerName", "Owner name", 150],
            ["ownerEmail", "Owner email", 150], ["ownerMobile", "Owner mobile", 20],
            ["stateCode", "State code", 2], ["gstin", "GSTIN", 15], ["address", "Address", 500],
          ] as const).map(([key, label, maxLength]) => <label key={key} className="block text-sm font-medium">
            {label} {["name", "ownerName", "ownerEmail", "ownerMobile"].includes(key) && <span className="text-rose-500">*</span>}
            <input className={inputClass} type={key === "ownerEmail" ? "email" : "text"}
              maxLength={maxLength}
              value={profile[key]} onChange={e => setProfile({ ...profile, [key]: e.target.value })} disabled={busy} />
          </label>)}
          <p className="text-xs text-slate-500">Changing owner email or mobile updates their sign-in details. Billing settings are managed separately in the store.</p>
        </> : mode === "password" ? <>
          <label className="block text-sm font-medium">New password <span className="text-rose-500">*</span>
            <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
          </label>
          <label className="block text-sm font-medium">Confirm password <span className="text-rose-500">*</span>
            <input className={inputClass} type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} />
          </label>
          <p className="text-xs text-slate-500">Use at least 8 characters including uppercase, lowercase and a number. Existing sessions cannot refresh after this reset; access tokens remain valid until expiry. For pending stores, this password applies when approved.</p>
        </> : <>
          <p className="text-xs text-slate-500">
            Control which modules and menu items users of this tenant can access. Changes will immediately sync to the tenant's feature flags.
          </p>

          <div className="space-y-3 pt-2">
            <div
              onClick={() => toggleModule("accounting_inventory")}
              className={`cursor-pointer rounded-xl border-2 p-3 transition ${
                selectedModules.includes("accounting_inventory")
                  ? "border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20"
                  : "border-slate-200 bg-white opacity-60 dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`grid size-8 place-items-center rounded-lg ${
                    selectedModules.includes("accounting_inventory") ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}>
                    <Boxes className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Accounting & Inventory
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      POS Invoices, Serialized Stock, Godowns, Double-Entry General Ledger & GST
                    </p>
                  </div>
                </div>
                <div className={`grid size-5 place-items-center rounded-full border ${
                  selectedModules.includes("accounting_inventory") ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white dark:border-slate-700"
                }`}>
                  {selectedModules.includes("accounting_inventory") && <Check className="size-3 stroke-[3]" />}
                </div>
              </div>
            </div>

            <div
              onClick={() => toggleModule("hr_payroll")}
              className={`cursor-pointer rounded-xl border-2 p-3 transition ${
                selectedModules.includes("hr_payroll")
                  ? "border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/20"
                  : "border-slate-200 bg-white opacity-60 dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`grid size-8 place-items-center rounded-lg ${
                    selectedModules.includes("hr_payroll") ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}>
                    <Users className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Smart HR & Payroll
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Staff Directory, Org Hierarchy, Leave Approvals, Indian Statutory Payroll (PF, ESI, PT)
                    </p>
                  </div>
                </div>
                <div className={`grid size-5 place-items-center rounded-full border ${
                  selectedModules.includes("hr_payroll") ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white dark:border-slate-700"
                }`}>
                  {selectedModules.includes("hr_payroll") && <Check className="size-3 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>
        </>}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : mode === "profile" ? "Save profile" : mode === "password" ? "Reset password" : "Save Modules"}
          </button>
        </div>
      </form>
    </section>
  </div>;
}
