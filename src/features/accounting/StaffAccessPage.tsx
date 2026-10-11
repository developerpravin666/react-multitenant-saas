import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiClient } from "../../services/apiClient";
import { Button } from "../../components/ui/Button";
import { useAccountingAccess } from "./AccountingAccess";
import { useNotifications } from "../../context/NotificationContext";
type Staff = { id: string; userName: string; email: string; mobile: string; isOwner: boolean; isActive: boolean; emailVerified: boolean };
type Grants = { userId: string; permissions: string[] };
const codes = ["catalog.manage", "purchases.manage", "sales.manage", "inventory.manage", "accounting.manage", "accounting.approve", "accounting.dimensions.manage", "accounting.documents.manage", "accounting.assets.manage", "accounting.budgets.manage"];
export function StaffAccessPage() {
  const notifications = useNotifications();
  const { isOwner, refresh } = useAccountingAccess(); const [staff, setStaff] = useState<Staff[]>([]); const [grants, setGrants] = useState<Grants[]>([]);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (name: string) => {
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const load = useCallback(async () => {
    if (!isOwner) return;
    const [users, permissions] = await Promise.all([apiClient.get<Staff[]>("/accounting/staff"), apiClient.get<Grants[]>("/accounting-permissions")]);
    setStaff(users); setGrants(permissions);
  }, [isOwner]);
  useEffect(() => { void load().catch(e => setError(e.message)); }, [load]);
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true); setError(""); try { await work(); await refresh(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Action failed."); } finally { setBusy(false); }
  };
  const invite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!userName.trim()) errors.userName = "Username is required.";
    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (mobile.trim() && !/^\d{10}$/.test(mobile.trim())) {
      errors.mobile = "Mobile number must be 10 digits.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    void run(async () => {
      await apiClient.post("/accounting/staff/invitations", { userName: userName.trim(), email: email.trim(), mobile: mobile.trim() });
      setUserName("");
      setEmail("");
      setMobile("");
    });
  };
  if (!isOwner) return <p>Only the tenant owner can manage staff and permissions.</p>;
  return <div className="space-y-5"><h1 className="text-2xl font-semibold">Staff access</h1><p>Invite staff by email. Invitations expire after 24 hours; permissions take effect immediately.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <form onSubmit={invite} noValidate className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
      <div>
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Username <span className="text-rose-500">*</span>
        </label>
        <input
          value={userName}
          aria-invalid={Boolean(fieldErrors.userName)}
          onChange={(e) => { setUserName(e.target.value); clearFieldError("userName"); }}
          maxLength={64}
          placeholder="e.g. rahul_manager"
          className={`mt-1 w-full rounded-lg border ${
            fieldErrors.userName
              ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20"
              : "border-slate-300 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950"
          } p-2 text-sm outline-none transition`}
        />
        {fieldErrors.userName && (
          <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
            {fieldErrors.userName}
          </p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Email <span className="text-rose-500">*</span>
        </label>
        <input
          type="email"
          value={email}
          aria-invalid={Boolean(fieldErrors.email)}
          onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
          maxLength={256}
          placeholder="staff@store.in"
          className={`mt-1 w-full rounded-lg border ${
            fieldErrors.email
              ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20"
              : "border-slate-300 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950"
          } p-2 text-sm outline-none transition`}
        />
        {fieldErrors.email && (
          <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Mobile (Optional)
        </label>
        <input
          value={mobile}
          aria-invalid={Boolean(fieldErrors.mobile)}
          onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "")); clearFieldError("mobile"); }}
          maxLength={10}
          placeholder="10-digit mobile"
          className={`mt-1 w-full rounded-lg border ${
            fieldErrors.mobile
              ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20"
              : "border-slate-300 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950"
          } p-2 text-sm outline-none transition`}
        />
        {fieldErrors.mobile && (
          <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
            {fieldErrors.mobile}
          </p>
        )}
      </div>

      <div className="md:col-span-3 flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? "Sending invitation…" : "Send invitation"}
        </Button>
      </div>
    </form>
    <div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>User</th><th>Status</th><th>Access</th><th>Actions</th></tr></thead><tbody>{staff.map(s => <tr key={s.id} className="border-t"><td className="p-3">{s.userName}<div>{s.email}</div></td><td>{s.isOwner ? "Owner" : !s.emailVerified ? "Invited" : s.isActive ? "Active" : "Disabled"}</td><td><div className="grid gap-2 md:grid-cols-2">{codes.map(code => <label key={code}><input type="checkbox" disabled={busy || s.isOwner || !s.isActive} checked={s.isOwner || (grants.find(g => g.userId === s.id)?.permissions.includes(code) ?? false)} onChange={e => void run(() => apiClient.put(`/accounting-permissions/${s.id}/${code}`,{granted:e.target.checked}))} /> {code}</label>)}</div></td><td>{!s.isOwner && s.emailVerified && <Button disabled={busy} onClick={() => void run(() => apiClient.put(`/accounting/staff/${s.id}/status`,{active:!s.isActive}))}>{s.isActive ? "Disable" : "Enable"}</Button>}
      {!s.emailVerified && <Button disabled={busy} onClick={() => void run(() => apiClient.post("/accounting/staff/invitations",{userName:s.userName,email:s.email,mobile:s.mobile}))}>Resend invitation</Button>}
      {!s.isOwner && s.isActive && s.emailVerified && (
        <Button
          disabled={busy}
          variant="secondary"
          onClick={async () => {
            const confirmed = await notifications.confirm({
              title: "Transfer Store Ownership?",
              message: `Transfer ownership to ${s.userName}? You will lose owner access.`,
              variant: "danger",
              confirmLabel: "Transfer Ownership",
              cancelLabel: "Cancel",
            });
            if (confirmed) {
              void run(() => apiClient.post("/accounting/owner/transfer", { userId: s.id }));
            }
          }}
        >
          Transfer ownership
        </Button>
      )}</td></tr>)}</tbody></table></div>
  </div>;
}
