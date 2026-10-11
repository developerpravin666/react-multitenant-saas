import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../../services/apiClient";
import { authService } from "./auth.service";
import { PasswordRequirements } from "./PasswordRequirements";
import { getPasswordValidationErrors } from "./passwordValidation";

const card = "w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900";
const getInputClass = (hasError: boolean) =>
  `mt-1 w-full rounded-lg border ${
    hasError
      ? "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white"
      : "border-slate-300 bg-white text-slate-900 focus:border-[var(--tenant-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
  } px-3 py-2.5 outline-none transition`;
const button = "w-full rounded-lg bg-[var(--tenant-primary)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--tenant-primary-hover)] disabled:opacity-60";

function Feedback({ error, success }: { error: string; success: string }) {
  if (error) return <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>;
  if (success) return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">{success}</p>;
  return null;
}

export function ForgotPasswordPage() {
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const clearFieldError = (name: string) => {
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const errors: Record<string, string> = {};
    if (!tenantSlug.trim()) {
      errors.tenantSlug = "Tenant slug is required.";
    }
    if (!email.trim()) {
      errors.email = "Account email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setBusy(true);
    try {
      const result = await authService.requestPasswordReset(tenantSlug.trim(), email.trim());
      setSuccess(result.message);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to send the reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <section className={card}>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Reset your password</h1>
        <p className="mb-6 mt-2 text-sm text-slate-600 dark:text-slate-300">
          Enter your tenant and account email. If they match, we’ll email you a reset link.
        </p>
        <form className="space-y-4" onSubmit={submit} noValidate autoComplete="off">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Tenant slug <span className="text-rose-500">*</span>
            </label>
            <input
              className={getInputClass(Boolean(fieldErrors.tenantSlug))}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.tenantSlug)}
              placeholder="e.g. acme"
              value={tenantSlug}
              onChange={(e) => {
                setTenantSlug(e.target.value);
                clearFieldError("tenantSlug");
              }}
            />
            {fieldErrors.tenantSlug && (
              <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.tenantSlug}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              className={getInputClass(Boolean(fieldErrors.email))}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.email)}
              placeholder="user@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
            />
            {fieldErrors.email && (
              <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <Feedback error={error} success={success} />
          <button className={button} disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link className="text-[var(--tenant-primary)] hover:underline" to="/login">
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const clearFieldError = (name: string) => {
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This password reset link is invalid or missing.");
      return;
    }

    const errors: Record<string, string> = {};
    if (!password) {
      errors.password = "New password is required.";
    } else {
      const passwordValidation = getPasswordValidationErrors(password);
      if (passwordValidation.length > 0) {
        errors.password = passwordValidation.join(". ");
      }
    }

    if (!confirm) {
      errors.confirm = "Please confirm your new password.";
    } else if (password !== confirm) {
      errors.confirm = "The passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setBusy(true);
    try {
      await authService.resetPassword(token, password);
      navigate("/login", {
        replace: true,
        state: { message: "Password changed. Sign in with your new password." },
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to reset your password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <section className={card}>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Choose a new password</h1>
        <p className="mb-6 mt-2 text-sm text-slate-600 dark:text-slate-300">Your reset link is valid for 30 minutes.</p>
        <form className="space-y-4" onSubmit={submit} noValidate autoComplete="off">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              New password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              className={getInputClass(Boolean(fieldErrors.password))}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.password)}
              placeholder="Enter new password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
              }}
            />
            {fieldErrors.password && (
              <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.password}
              </p>
            )}
            <PasswordRequirements password={password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Confirm password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              className={getInputClass(Boolean(fieldErrors.confirm))}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.confirm)}
              placeholder="Re-enter new password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                clearFieldError("confirm");
              }}
            />
            {fieldErrors.confirm && (
              <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.confirm}
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="whitespace-pre-line rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </p>
          )}
          <button className={button} disabled={busy}>
            {busy ? "Updating…" : "Change password"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link className="text-[var(--tenant-primary)] hover:underline" to="/login">
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
