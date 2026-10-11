import type {
  FieldErrors,
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "url"
  | "textarea"
  | "select"
  | "autocomplete"
  | "multiSelect"
  | "radio"
  | "checkbox"
  | "toggle"
  | "date"
  | "time"
  | "datetime"
  | "month"
  | "week"
  | "color"
  | "range"
  | "file"
  | "hidden";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  parentValue?: string;
}

export interface BaseFieldConfig {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  disabled?: boolean;
  description?: string;
  defaultValue?: unknown;
  colSpan?: 1 | 2 | 3 | 4 | "full";
  readOnly?: boolean;
  visibleWhen?: { field: string; value: string | boolean };
  computed?: {
    dependsOn?: string[];
    calculate: (values: Record<string, unknown>) => number | string;
  };
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: "text";
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
}
export interface EmailFieldConfig extends BaseFieldConfig {
  type: "email";
  placeholder?: string;
}
export interface PasswordFieldConfig extends BaseFieldConfig {
  type: "password";
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
}
export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}
export interface TelFieldConfig extends BaseFieldConfig {
  type: "tel";
  placeholder?: string;
  pattern?: string;
}
export interface UrlFieldConfig extends BaseFieldConfig {
  type: "url";
  placeholder?: string;
}
export interface TextareaFieldConfig extends BaseFieldConfig {
  type: "textarea";
  placeholder?: string;
  rows?: number;
  minLength?: number;
  maxLength?: number;
}
export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select";
  placeholder?: string;
  options: SelectOption[];
  dependsOn?: string | string[];
  loadOptions?: (parentValue: string, values: DynamicFormValues) => Promise<SelectOption[]>;
}
export interface AutocompleteOption {
  id: string;
  label: string;
  description?: string;
  data: Record<string, string | null | undefined>;
}
export interface AutocompleteFieldConfig extends BaseFieldConfig {
  type: "autocomplete";
  placeholder?: string;
  searchOptions: (query: string) => Promise<AutocompleteOption[]>;
  populateFields?: Record<string, string>;
  selectionValueField?: string;
}
export interface MultiSelectFieldConfig extends BaseFieldConfig {
  type: "multiSelect";
  placeholder?: string;
  options: SelectOption[];
  maxSelections?: number;
}
export interface RadioFieldConfig extends BaseFieldConfig {
  type: "radio";
  options: SelectOption[];
  orientation?: "horizontal" | "vertical";
}
export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: "checkbox";
}
export interface ToggleFieldConfig extends BaseFieldConfig {
  type: "toggle";
  onLabel?: string;
  offLabel?: string;
}
export interface DateFieldConfig extends BaseFieldConfig {
  type: "date";
  min?: string;
  max?: string;
}
export interface TimeFieldConfig extends BaseFieldConfig {
  type: "time";
  min?: string;
  max?: string;
}
export interface DateTimeFieldConfig extends BaseFieldConfig {
  type: "datetime";
  min?: string;
  max?: string;
}
export interface MonthFieldConfig extends BaseFieldConfig {
  type: "month";
  min?: string;
  max?: string;
}
export interface WeekFieldConfig extends BaseFieldConfig {
  type: "week";
  min?: string;
  max?: string;
}
export interface ColorFieldConfig extends BaseFieldConfig {
  type: "color";
}
export interface RangeFieldConfig extends BaseFieldConfig {
  type: "range";
  min?: number;
  max?: number;
  step?: number;
}
export interface FileFieldConfig extends BaseFieldConfig {
  type: "file";
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeBytes?: number;
}
export interface HiddenFieldConfig extends BaseFieldConfig {
  type: "hidden";
}

export type FormFieldConfig =
  | TextFieldConfig
  | EmailFieldConfig
  | PasswordFieldConfig
  | NumberFieldConfig
  | TelFieldConfig
  | UrlFieldConfig
  | TextareaFieldConfig
  | SelectFieldConfig
  | AutocompleteFieldConfig
  | MultiSelectFieldConfig
  | RadioFieldConfig
  | CheckboxFieldConfig
  | ToggleFieldConfig
  | DateFieldConfig
  | TimeFieldConfig
  | DateTimeFieldConfig
  | MonthFieldConfig
  | WeekFieldConfig
  | ColorFieldConfig
  | RangeFieldConfig
  | FileFieldConfig
  | HiddenFieldConfig;

export type DynamicFormValues = Record<string, unknown>;

export interface DynamicFieldProps {
  field: FormFieldConfig;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  setValue?: UseFormSetValue<FieldValues>;
}
