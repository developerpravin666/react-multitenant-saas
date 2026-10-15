import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Plus, Sparkles } from "lucide-react";
import { areVariantsEquivalent } from "../services/invoiceMasterResolver";

export interface MasterOption {
  id: string;
  name: string;
  code?: string;
  brandId?: string;
}

interface InlineMasterFieldProps {
  value: string;
  options: MasterOption[];
  onChange: (newValue: string, isNew: boolean, matchedId?: string) => void;
  placeholder?: string;
  className?: string;
  typeLabel?: string; // "Brand", "Model", "Variant", "Color"
}

function findMatchingOption(options: MasterOption[], value: string, typeLabel: string): MasterOption | undefined {
  const cleanVal = (value || "").trim().toLowerCase();
  if (!cleanVal) return undefined;

  // 1. Exact case-insensitive match
  const exact = options.find((opt) => opt.name.trim().toLowerCase() === cleanVal);
  if (exact) return exact;

  // 2. Variant canonical equivalence (e.g. 8+128G matches 8+128GB, 4+64 matches 4+64GB)
  if (typeLabel.toLowerCase() === "variant") {
    const varMatch = options.find((opt) => areVariantsEquivalent(opt.name, value));
    if (varMatch) return varMatch;
  }

  // 3. Brand synonyms (e.g. iPhone matches Apple)
  if (typeLabel.toLowerCase() === "brand") {
    if (cleanVal === "iphone" || cleanVal === "apple") {
      const appleMatch = options.find((b) => /^(apple|iphone)$/i.test(b.name.trim()));
      if (appleMatch) return appleMatch;
    }
    if (cleanVal.includes("tecno") || cleanVal.includes("techno")) {
      const tecnoMatch = options.find((b) => /^(tecno|techno)$/i.test(b.name.trim()));
      if (tecnoMatch) return tecnoMatch;
    }
  }

  return undefined;
}

export function InlineMasterField({
  value,
  options,
  onChange,
  placeholder = "Enter or select…",
  className = "",
  typeLabel = "Item",
}: InlineMasterFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine if the current typed value matches any existing database option
  const cleanVal = (value || "").trim().toLowerCase();
  const matched = findMatchingOption(options, value, typeLabel);
  const isNew = Boolean(cleanVal && !matched);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (text: string) => {
    const found = findMatchingOption(options, text, typeLabel);
    onChange(text, Boolean(text.trim() && !found), found?.id);
  };

  const handleSelectOption = (opt: MasterOption) => {
    onChange(opt.name, false, opt.id);
    setIsOpen(false);
  };

  const filteredOptions = cleanVal
    ? options.filter((opt) =>
        opt.name.toLowerCase().includes(cleanVal)
      )
    : options;

  return (
    <div ref={containerRef} className={`relative flex items-center ${className}`}>
      <div className="relative w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border bg-white py-1.5 pl-2 pr-12 text-xs font-semibold outline-none transition focus:ring-1 dark:bg-slate-800 ${
            isNew
              ? "border-amber-300 text-amber-900 focus:border-amber-500 focus:ring-amber-500/20 dark:border-amber-700 dark:text-amber-200"
              : matched
              ? "border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700 dark:text-white"
              : "border-slate-200 text-slate-600 focus:border-indigo-500 dark:border-slate-700 dark:text-slate-300"
          }`}
        />

        {/* Status Pill Badge & Dropdown Trigger */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {cleanVal && (
            <span
              className={`rounded px-1 py-0.5 text-[9px] font-bold ${
                isNew
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
              title={isNew ? `New ${typeLabel} - will be created in database` : `Matched existing ${typeLabel} in database`}
            >
              {isNew ? "NEW" : "DB"}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            title={`Select existing ${typeLabel} from database`}
          >
            <ChevronDown className="size-3" />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-full min-w-[180px] overflow-auto rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Database {typeLabel}s ({options.length})
          </div>

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = opt.name.toLowerCase() === cleanVal;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                    isSelected
                      ? "bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <span className="truncate">{opt.name}</span>
                  {isSelected && <Check className="size-3 shrink-0 text-indigo-600 dark:text-indigo-400" />}
                </button>
              );
            })
          ) : (
            <div className="px-2.5 py-2 text-center text-[11px] text-slate-400">
              No matching {typeLabel} found
            </div>
          )}

          {cleanVal && isNew && (
            <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-700">
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Sparkles className="size-3 shrink-0" />
                <span>Will create "{value}" as new {typeLabel}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

