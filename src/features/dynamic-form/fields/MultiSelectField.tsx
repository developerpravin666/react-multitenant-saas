import { useId, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Controller, type Control, type FieldValues } from "react-hook-form";
import type { DynamicFieldProps, SelectOption } from "../../../types/form";
import { FormFieldShell } from "../../../components/ui/FormFieldShell";

interface Props extends DynamicFieldProps {
  control: Control<FieldValues>;
}

export function MultiSelectField({ field, control, errors }: Props) {
  if (field.type !== "multiSelect") return null;
  const message =
    typeof errors[field.name]?.message === "string"
      ? String(errors[field.name]?.message)
      : undefined;
  const listboxId = useId();

  return (
    <FormFieldShell
      id={field.id}
      label={field.label}
      description={field.description}
      error={message}
      required={field.required}
    >
      <Controller
        name={field.name}
        control={control}
        render={({ field: controller }) => (
          <MultiSelectControl
            id={listboxId}
            options={field.options}
            value={
              Array.isArray(controller.value)
                ? controller.value.filter(
                    (v): v is string => typeof v === "string",
                  )
                : []
            }
            onChange={controller.onChange}
            placeholder={field.placeholder}
            maxSelections={field.maxSelections}
            disabled={field.disabled}
          />
        )}
      />
    </FormFieldShell>
  );
}

function MultiSelectControl({
  id,
  options,
  value,
  onChange,
  placeholder,
  maxSelections,
  disabled,
}: {
  id: string;
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value);

  const toggle = (valueToToggle: string) => {
    const next = new Set(selected);
    if (next.has(valueToToggle)) next.delete(valueToToggle);
    else if (!maxSelections || next.size < maxSelections)
      next.add(valueToToggle);
    onChange([...next]);
  };

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition-all duration-300 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 dark:border-slate-700 dark:bg-slate-950"
      >
        <span className="flex min-w-0 flex-wrap gap-1.5">
          {value.length === 0 ? (
            <span className="text-slate-400">
              {placeholder ?? "Select options"}
            </span>
          ) : (
            value.map((v) => {
              const label = options.find((o) => o.value === v)?.label ?? v;
              return (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--tenant-secondary)] px-2 py-1 text-xs font-medium text-[var(--tenant-primary)]"
                >
                  {label}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(v);
                      }
                    }}
                  >
                    <X className="size-3" />
                  </span>
                </span>
              );
            })
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-slate-400" aria-hidden />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div role="listbox" aria-multiselectable="true">
            {options.map((option) => {
              const checked = selected.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  disabled={
                    option.disabled ||
                    (!checked &&
                      Boolean(maxSelections && selected.size >= maxSelections))
                  }
                  onClick={() => toggle(option.value)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                >
                  <span
                    className={`grid size-4 place-items-center rounded border ${checked ? "border-[var(--tenant-primary)] bg-[var(--tenant-primary)] text-white" : "border-slate-300 dark:border-slate-600"}`}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
