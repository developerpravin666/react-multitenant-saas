import { Plus, X } from "lucide-react";

import { useState } from "react";

interface ProductCrudLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  form?: React.ReactNode;
  addButtonLabel?: string;
}

export function ProductCrudLayout({
  title,
  description,
  children,
  form,
  addButtonLabel = "Add New",
}: ProductCrudLayoutProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div
        className="
          flex
          flex-col
          gap-2

          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <h1
            className="
              text-xl
              font-semibold
              tracking-tight
              text-slate-900

              dark:text-slate-100
            "
          >
            {title}
          </h1>

          {description && (
            <p
              className="
                mt-0.5
                text-xs
                text-slate-500

                dark:text-slate-400
              "
            >
              {description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="
            inline-flex
            items-center
            justify-center
            gap-2
            rounded-lg
            bg-[var(--tenant-primary)]
            px-3
            py-2
            text-sm
            font-semibold
            text-white
            shadow-sm
            transition-all
            duration-300

            hover:opacity-90
          "
        >
          <Plus size={17} />

          {addButtonLabel}
        </button>
      </div>

      {showForm && form && (
        <div
          className="
            rounded-xl
            border
            border-slate-200
            bg-white
            p-4
            shadow-sm

            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <div
            className="
              mb-3
              flex
              items-center
              justify-between
            "
          >
            <h2 className="font-semibold">{addButtonLabel}</h2>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
              className="
                rounded-lg
                p-2
                text-slate-500

                hover:bg-slate-100

                dark:hover:bg-slate-800
              "
            >
              <X size={18} />
            </button>
          </div>

          {form}
        </div>
      )}

      {children}
    </div>
  );
}
