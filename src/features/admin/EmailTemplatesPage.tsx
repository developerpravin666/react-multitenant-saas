import { Link } from "react-router-dom";
import { Mail, ArrowLeft, ShieldCheck, ExternalLink } from "lucide-react";
import { RegistrationEmailTemplateEditor } from "./RegistrationEmailTemplateEditor";
import { APP_ROUTES } from "../../config/routes";

export function EmailTemplatesPage() {
  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={APP_ROUTES.admin.dashboard}
            className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            title="Back to Platform Overview"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Administration Console
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-xs font-medium text-slate-500">Communications</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Welcome Email Template Management
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={APP_ROUTES.admin.pendingApprovals}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <ShieldCheck className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Store Approvals Queue</span>
          </Link>

          <Link
            to="/register-tenant"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <span>Public Registration Form</span>
            <ExternalLink className="size-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Embedded High-Fidelity Template Editor */}
      <RegistrationEmailTemplateEditor />
    </div>
  );
}

