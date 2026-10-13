import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <p className="text-6xl font-bold text-[var(--tenant-primary)]">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          The page you requested does not exist. Check the address or return to the home page.
        </p>
        <Link
          to="/"
          replace
          className="mt-6 inline-flex rounded-lg bg-[var(--tenant-primary)] px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tenant-primary)]"
        >
          Go to home
        </Link>
      </section>
    </main>
  );
}
