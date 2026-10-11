export const passwordRequirements = [
  { message: "Password must be at least 8 characters long.", test: (value: string) => value.length >= 8 },
  { message: "Password must contain at least one uppercase letter.", test: (value: string) => /[A-Z]/.test(value) },
  { message: "Password must contain at least one lowercase letter.", test: (value: string) => /[a-z]/.test(value) },
  { message: "Password must contain at least one digit.", test: (value: string) => /[0-9]/.test(value) },
] as const;

export function getPasswordValidationErrors(value: string) {
  const errors = value ? [] : ["Password is required."];
  errors.push(...passwordRequirements.filter(({ test }) => !test(value)).map(({ message }) => message));
  return errors;
}
