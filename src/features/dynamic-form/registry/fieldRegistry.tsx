import type { ComponentType } from "react";
import type { Control, FieldValues } from "react-hook-form";
import type { DynamicFieldProps, FieldType } from "../../../types/form";
import { TextField } from "../fields/TextField";
import { EmailField } from "../fields/EmailField";
import { SelectField } from "../fields/SelectField";
import { CheckboxField } from "../fields/CheckboxField";
import { NativeInputField } from "../fields/NativeInputField";
import { TextareaField } from "../fields/TextareaField";
import { RadioField } from "../fields/RadioField";
import { ToggleField } from "../fields/ToggleField";
import { MultiSelectField } from "../fields/MultiSelectField";
import { FileField } from "../fields/FileField";
import { AutocompleteField } from "../fields/AutocompleteField";

export interface RegistryFieldProps extends DynamicFieldProps {
  control: Control<FieldValues>;
}
export type FieldComponent = ComponentType<RegistryFieldProps>;

const registry: Record<FieldType, FieldComponent> = {
  text: TextField,
  email: EmailField,
  password: NativeInputField,
  number: NativeInputField,
  tel: NativeInputField,
  url: NativeInputField,
  textarea: TextareaField,
  select: SelectField,
  autocomplete: AutocompleteField,
  multiSelect: MultiSelectField,
  radio: RadioField,
  checkbox: CheckboxField,
  toggle: ToggleField,
  date: NativeInputField,
  time: NativeInputField,
  datetime: NativeInputField,
  month: NativeInputField,
  week: NativeInputField,
  color: NativeInputField,
  range: NativeInputField,
  file: FileField,
  hidden: () => null,
};

export function getFieldComponent(type: FieldType): FieldComponent {
  return registry[type];
}
