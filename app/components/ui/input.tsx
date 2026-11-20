import * as React from "react"
import { cn } from "cn"

// Focus uses the global :focus-visible ring (app.css). Border #8f8899 is 3.4:1 on white (field edge must be ≥3:1).
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border-2 border-input bg-white px-3 text-base transition-colors file:mr-3 file:h-full file:border-0 file:bg-transparent file:font-bold file:text-ink placeholder:text-muted-foreground disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
