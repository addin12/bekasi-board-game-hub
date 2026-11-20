import { useEffect, useState } from "react";
import { Link, useFetcher } from "react-router";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Kind } from "@/db/schema";
import { cn } from "@/lib/utils";

type Result = { ok: boolean; message: string };

const CHOICES: { kind: Kind; label: string; on: string }[] = [
  { kind: "favorite", label: "Loves it", on: "Loved" },
  { kind: "own", label: "I own it", on: "Owned" },
  { kind: "want", label: "Want to play", on: "Wanted" },
  { kind: "sell", label: "I'm selling it", on: "Selling" },
  { kind: "buy", label: "Looking to buy", on: "Looking" },
];

/** One tap puts this game on your card (or takes it off), so people build a card by browsing, not only by searching. */
export function GameActions({ bggId, signedIn, hasCard, mine }: { bggId: number; signedIn: boolean; hasCard: boolean; mine: Kind[] }) {
  const fetcher = useFetcher<Result>();
  const [priceFor, setPriceFor] = useState<"sell" | "buy" | null>(null);
  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.ok) toast.success(fetcher.data.message);
    else toast.error(fetcher.data.message);
  }, [fetcher.data]);

  if (!signedIn || !hasCard) {
    return (
      <section aria-label="Add to your card" className="panel grid gap-3 p-5">
        <h2 className="text-lg font-extrabold">Put it on your card</h2>
        <p className="text-muted-foreground">{signedIn ? "Make your player card first" : "Sign in to say you own it, love it, want to play it or sell it"}</p>
        <Button asChild className="w-fit"><Link to={signedIn ? "/me/edit" : `/sign-in?next=${encodeURIComponent(`/g/${bggId}`)}`}>{signedIn ? "Make my card" : "Sign in"}</Link></Button>
      </section>
    );
  }

  // Show the result of the tap right away; the page data catches up after the server answers.
  const sending = fetcher.formData;
  const isOn = (kind: Kind) => {
    if (sending && sending.get("kind") === kind) return sending.get("intent") === "add";
    return mine.includes(kind);
  };
  const busy = fetcher.state !== "idle";
  const send = (intent: "add" | "remove", kind: Kind, extra: Record<string, string> = {}) => fetcher.submit({ intent, kind, bggId: String(bggId), ...extra }, { method: "post" });

  return (
    <section aria-label="Add to your card" className="panel grid gap-4 p-5">
      <h2 className="text-lg font-extrabold">On your card</h2>
      <div className="flex flex-wrap gap-2">
        {CHOICES.map((c) => {
          const on = isOn(c.kind);
          return (
            <button key={c.kind} type="button" aria-pressed={on} disabled={busy}
              onClick={() => {
                if (on) { send("remove", c.kind); return; }
                if (c.kind === "sell" || c.kind === "buy") { setPriceFor(c.kind); return; }
                send("add", c.kind);
              }}
              className={cn("inline-flex min-h-11 items-center rounded-lg border-2 border-ink px-4 font-bold transition-colors disabled:opacity-60", on ? "bg-ink text-white" : "bg-card hover:bg-muted")}>
              {on ? c.on : c.label}
            </button>
          );
        })}
      </div>

      {priceFor && (
        <form className="grid gap-3 rounded-lg bg-muted p-4" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          send("add", priceFor, { price: String(f.get("price") ?? ""), condition: String(f.get("condition") ?? "") });
          setPriceFor(null);
        }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="ga-price" label={priceFor === "sell" ? "Price" : "Budget (optional)"}><Input id="ga-price" name="price" inputMode="numeric" placeholder="e.g. 350k" autoFocus /></Field>
            {priceFor === "sell" && <Field id="ga-condition" label="Condition (optional)"><Input id="ga-condition" name="condition" maxLength={40} placeholder="e.g. Like new" /></Field>}
          </div>
          <div className="flex justify-between gap-2">
            <Button type="button" variant="ghost" onClick={() => setPriceFor(null)}>Cancel</Button>
            <Button type="submit">Add game</Button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button asChild variant="outline"><Link to={`/plays/new?game=${bggId}`}>Log a play</Link></Button>
        <Button asChild variant="outline"><Link to={`/tables/new?game=${bggId}`}>Open a table</Link></Button>
      </div>
    </section>
  );
}
