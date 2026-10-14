import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldValues } from "react-hook-form";
import { LogIn } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ApiError } from "../../services/apiClient";
import { getFieldComponent } from "../dynamic-form/registry/fieldRegistry";
import { createDynamicFormSchema } from "../dynamic-form/validation/schemaFactory";
import { loginFormFields } from "./config/login.form";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [useTenantSlug, setUseTenantSlug] = useState(false);
  const fields = loginFormFields
    .filter((field) => useTenantSlug || field.name !== "tenantSlug")
    .map((field) => useTenantSlug
      ? { ...field, label: field.name === "username" ? "Username" : field.name === "tenantSlug" ? "Tenant slug" : field.label,
          required: true }
      : field);
  const resetMessage = (location.state as { message?: string } | null)?.message;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>({
    resolver: zodResolver(createDynamicFormSchema(fields)),
    defaultValues: { tenantSlug: "", username: "", password: "" },
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname ?? "/";

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = handleSubmit(async (values) => {
    setError("");
    try {
      await login({
        tenantSlug: useTenantSlug ? String(values.tenantSlug ?? "").trim() : undefined,
        username: String(values.username).trim(),
        password: String(values.password),
      });
      navigate(from, { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to sign in. Please try again.");
    }
  });

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-7">
          <div className="mb-4 grid size-11 place-items-center rounded-xl bg-[var(--tenant-primary)] text-white"><LogIn className="size-5" /></div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Sign in with your email or mobile and password. Your store is selected automatically.</p>
        </div>
        <form className="space-y-4" onSubmit={submit} noValidate autoComplete="off">
          {resetMessage && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">{resetMessage}</p>}
          {fields.map((field) => {
            const Field = getFieldComponent(field.type);
            return <Field key={field.id} field={field} register={register} control={control} errors={errors} />;
          })}
          <button type="button" onClick={() => { setUseTenantSlug(!useTenantSlug); setError(""); }} className="text-sm font-medium text-[var(--tenant-primary)] hover:underline">
            {useTenantSlug ? "Use email or mobile instead" : "Use tenant slug and username"}
          </button>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
          <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--tenant-primary)] px-4 py-2.5 font-semibold text-white transition hover:bg-[var(--tenant-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Signing in…" : "Sign in"}</button>
          <div className="flex items-center justify-between text-xs pt-1">
            <Link to="/forgot-password" className="font-medium text-[var(--tenant-primary)] hover:underline">Forgot password?</Link>
            <Link to="/register-tenant" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Register New Store</Link>
          </div>
          <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500 dark:border-slate-800 space-y-2">
            <div>
              <span>New business owner? </span>
              <Link to="/register-tenant" className="font-semibold text-[var(--tenant-primary)] hover:underline">
                Create store workspace
              </Link>
            </div>
            {/* <div>
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition"
              >
                <ShieldCheck className="size-3.5" />
                <span>Product Owner / Platform Sign In</span>
              </Link>
            </div> */}
          </div>
        </form>
      </section>
    </main>
  );
}
