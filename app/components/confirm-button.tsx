import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Two taps for anything that destroys data: the first asks, the second does it. */
export function ConfirmButton({ label, confirmLabel, onConfirm, disabled, size = "sm" }: { label: string; confirmLabel: string; onConfirm: () => void; disabled?: boolean; size?: "sm" | "default" }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <Button type="button" size={size} variant="outline" disabled={disabled} onClick={() => setAsking(true)}>{label}</Button>;
  return (
    <span className="flex items-center gap-1">
      <Button type="button" size={size} variant="destructive" disabled={disabled} onClick={() => { setAsking(false); onConfirm(); }}>{confirmLabel}</Button>
      <Button type="button" size={size} variant="ghost" onClick={() => setAsking(false)}>Keep</Button>
    </span>
  );
}
