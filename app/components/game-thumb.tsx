import { cn } from "@/lib/utils";

/** Square BGG cover with the game's initial as a fallback. Decorative: the name is always shown next to it. */
export function GameThumb({ src, name, className }: { src: string | null; name: string; className?: string }) {
  return src ? (
    <img src={src} alt="" loading="lazy" className={cn("size-12 shrink-0 rounded-lg bg-muted object-cover", className)} />
  ) : (
    <span aria-hidden className={cn("grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-lg font-semibold text-muted-foreground", className)}>
      {name.slice(0, 1)}
    </span>
  );
}

export function PersonAvatar({ src, name, className }: { src: string | null; name: string; className?: string }) {
  return src ? (
    <img src={src} alt="" className={cn("size-12 shrink-0 rounded-full bg-muted object-cover", className)} />
  ) : (
    <span aria-hidden className={cn("grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-lg font-semibold", className)}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
