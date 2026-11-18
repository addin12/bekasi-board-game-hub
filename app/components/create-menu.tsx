import { CalendarPlus, Dices, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/plays/new", label: "Log a play", icon: Dices },
  { to: "/tables/new", label: "Open a table", icon: CalendarPlus },
  { to: "/feed#write", label: "Write a post", icon: Pencil },
];

/** The "+" button: three ways to add something. `bar` is the round phone button, `header` the desktop one. */
export function CreateMenu({ variant }: { variant: "bar" | "header" }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname, loc.hash]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      {open && <button type="button" tabIndex={-1} aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-30 cursor-default" />}
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative z-40 inline-flex items-center justify-center border-2 border-ink bg-brand font-bold text-ink hover:bg-brand-hover",
          variant === "bar" ? "-mt-5 size-14 rounded-full" : "h-11 gap-2 rounded-lg px-3 text-base",
        )}>
        <Plus className={variant === "bar" ? "size-7" : "size-5"} strokeWidth={3} aria-hidden />
        {variant === "bar" ? <span className="sr-only">Create</span> : "Create"}
      </button>
      {open && (
        <ul role="menu" className={cn("panel absolute z-40 grid w-56 gap-1 border-ink p-2", variant === "bar" ? "bottom-[4.5rem] left-1/2 -translate-x-1/2" : "right-0 top-12")}>
          {ITEMS.map((i) => (
            <li key={i.to} role="none">
              <Link role="menuitem" to={i.to} className="flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold hover:bg-muted"><i.icon className="icon" aria-hidden />{i.label}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
