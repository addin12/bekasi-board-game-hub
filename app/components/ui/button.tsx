import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Flat controls (DESIGN.md): orange for the one main action, ink outline for the rest. Press = slight darken + 1px drop.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border-2 font-bold whitespace-nowrap transition-colors select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-ink bg-brand text-ink hover:bg-brand-hover",
        outline: "border-ink bg-card text-ink hover:bg-muted",
        secondary: "border-transparent bg-secondary text-ink hover:bg-[#e2dbd2]",
        ghost: "border-transparent text-ink hover:bg-muted",
        destructive: "border-destructive bg-card text-destructive hover:bg-[#fbe5e8]",
        link: "border-transparent text-ink underline underline-offset-4",
      },
      size: {
        default: "h-11 px-4 text-base",
        sm: "h-11 px-3 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
