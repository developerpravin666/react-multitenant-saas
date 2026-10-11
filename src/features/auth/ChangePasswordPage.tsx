import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldValues, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { ApiError } from "../../services/apiClient";
import { getFieldComponent } from "../dynamic-form/registry/fieldRegistry";
import { useAuth } from "./AuthContext";
import { authService } from "./auth.service";
import { changePasswordFields } from "./config/change-password.form";
import { getPasswordValidationErrors } from "./passwordValidation";

const passwordSchema = z.string().superRefine((value, context) => {
  for (const message of getPasswordValidationErrors(value)) {
    context.addIssue({ code: "custom", message });
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm new password is required."),
}).superRefine((values, context) => {
  if (values.newPassword && values.newPassword !== values.confirmPassword) {
    context.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "The new passwords do not match.",
    });
  }
  if (values.newPassword && values.newPassword === values.currentPassword) {
    context.addIssue({
      code: "custom",
      path: ["newPassword"],
      message: "Choose a password different from your current password.",
    });
  }
});

export function ChangePasswordPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>({
    resolver: zodResolver(changePasswordSchema) as unknown as Resolver<FieldValues>,
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError("");
    try {
      await authService.changePassword(String(values.currentPassword), String(values.newPassword));
      // Changing a password invalidates refresh credentials. Clear the local session too.
      await logout().catch(() => undefined);
      navigate("/login", { replace: true, state: { message: "Password changed. Sign in with your new password." } });
    } catch (cause) {
      setSubmitError(cause instanceof ApiError ? cause.message : "Unable to change your password. Please try again.");
    }
  });

  return (
    <section className="mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Change password</h1>
      <p className="mb-6 mt-2 text-sm text-slate-600 dark:text-slate-300">Enter your current password and choose a new one.</p>
      <form className="space-y-4" onSubmit={submit} noValidate autoComplete="off">
        {changePasswordFields.map((field) => {
          const Field = getFieldComponent(field.type);
          return <Field key={field.id} field={field} register={register} control={control} errors={errors} />;
        })}
        {submitError && <p role="alert" className="whitespace-pre-line rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{submitError}</p>}
        <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? "Updating…" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
