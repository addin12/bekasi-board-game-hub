import { useEffect, useId, useState } from "react";
import { PersonAvatar } from "@/components/game-thumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PickedPerson = { userId: string; handle: string; displayName: string; avatar: string | null };

/** Search members by name or username and pick one. Calls onPick; the parent keeps the list. */
export function PeoplePicker({ label, onPick, exclude }: { label: string; onPick: (p: PickedPerson) => void; exclude: string[] }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PickedPerson[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "none" | "error">("idle");

  // biome-ignore lint/correctness/useExhaustiveDependencies: exclude is a new array on every render, so its joined text is the dependency
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setStatus("idle"); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/people/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { people: PickedPerson[] };
        const list = data.people.filter((p) => !exclude.includes(p.userId));
        setHits(list);
        setStatus(res.ok ? (list.length ? "idle" : "none") : "error");
      } catch {
        if (!ctrl.signal.aborted) setStatus("error");
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, exclude.join(",")]);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or username" autoComplete="off" />
      <p className="text-sm text-muted-foreground empty:hidden" aria-live="polite">
        {status === "loading" ? "Searching…" : status === "none" ? "No member found. Add them as a guest below." : status === "error" ? "Search isn't working. Try again." : ""}
      </p>
      {hits.length > 0 && (
        <ul className="grid overflow-hidden rounded-lg border-2 border-ink bg-white">
          {hits.map((h) => (
            <li key={h.userId} className="border-b border-ink/15 last:border-0">
              <button type="button" className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted" onClick={() => { onPick(h); setQ(""); setHits([]); }}>
                <PersonAvatar src={h.avatar} name={h.displayName} size={32} />
                <span className="font-semibold">{h.displayName}</span>
                <span className="text-sm text-muted-foreground">@{h.handle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
