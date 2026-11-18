import * as React from "react"
import { cn } from "cn"

// Same field style as Input; focus uses the global :focus-visible ring.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-lg border-2 border-input bg-white px-3 py-2 text-base leading-relaxed transition-colors placeholder:text-muted-foreground disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
