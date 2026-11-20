"use client"

import * as React from "react"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"

// One tab style site-wide (DESIGN.md): a bar with a hairline base; the current tab is ink text on a 4px orange bar.
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex w-full flex-wrap gap-x-1 border-b-2 border-line", className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "-mb-0.5 inline-flex h-11 items-center gap-1.5 border-b-4 border-transparent px-3 text-base font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-ink disabled:opacity-50",
        "data-[state=active]:border-brand data-[state=active]:font-bold data-[state=active]:text-ink",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("text-base", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
