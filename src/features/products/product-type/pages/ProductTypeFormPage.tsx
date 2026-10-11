import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../../../components/ui/Button";
import { ResourceFormPage } from "../../../shared/ResourceCrudPages";
import { productTypeResource } from "./productTypeResource";

export function ProductTypeFormPage({ mode }: { mode: "create" | "edit" }) {
  if (mode === "create") return <ProductTypeBulkForm />;
  return <ResourceFormPage {...productTypeResource} mode={mode} />;
}

type ProductTypeEntry = { name: string; description: string; isActive: boolean };
const emptyEntry = (): ProductTypeEntry => ({ name: "", description: "", isActive: true });
const productTypeEntriesSchema = z.object({
  entries: z.array(z.object({
    name: z.string()
      .refine((name) => name.trim().length > 0, "Product Type is required.")
      .max(120, "Product Type must be 120 characters or fewer."),
    description: z.string(),
    isActive: z.boolean(),
  })).min(1, "Add at least one product type."),
});

function ProductTypeBulkForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof productTypeEntriesSchema>>({
    resolver: zodResolver(productTypeEntriesSchema),
    defaultValues: { entries: [emptyEntry()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "entries" });

  const submit = handleSubmit(async ({ entries }) => {
    setError(null);
    try {
      for (const entry of entries) await productTypeResource.api.create({ ...entry, name: entry.name.trim() });
      navigate(productTypeResource.listPath);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create product types.");
    }
  });

  const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add Product Types</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add one or more product types in a single form.</p>
      </div>
      <form onSubmit={submit} noValidate className="space-y-5">
        {fields.map((entry, index) => (
          <fieldset key={entry.id} className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-2 dark:border-slate-700">
            <legend className="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Product Type {index + 1}</legend>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Name <span className="text-red-500">*</span></span>
              <input className={inputClass} {...register(`entries.${index}.name`)} placeholder="Example: Mobile" aria-invalid={Boolean(errors.entries?.[index]?.name)} />
              {errors.entries?.[index]?.name?.message ? <span role="alert" className="text-xs text-red-600">{errors.entries[index]?.name?.message}</span> : null}
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Description</span>
              <input className={inputClass} {...register(`entries.${index}.description`)} placeholder="Optional description" />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" {...register(`entries.${index}.isActive`)} /> Active
            </label>
            {fields.length > 1 ? <div className="flex justify-end"><Button type="button" variant="secondary" aria-label={`Remove product type ${index + 1}`} onClick={() => remove(index)}><Trash2 size={16} /> Remove</Button></div> : null}
          </fieldset>
        ))}
        {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={() => navigate(productTypeResource.listPath)} disabled={isSubmitting}>Cancel</Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => append(emptyEntry())} disabled={isSubmitting}><Plus size={16} /> Add another</Button>
            <Button type="submit" isLoading={isSubmitting}>{isSubmitting ? "Creating…" : `Create ${fields.length} Product Type${fields.length === 1 ? "" : "s"}`}</Button>
          </div>
        </div>
      </form>
    </section>
  );
}
