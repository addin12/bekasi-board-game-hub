import { env } from "cloudflare:workers";

/** The ADMIN_EMAILS secret as a clean list: lower case, no blanks. The one place that splits it. */
export const adminEmails = (): string[] => (env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
