import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label above the control, hint or error below it (UI rules: labels above fields, errors next to the field). */
export function Field({ id, label, help, error, className, children }: { id: string; label: string; help?: React.ReactNode; error?: string | null; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : help ? <p className="text-sm text-muted-foreground">{help}</p> : null}
    </div>
  );
}

export const selectClass = "h-11 w-full rounded-lg border-2 border-input bg-white px-3 text-base";
