import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Building2, CheckCircle2, ShieldCheck, ArrowRight, Store, User, Mail, Phone, Lock, MapPin } from "lucide-react";

const GST_STATES = [
  { code: "01", name: "01 - Jammu and Kashmir" },
  { code: "02", name: "02 - Himachal Pradesh" },
  { code: "03", name: "03 - Punjab" },
  { code: "04", name: "04 - Chandigarh" },
  { code: "05", name: "05 - Uttarakhand" },
  { code: "06", name: "06 - Haryana" },
  { code: "07", name: "07 - Delhi" },
  { code: "08", name: "08 - Rajasthan" },
  { code: "09", name: "09 - Uttar Pradesh" },
  { code: "10", name: "10 - Bihar" },
  { code: "11", name: "11 - Sikkim" },
  { code: "12", name: "12 - Arunachal Pradesh" },
  { code: "13", name: "13 - Nagaland" },
  { code: "14", name: "14 - Manipur" },
  { code: "15", name: "15 - Mizoram" },
  { code: "16", name: "16 - Tripura" },
  { code: "17", name: "17 - Meghalaya" },
  { code: "18", name: "18 - Assam" },
  { code: "19", name: "19 - West Bengal" },
  { code: "20", name: "20 - Jharkhand" },
  { code: "21", name: "21 - Odisha" },
  { code: "22", name: "22 - Chhattisgarh" },
  { code: "23", name: "23 - Madhya Pradesh" },
  { code: "24", name: "24 - Gujarat" },
  { code: "26", name: "26 - Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "27 - Maharashtra" },
  { code: "29", name: "29 - Karnataka" },
  { code: "30", name: "30 - Goa" },
  { code: "31", name: "31 - Lakshadweep" },
  { code: "32", name: "32 - Kerala" },
  { code: "33", name: "33 - Tamil Nadu" },
  { code: "34", name: "34 - Puducherry" },
  { code: "35", name: "35 - Andaman and Nicobar Islands" },
  { code: "36", name: "36 - Telangana" },
  { code: "37", name: "37 - Andhra Pradesh" },
  { code: "38", name: "38 - Ladakh" },
  { code: "97", name: "97 - Other Territory" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function RegisterTenantPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugModified, setSlugModified] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerMobile, setOwnerMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [stateCode, setStateCode] = useState("23"); // Default Maharashtra
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registeredData, setRegisteredData] = useState<{ name: string; slug: string; email: string } | null>(null);

  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    clearFieldError("name");
    if (!slugModified) {
      const generatedSlug = slugify(val);
      setSlug(generatedSlug);
      if (generatedSlug) clearFieldError("slug");
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugModified(true);
    setSlug(slugify(val));
    clearFieldError("slug");
  };

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setGstin(clean);
    clearFieldError("gstin");
    if (clean.length >= 2 && /^\d{2}/.test(clean)) {
      const code = clean.substring(0, 2);
      if (GST_STATES.some((s) => s.code === code)) {
        setStateCode(code);
        clearFieldError("stateCode");
      }
    }
  };

  const validateFields = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Store / Business Name is required.";
    } else if (name.trim().length < 2) {
      errors.name = "Business Name must be at least 2 characters.";
    }

    if (!slug.trim()) {
      errors.slug = "Store slug is required.";
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.trim())) {
      errors.slug = "Store slug must contain only lowercase letters, numbers, and hyphens.";
    }

    if (!stateCode.trim()) {
      errors.stateCode = "Please select a GST state.";
    }

    if (!ownerEmail.trim()) {
      errors.ownerEmail = "Notification Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
      errors.ownerEmail = "Please enter a valid email address.";
    }

    if (ownerMobile.trim() && !/^\d{10}$/.test(ownerMobile.trim())) {
      errors.ownerMobile = "Mobile number must be a valid 10-digit number.";
    }

    if (gstin.trim()) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(gstin.trim())) {
        errors.gstin = "Invalid GSTIN format (e.g. 27AABCU9603R1ZM).";
      }
    }

    if (password && password.length < 8) {
      errors.password = "Password must be at least 8 characters long.";
    }

    if (password && password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    return errors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const errors = validateFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fix the validation errors below before submitting.");
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
      const apiEndpoint = `${baseUrl.replace(/\/$/, "")}/tenants/register`;

      await axios.post(apiEndpoint, {
        name: name.trim(),
        slug: slug.trim(),
        ownerName: ownerName.trim() || undefined,
        ownerEmail: ownerEmail.trim() || undefined,
        ownerMobile: ownerMobile.trim() || undefined,
        password: password || undefined,
        stateCode: stateCode || undefined,
        gstin: gstin.trim() || undefined,
        address: address.trim() || undefined,
      });

      setRegisteredData({
        name: name.trim(),
        slug: slug.trim(),
        email: ownerEmail.trim(),
      });
      setSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
          err.response?.data?.detail ||
          err.response?.data?.title ||
          "Registration failed. Please check your details and try again."
        );
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success && registeredData) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="size-9" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Registration Submitted!</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Thank you for registering <strong>{registeredData.name}</strong>.
            </p>

            <div className="mt-6 w-full rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-left dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-200">What happens next?</h4>
              <ul className="mt-2 space-y-2 text-xs text-emerald-800 dark:text-emerald-300">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>
                    A confirmation email has been dispatched to <strong>{registeredData.email}</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>
                    Platform administration has received your request. Once approved, your dedicated database schema will be provisioned automatically.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>
                    You will receive an activation notification email. You can then log in with your store slug{" "}
                    <code className="rounded bg-emerald-200/60 px-1 py-0.5 font-mono font-bold dark:bg-emerald-900/60">
                      {registeredData.slug}
                    </code>
                    .
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8 flex w-full flex-col gap-3">
              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700"
              >
                <span>Go to Sign In</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-md">
            <Building2 className="size-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Register Your Store</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Set up your isolated cloud accounting and inventory workspace in just a few minutes.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-6">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              >
                {error}
              </div>
            )}

            {/* Store Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
                <Store className="size-4 text-blue-600" />
                <span>Store Information</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Store / Business Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    aria-invalid={Boolean(fieldErrors.name)}
                    placeholder="e.g. ABC Electronics"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className={`mt-1.5 w-full rounded-xl border ${fieldErrors.name
                      ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:focus:ring-rose-950"
                      : "border-slate-200 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-950"
                      } px-3.5 py-2.5 text-sm text-slate-900 outline-none transition dark:text-white`}
                  />
                  {fieldErrors.name && (
                    <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Store Slug (Identifier) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    aria-invalid={Boolean(fieldErrors.slug)}
                    placeholder="e.g. abc-electronics"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className={`mt-1.5 w-full rounded-xl border ${fieldErrors.slug
                      ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:focus:ring-rose-950"
                      : "border-slate-200 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-950"
                      } px-3.5 py-2.5 text-sm font-mono text-slate-900 outline-none transition dark:text-white`}
                  />
                  {fieldErrors.slug ? (
                    <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {fieldErrors.slug}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Your login identifier: <code>app/{slug || "your-slug"}</code>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GST State Code <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={stateCode}
                    aria-invalid={Boolean(fieldErrors.stateCode)}
                    onChange={(e) => {
                      setStateCode(e.target.value);
                      clearFieldError("stateCode");
                    }}
                    className={`mt-1.5 w-full rounded-xl border ${fieldErrors.stateCode
                      ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20"
                      : "border-slate-200 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                      } px-3.5 py-2.5 text-sm text-slate-900 outline-none transition dark:text-white`}
                  >
                    {GST_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.stateCode && (
                    <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {fieldErrors.stateCode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GSTIN Number (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    aria-invalid={Boolean(fieldErrors.gstin)}
                    placeholder="e.g. 27AABCU9603R1ZM"
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    className={`mt-1.5 w-full rounded-xl border ${fieldErrors.gstin
                      ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20"
                      : "border-slate-200 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                      } px-3.5 py-2.5 text-sm font-mono uppercase text-slate-900 outline-none transition dark:text-white`}
                  />
                  {fieldErrors.gstin && (
                    <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {fieldErrors.gstin}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Store Counter Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shop 123, Main Road, Indore - 452001"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Owner & Account Information */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
                <User className="size-4 text-blue-600" />
                <span>Store Owner Credentials</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Owner Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABC XYZ"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Contact Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    aria-invalid={Boolean(fieldErrors.ownerMobile)}
                    placeholder="e.g. 9876543210"
                    value={ownerMobile}
                    onChange={(e) => {
                      setOwnerMobile(e.target.value.replace(/\D/g, ""));
                      clearFieldError("ownerMobile");
                    }}
                    className={`mt-1.5 w-full rounded-xl border ${fieldErrors.ownerMobile
                      ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20"
                      : "border-slate-200 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                      } px-3.5 py-2.5 text-sm text-slate-900 outline-none transition dark:text-white`}
                  />
                  {fieldErrors.ownerMobile && (
                    <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {fieldErrors.ownerMobile}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notification Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  aria-invalid={Boolean(fieldErrors.ownerEmail)}
                  placeholder="owner@abcelectronics.in"
                  value={ownerEmail}
                  onChange={(e) => {
                    setOwnerEmail(e.target.value);
                    clearFieldError("ownerEmail");
                  }}
                  className={`mt-1.5 w-full rounded-xl border ${fieldErrors.ownerEmail
                    ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20"
                    : "border-slate-200 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                    } px-3.5 py-2.5 text-sm text-slate-900 outline-none transition dark:text-white`}
                />
                {fieldErrors.ownerEmail ? (
                  <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.ownerEmail}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Your thank you confirmation and activation approval link will be sent here.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    autoComplete="off"
                    aria-invalid={Boolean(fieldErrors.password)}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError("password");
                    }}
                    className={`mt-1.5 w-full rounded-xl border ${fieldErrors.password
                      ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20"
                      : "border-slate-200 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                      } px-3.5 py-2.5 text-sm text-slate-900 outline-none transition dark:text-white`}
                  />
                  {fieldErrors.password && (
                    <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Confirm Password
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
                    className={`mt-1.5 w-full rounded-xl border ${fieldErrors.confirmPassword
                      ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20"
                      : "border-slate-200 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                      } px-3.5 py-2.5 text-sm text-slate-900 outline-none transition dark:text-white`}
                  />
                  {fieldErrors.confirmPassword && (
                    <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
              <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Isolated Multi-Tenant Security</span>
              </div>
              <p className="mt-1">
                Your business data will reside in an isolated PostgreSQL schema with automatic statutory GST calculation, double-entry financial ledgers, and IMEI tracking.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? (
                <span>Submitting registration...</span>
              ) : (
                <>
                  <span>Submit Store Registration</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>

            <div className="text-center text-xs text-slate-600 dark:text-slate-400">
              Already have an approved account?{" "}
              <Link to="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                Sign In
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

