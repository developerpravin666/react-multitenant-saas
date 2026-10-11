import type {
  FieldErrors,
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import type { FormFieldConfig } from "../../../types/form";

export interface DynamicFieldProps {
  field: FormFieldConfig;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  setValue?: UseFormSetValue<FieldValues>;
}
