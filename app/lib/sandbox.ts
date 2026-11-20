// Sandbox (staging) test sign-in: name@sandbox.test signs in with a fixed code, no email sent.
// Only active when the Worker var SANDBOX is exactly "1"; the real site sets "0".

export const SANDBOX_DOMAIN = "sandbox.test";
export const SANDBOX_CODE = "000000";

export const isSandboxOn = (flag: string | undefined) => flag === "1";

export const isSandboxEmail = (email: string, sandboxOn: boolean) =>
  sandboxOn && email.trim().toLowerCase().endsWith(`@${SANDBOX_DOMAIN}`);
