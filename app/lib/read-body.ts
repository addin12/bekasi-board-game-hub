/**
 * Reads a request body as text and stops at `max` bytes. Returns null when the body is bigger.
 * A post with no length header cannot fill the memory of the Worker this way.
 */
export async function readCapped(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  return new Blob(parts as BlobPart[]).text();
}
