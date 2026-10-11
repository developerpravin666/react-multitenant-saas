import { useState } from "react";
import { ShieldCheck, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ApiError } from "../../services/apiClient";

export function AdminLoginPage() {
  const { isAuthenticated, isProductOwner, adminLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/admin/dashboard";

  if (isAuthenticated && isProductOwner) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const validate = () => {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      errors.username = "Username or Admin Email is required.";
    }
    if (!password) {
      errors.password = "Password is required.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await adminLogin({
        username: username.trim(),
        password,
      });
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Authentication failed. Please verify credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDefaults = () => {
    setUsername("admin");
    setPassword("Admin@123456");
    setFieldErrors({});
    setFormError("");
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-900 p-4 selection:bg-indigo-500 selection:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))] pointer-events-none" />

      <section className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="size-4" />
            <span>Platform Owner Console</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Administrator Sign In</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Access multi-tenant management, store approval queue, and automated database provisioning.
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-300"
          >
            <div className="font-medium">{formError}</div>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate autoComplete="off">
          <div>
            <label
              htmlFor="admin-username"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Username / Admin Email
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <User className="size-4" />
              </span>
              <input
                id="admin-username"
                type="text"
                autoComplete="off"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }}
                placeholder="admin or developer.pravin666@gmail.com"
                className={`w-full rounded-xl border bg-slate-800/80 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 transition focus:outline-none focus:ring-2 ${
                  fieldErrors.username
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/30"
                    : "border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20"
                }`}
              />
            </div>
            {fieldErrors.username && (
              <p role="alert" className="mt-1 text-xs text-rose-400 font-medium">
                {fieldErrors.username}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Master Password
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="size-4" />
              </span>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••••••"
                className={`w-full rounded-xl border bg-slate-800/80 py-2.5 pl-9 pr-10 text-sm text-white placeholder-slate-500 transition focus:outline-none focus:ring-2 ${
                  fieldErrors.password
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/30"
                    : "border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p role="alert" className="mt-1 text-xs text-rose-400 font-medium">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck className="size-4" />
              <span>{isSubmitting ? "Authenticating Platform Owner…" : "Sign In to Admin Console"}</span>
            </button>
          </div>

          {/* Quick Demo Credentials Assistant */}
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Default Credentials</span>
              <button
                type="button"
                onClick={handleFillDefaults}
                className="font-semibold text-indigo-400 hover:text-indigo-300 underline"
              >
                Fill credentials
              </button>
            </div>
            <div className="mt-1 space-y-0.5 font-mono text-[11px] text-slate-400">
              <div>User: <span className="text-slate-200">admin</span></div>
              <div>Pass: <span className="text-slate-200">Admin@123456</span></div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-400 transition"
            >
              <ArrowLeft className="size-3.5" />
              <span>Return to Standard Store Sign In</span>
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

