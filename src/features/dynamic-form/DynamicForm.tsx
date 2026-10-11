import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type FieldValues } from "react-hook-form";
import type { FormFieldConfig, SelectFieldConfig, SelectOption } from "../../types/form";
import { Button } from "../../components/ui/Button";
import { getFieldComponent } from "./registry/fieldRegistry";
import { createDynamicFormSchema } from "./validation/schemaFactory";

interface DynamicFormProps {
  title: string;
  description?: string;
  fields: FormFieldConfig[];
  onSubmit: (values: FieldValues) => Promise<void> | void;
  initialValues?: FieldValues;
  submitLabel?: string;
  onCancel?: () => void;
  /** Number of form columns at desktop widths. Defaults to two. */
  columnsPerRow?: 2 | 3 | 4;
  children?: ReactNode;
}

function getDependencies(field: SelectFieldConfig): string[] {
  return Array.isArray(field.dependsOn) ? field.dependsOn : field.dependsOn ? [field.dependsOn] : [];
}

function createDefaultValues(fields: FormFieldConfig[]): FieldValues {
  return Object.fromEntries(
    fields.map((field) => {
      if (field.defaultValue !== undefined)
        return [field.name, field.defaultValue];
      if (field.type === "checkbox" || field.type === "toggle")
        return [field.name, false];
      if (field.type === "multiSelect") return [field.name, []];
      return [field.name, ""];
    }),
  );
}

export function DynamicForm({
  title,
  description,
  fields,
  onSubmit,
  initialValues,
  submitLabel = "Submit",
  onCancel,
  columnsPerRow = 2,
  children,
}: DynamicFormProps) {
  const columnClass = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  }[columnsPerRow];
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dependentOptions, setDependentOptions] = useState<
    Record<string, SelectOption[]>
  >({});
  const [loadingDependentOptions, setLoadingDependentOptions] = useState<
    Record<string, boolean>
  >({});

  const schema = useMemo(
    () =>
      createDynamicFormSchema(
        fields.map((field) =>
          field.type === "select" && field.loadOptions
            ? { ...field, options: dependentOptions[field.name] ?? [] }
            : field,
        ),
      ),
    [dependentOptions, fields],
  );
  const defaultValues = useMemo(
    () => ({ ...createDefaultValues(fields), ...initialValues }),
    [fields, initialValues],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const values = useWatch({ control });
  const previousValues = useRef(values);
  const computedDependencies = useRef<Record<string, unknown[]>>({});
  const dependencyKey = fields
    .filter((field) => field.type === "select" && field.dependsOn)
    .map((field) =>
      field.type === "select"
        ? `${field.name}:${getDependencies(field).map((name) => String(values[name] ?? "")).join(":")}`
        : "",
    )
    .join("|");

  useEffect(() => {
    for (const field of fields) {
      if (!field.computed) continue;
      if (field.computed.dependsOn) {
        const dependencies = field.computed.dependsOn.map((name) => values[name]);
        const previous = computedDependencies.current[field.name];
        computedDependencies.current[field.name] = dependencies;
        if (previous && dependencies.every((value, index) => value === previous[index])) continue;
        if (!previous && values[field.name] !== "" && values[field.name] != null) continue;
      }
      const calculated = field.computed.calculate(values);
      if (values[field.name] !== calculated) {
        setValue(field.name, calculated, { shouldValidate: true });
      }
    }
  }, [fields, setValue, values]);

  useEffect(() => {
    for (const field of fields) {
      if (field.type !== "select" || !field.dependsOn) continue;
      if (getDependencies(field).some((name) => previousValues.current[name] !== values[name])) {
        setValue(field.name, "", { shouldValidate: true, shouldDirty: true });
      }
    }
    previousValues.current = values;
  }, [fields, setValue, values]);

  useEffect(() => {
    let cancelled = false;
    for (const field of fields) {
      if (field.type !== "select" || !field.dependsOn || !field.loadOptions)
        continue;
      const dependencies = getDependencies(field);
      const formValues = getValues();
      const parentValue = String(formValues[dependencies[0] ?? ""] ?? "");
      if (dependencies.some((name) => !formValues[name])) {
        setDependentOptions((current) => ({ ...current, [field.name]: [] }));
        setLoadingDependentOptions((current) => ({ ...current, [field.name]: false }));
        continue;
      }
      setLoadingDependentOptions((current) => ({ ...current, [field.name]: true }));
      void field.loadOptions(parentValue, formValues)
        .then((options) => {
          if (!cancelled)
            setDependentOptions((current) => ({ ...current, [field.name]: options }));
        })
        .catch(() => {
          if (!cancelled)
            setDependentOptions((current) => ({ ...current, [field.name]: [] }));
        })
        .finally(() => {
          if (!cancelled)
            setLoadingDependentOptions((current) => ({ ...current, [field.name]: false }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [dependencyKey, fields, getValues]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "The form could not be submitted. Please try again.",
      );
    }
  });

  return (
    <section
      aria-labelledby="dynamic-form-title"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <h1
            id="dynamic-form-title"
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            {title}
          </h1>
          {onCancel ? (
            <button
              type="button"
              aria-label="Back to list"
              title="Back to list"
              onClick={onCancel}
              disabled={isSubmitting}
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={18} />
            </button>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>

      <form onSubmit={submit} noValidate autoComplete="off" className="space-y-4">
        <div className={`grid grid-cols-1 gap-3 ${columnClass}`}>
          {fields.filter((field) =>
            !field.visibleWhen
            || String(values[field.visibleWhen.field] ?? "") === String(field.visibleWhen.value),
          ).map((field) => {
            const Component = getFieldComponent(field.type);
            const dependencies = field.type === "select" ? getDependencies(field) : [];
            const missingDependency = dependencies.find((name) => !values[name]);
            const renderedField =
              field.type === "select" && field.dependsOn
                ? {
                    ...field,
                    disabled:
                      field.disabled ||
                      Boolean(missingDependency) ||
                      loadingDependentOptions[field.name],
                    placeholder: missingDependency
                      ? `Select ${fields.find((candidate) => candidate.name === missingDependency)?.label.toLowerCase() ?? "a parent option"} first`
                      : loadingDependentOptions[field.name]
                        ? "Loading options..."
                        : field.placeholder,
                    options: field.loadOptions
                      ? dependentOptions[field.name] ?? []
                      : !missingDependency
                        ? field.options.filter(
                            (option) =>
                              option.parentValue ===
                              String(values[dependencies[0] ?? ""]),
                          )
                        : [],
                  }
                : field;

            return (
              <div
                key={field.id}
                className={
                  field.colSpan === "full" ||
                    field.type === "checkbox" ||
                    field.type === "toggle"
                    ? "md:col-span-full"
                    : field.colSpan === 1
                      ? "md:col-span-1"
                      : field.colSpan === 2
                        ? "md:col-span-2"
                        : field.colSpan === 3
                          ? "md:col-span-3"
                          : field.colSpan === 4
                            ? "md:col-span-4"
                    : ""
                }
              >
                <Component
                  field={renderedField}
                  register={register}
                  control={control}
                  errors={errors}
                  setValue={setValue}
                />
              </div>
            );
          })}
        </div>

        {children}

        {submitError ? (
          <div
            role="alert"
            className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              onCancel
                ? onCancel()
                : (reset(defaultValues), setSubmitError(null))
            }
            disabled={isSubmitting}
          >
            {onCancel ? "Cancel" : "Reset"}
          </Button>

          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? "Submitting..." : submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}
