export const MIN_PASSWORD_LENGTH = 8;

export type PasswordPolicyResult = {
  valid: boolean;
  reason?: string;
};

export function validatePasswordPolicy(
  password: string,
): PasswordPolicyResult {
  if (
    password.length <
    MIN_PASSWORD_LENGTH
  ) {
    return {
      valid: false,
      reason:
        "Kata sandi minimal 8 karakter.",
    };
  }

  if (!/[A-Za-z]/.test(password)) {
    return {
      valid: false,
      reason:
        "Kata sandi harus mengandung huruf.",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      reason:
        "Kata sandi harus mengandung angka.",
    };
  }

  return {
    valid: true,
  };
}
