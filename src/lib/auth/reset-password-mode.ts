type ResetPasswordEnvironment = {
  NODE_ENV?: string;
  AUTH_RESET_DEV_EXPOSE_TOKEN?: string;
};

export function isResetPasswordDevExposureEnabled(
  env: ResetPasswordEnvironment = process.env,
): boolean {
  return (
    env.NODE_ENV !== "production" &&
    env.AUTH_RESET_DEV_EXPOSE_TOKEN === "true"
  );
}
