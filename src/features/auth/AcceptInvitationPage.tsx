import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "../../components/ui/Button";

export function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const tenantId = params.get("tenantId") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const clearFieldError = (name: string) => {
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 12) {
      errors.password = "Password must be at least 12 characters long.";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must include at least one uppercase letter.";
    } else if (!/[a-z]/.test(password)) {
      errors.password = "Password must include at least one lowercase letter.";
    } else if (!/[0-9]/.test(password)) {
      errors.password = "Password must include at least one number.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    return errors;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!token || !tenantId) {
      setError("Activation link is missing a valid token or tenant workspace identifier.");
      return;
    }

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setBusy(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || "/api";
      await axios.post(
        `${base.replace(/\/$/, "")}/auth/accept-invitation`,
        { token, password },
        { headers: { "X-Tenant-Id": tenantId } }
      );
      setDone(true);
    } catch (cause) {
      setError(
        axios.isAxiosError(cause)
          ? cause.response?.data?.message || cause.response?.data?.detail || cause.response?.data?.title || cause.message
          : "Activation failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <div className="mb-4 grid size-11 place-items-center rounded-xl bg-blue-600 text-white shadow-md">
            <KeyRound className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Activate your account</h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
            Choose a secure password to activate your staff account.
          </p>
        </div>

        {done ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <CheckCircle2 className="mx-auto size-10 text-emerald-600 dark:text-emerald-400" />
            <h2 className="mt-2 text-base font-bold text-slate-900 dark:text-white">Account activated successfully!</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              You can now sign in with your username and password.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 py-2.5 font-semibold text-white shadow-md transition hover:bg-blue-700"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} noValidate autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Choose a password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.password)}
                placeholder="At least 12 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                className={`mt-1.5 w-full rounded-xl border ${
                  fieldErrors.password
                    ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white"
                    : "border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                } px-3.5 py-2.5 text-sm outline-none transition`}
              />
              {fieldErrors.password ? (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {fieldErrors.password}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  Must be at least 12 characters, including uppercase, lowercase, and numbers.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Confirm password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError("confirmPassword");
                }}
                className={`mt-1.5 w-full rounded-xl border ${
                  fieldErrors.confirmPassword
                    ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white"
                    : "border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                } px-3.5 py-2.5 text-sm outline-none transition`}
              />
              {fieldErrors.confirmPassword && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                {error}
              </p>
            )}

            <Button type="submit" disabled={busy || !token || !tenantId} className="w-full">
              {busy ? "Activating account…" : "Activate account"}
            </Button>

            <p className="pt-2 text-center text-xs text-slate-500">
              <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
