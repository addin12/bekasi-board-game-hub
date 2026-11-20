import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** "Report" opens a short form. The report goes to an admin, never to the person reported. */
export function ReportButton({ type, id, what }: { type: "member" | "post" | "comment" | "table" | "place" | "play"; id: string; what: string }) {
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.ok) { toast.success("Thanks. An admin will look at it."); setOpen(false); }
    else toast.error(fetcher.data.message ?? "We could not send the report. Try again.");
  }, [fetcher.data]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-ink">
        Report<span className="sr-only"> {what}</span>
      </button>
    );
  }
  const fieldId = `report-${type}-${id}`;
  return (
    <fetcher.Form method="post" action="/api/report" className="panel grid gap-3 p-4">
      <input type="hidden" name="targetType" value={type} />
      <input type="hidden" name="targetId" value={id} />
      <Label htmlFor={fieldId}>What is wrong with {what}?</Label>
      <Textarea id={fieldId} name="reason" required minLength={5} maxLength={300} rows={3} autoFocus />
      <div className="flex justify-between gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="submit" disabled={fetcher.state !== "idle"}>{fetcher.state !== "idle" ? "Sending…" : "Send report"}</Button>
      </div>
    </fetcher.Form>
  );
}
