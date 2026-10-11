import { getPasswordValidationErrors } from "./passwordValidation";

export function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;
  const errors = getPasswordValidationErrors(password);
  return errors.length ? (
    <ul className="mt-1 space-y-0.5 text-xs text-rose-600 dark:text-rose-300" aria-live="polite">
      {errors.map((error) => <li key={error}>{error}</li>)}
    </ul>
  ) : (
    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300" role="status">Password meets all requirements.</p>
  );
}
