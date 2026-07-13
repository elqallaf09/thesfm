import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full resize-y rounded-[var(--radius-control)] border border-input bg-card px-3.5 py-3 text-base text-foreground shadow-[var(--shadow-xs)] outline-none transition-[border-color,color,box-shadow,background-color] placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 read-only:bg-muted disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 aria-busy:cursor-wait aria-busy:bg-muted aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 motion-reduce:transition-none md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
