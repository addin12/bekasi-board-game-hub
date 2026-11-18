import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Hit = { bggId: number; name: string; year: number | null };

/** Search BGG and pick one game. Calls onPick; the parent decides what happens. */
export function GamePicker({ label, help, onPick, disabled }: { label: string; help?: string; onPick: (hit: Hit) => void; disabled?: boolean }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "none">("idle");

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setStatus("idle"); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { hits: Hit[] };
        setHits(data.hits);
        setStatus(res.ok ? (data.hits.length ? "idle" : "none") : "error");
      } catch (e) {
        if (!ctrl.signal.aborted) setStatus("error");
      }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="search" value={q} disabled={disabled} onChange={(e) => setQ(e.target.value)} placeholder="Search a game" autoComplete="off" aria-describedby={`${id}-help`} />
      {/* Always in the DOM for screen readers (aria-live); takes no space while empty. */}
      <p id={`${id}-help`} className="text-sm text-muted-foreground empty:hidden" aria-live="polite">
        {status === "loading" ? "Searching BoardGameGeek…" : status === "error" ? "BoardGameGeek isn't answering. Try again in a minute." : status === "none" ? "No games found. Check the spelling." : help}
      </p>
      {hits.length > 0 && (
        <ul className="grid max-h-72 overflow-y-auto rounded-lg border-2 border-ink bg-white">
          {hits.map((h) => (
            <li key={h.bggId} className="border-b border-ink/15 last:border-0">
              <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted"
                onClick={() => { onPick(h); setQ(""); setHits([]); }}>
                <span className="font-medium">{h.name}</span>
                <span className="text-sm text-muted-foreground">{h.year ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
