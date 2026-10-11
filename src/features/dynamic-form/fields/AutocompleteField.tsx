import { useEffect, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { FormFieldShell } from "../../../components/ui/FormFieldShell";
import type { AutocompleteOption } from "../../../types/form";
import type { DynamicFieldProps } from "./fieldTypes";

export function AutocompleteField(props: DynamicFieldProps) {
  if (props.field.type !== "autocomplete" || !props.setValue) return null;
  return <AutocompleteFieldControl {...props} field={props.field} setValue={props.setValue} />;
}

function AutocompleteFieldControl({ field, setValue, errors }: DynamicFieldProps & { field: Extract<DynamicFieldProps["field"], { type: "autocomplete" }>; setValue: NonNullable<DynamicFieldProps["setValue"]> }) {

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const validationError = errors[field.name]?.message;
  const validationMessage = typeof validationError === "string" ? validationError : undefined;

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setOptions([]);
      setLoading(false);
      setHasSearched(false);
      setError(null);
      return;
    }

    setOptions([]);
    setHasSearched(false);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void field.searchOptions(term)
        .then((matches) => {
          if (!cancelled) {
            setOptions(matches);
            setHasSearched(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOptions([]);
            setHasSearched(true);
            setError("Customer search is temporarily unavailable. You can still enter a new customer below.");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [field.searchOptions, query]);

  const choose = (option: (typeof options)[number]) => {
    for (const [targetField, sourceField] of Object.entries(field.populateFields ?? {})) {
      setValue(targetField, option.data[sourceField] ?? "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    setQuery(`${option.label}${option.description ? ` · ${option.description}` : ""}`);
    setValue(field.name, option.data[field.selectionValueField ?? "id"] ?? option.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setOpen(false);
  };

  return (
    <FormFieldShell
      id={field.id}
      label={field.label}
      description={field.description}
      error={validationMessage}
      required={field.required}
    >
      <div className="relative">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            id={field.id}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && options.length > 0}
            aria-controls={`${field.id}-options`}
            aria-activedescendant={open && options[activeIndex] ? `${field.id}-option-${activeIndex}` : undefined}
            aria-invalid={Boolean(validationMessage)}
            autoComplete="off"
            disabled={field.disabled}
            placeholder={field.placeholder ?? "Type a customer name or mobile number"}
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              setOpen(true);
              setActiveIndex(0);
              for (const targetField of Object.keys(field.populateFields ?? {})) {
                setValue(targetField, "", {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
              setValue(field.name, value, { shouldDirty: true, shouldValidate: true });
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && options.length) {
                event.preventDefault();
                setActiveIndex((current) => Math.min(current + 1, options.length - 1));
              } else if (event.key === "ArrowUp" && options.length) {
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, 0));
              } else if (event.key === "Enter" && open && options[activeIndex]) {
                event.preventDefault();
                choose(options[activeIndex]);
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            onBlur={(event) => {
              if (!event.currentTarget.parentElement?.parentElement?.contains(event.relatedTarget as Node | null))
                setOpen(false);
            }}
            className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-100 ${
              validationMessage
                ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20"
                : "border-slate-300 focus:border-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]/20 dark:border-slate-700"
            }`}
          />
        </div>
        {open && query.trim().length >= 2 && (
          <div id={`${field.id}-options`} role="listbox" className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {loading ? <p className="px-3 py-2 text-sm text-slate-500">Searching customers…</p> : null}
            {!loading && error ? <p role="status" className="px-3 py-2 text-sm text-amber-700 dark:text-amber-300">{error}</p> : null}
            {!loading && !error && options.map((option, index) => (
              <button
                id={`${field.id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={false}
                key={option.id}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800 ${index === activeIndex ? "bg-slate-100 dark:bg-slate-800" : ""}`}
              >
                <UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="block font-medium">{option.label}</span>
                  {option.description ? <span className="block text-xs text-slate-500">{option.description}</span> : null}
                </span>
              </button>
            ))}
            {!loading && !error && hasSearched && options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-500">No saved customer found. Enter the new customer details below.</p>
            ) : null}
          </div>
        )}
        <p className="mt-1 text-xs text-slate-500">Select a saved customer to fill in their contact details. If there is no match, enter a new customer name here and fill in the remaining details below.</p>
      </div>
    </FormFieldShell>
  );
}
