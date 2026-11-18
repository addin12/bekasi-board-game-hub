import { cn } from "@/lib/utils";

/**
 * Game cover as a round "token" with an ink ring (DESIGN.md, from the sketch). `square` is for the big box cover on a game page.
 * Decorative: the game's name is always shown next to it. width/height are set so the layout never jumps (R-40).
 */
export function GameThumb({ src, name, size = 48, square = false, className }: { src: string | null; name: string; size?: number; square?: boolean; className?: string }) {
  const shape = square ? "rounded-xl border-2 border-ink bg-muted object-cover shrink-0" : "token";
  return src ? (
    <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" style={{ width: size, height: size }} className={cn(shape, className)} />
  ) : (
    <span aria-hidden style={{ width: size, height: size }} className={cn(shape, "grid place-items-center font-extrabold text-muted-foreground", className)}>
      {name.slice(0, 1)}
    </span>
  );
}

/** Member photo, or their initial on the brand orange when they have none. */
export function PersonAvatar({ src, name, size = 48, className }: { src: string | null; name: string; size?: number; className?: string }) {
  return src ? (
    <img src={src} alt="" width={size} height={size} decoding="async" style={{ width: size, height: size }} className={cn("shrink-0 rounded-full border-2 border-ink bg-muted object-cover", className)} />
  ) : (
    <span aria-hidden style={{ width: size, height: size, fontSize: size * 0.42 }} className={cn("grid shrink-0 place-items-center rounded-full border-2 border-ink bg-brand font-extrabold text-ink", className)}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
