// Shared by the admin content page (browser) and the admin server code, so it can't live in a .server module.
export const CONTENT_TYPES = ["posts", "comments", "places", "tables", "plays"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
