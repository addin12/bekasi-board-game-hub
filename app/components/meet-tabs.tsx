import { NavLink } from "react-router";
import { cn } from "@/lib/utils";

/** Tables and Places are two views of "where and when we play", so they share one tab bar. */
export function MeetTabs() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn("-mb-0.5 inline-flex h-12 items-center border-b-4 px-3 text-base font-semibold", isActive ? "border-brand font-bold text-ink" : "border-transparent text-muted-foreground hover:text-ink");
  return (
    <nav aria-label="Tables and places" className="flex gap-x-1 border-b-2 border-line">
      <NavLink to="/tables" className={tab}>Tables</NavLink>
      <NavLink to="/places" className={tab}>Places</NavLink>
    </nav>
  );
}
