/** One JSON line for a failure that nobody waits for (a background job). Only the error name and a short message: never personal data. */
export function logFailure(event: string, error: unknown): void {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(JSON.stringify({ event, error: message.slice(0, 200) }));
}
