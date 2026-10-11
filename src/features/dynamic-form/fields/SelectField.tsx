import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Controller, type Control, type FieldValues } from "react-hook-form";
import { FormFieldShell } from "../../../components/ui/FormFieldShell";
import type { DynamicFieldProps } from "./fieldTypes";

type CompatibleProps = DynamicFieldProps & { control: Control<FieldValues> };

export function SelectField({ field, control, errors }: CompatibleProps) {
  if (field.type !== "select") return null;

  const error = errors[field.name]?.message;
  const message = typeof error === "string" ? error : undefined;

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
          <SearchableSelect
            id={field.id}
            options={field.options}
            value={typeof controller.value === "string" ? controller.value : ""}
            onChange={controller.onChange}
            onBlur={controller.onBlur}
            placeholder={field.placeholder ?? "Select an option"}
            disabled={field.disabled}
            invalid={Boolean(message)}
          />
        )}
      />
    </FormFieldShell>
  );
}

function SearchableSelect({
  id,
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  invalid,
}: {
  id: string;
  options: { value: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
  disabled?: boolean;
  invalid: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return options.filter((option) => option.label.toLocaleLowerCase().includes(normalized));
  }, [options, query]);
  const selected = options.find((option) => option.value === value);

  const close = () => {
    setOpen(false);
    setQuery("");
    onBlur();
  };
  const choose = (option: (typeof options)[number]) => {
    if (option.disabled) return;
    onChange(option.value);
    close();
  };

  return (
    <div className="relative">
      <div className={`flex w-full items-center rounded-lg border bg-white shadow-sm focus-within:border-[var(--tenant-primary)] focus-within:ring-2 focus-within:ring-[var(--tenant-primary)]/20 dark:bg-slate-950 ${invalid ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}>
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={open && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
          aria-invalid={invalid}
          autoComplete="off"
          disabled={disabled}
          value={open ? query : selected?.label ?? ""}
          placeholder={open ? "Search options..." : placeholder}
          onFocus={() => { setQuery(""); setActiveIndex(0); setOpen(true); }}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }}
          onBlur={(event) => {
            if (!event.currentTarget.parentElement?.parentElement?.contains(event.relatedTarget as Node | null)) close();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (filtered[activeIndex]) choose(filtered[activeIndex]);
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              setOpen(false);
              setQuery("");
            }
          }}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100"
        />
        <button type="button" tabIndex={-1} disabled={disabled} aria-label="Toggle options" onMouseDown={(event) => event.preventDefault()} onClick={() => { setOpen((current) => !current); setQuery(""); setActiveIndex(0); }} className="px-3 text-slate-400">
          <ChevronDown aria-hidden className="size-4" />
        </button>
      </div>
      {open && (
        <div id={`${id}-listbox`} role="listbox" className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {filtered.length ? filtered.map((option, index) => (
            <button
              id={`${id}-option-${index}`}
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm disabled:opacity-50 ${index === activeIndex ? "bg-slate-100 dark:bg-slate-800" : ""} ${option.value === value ? "font-medium text-[var(--tenant-primary)]" : "text-slate-800 dark:text-slate-100"}`}
            >
              {option.label}
            </button>
          )) : <p className="px-3 py-2 text-sm text-slate-500">No options found</p>}
        </div>
      )}
    </div>
  );
}
