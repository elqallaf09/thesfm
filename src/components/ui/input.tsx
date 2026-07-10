import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 py-2 text-base text-foreground shadow-[var(--shadow-xs)] outline-none transition-[border-color,color,box-shadow,background-color] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 read-only:bg-muted/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 aria-busy:cursor-wait aria-busy:bg-muted/40 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 motion-reduce:transition-none file:me-3 file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground md:text-sm dark:h-10 dark:px-3 dark:py-1 dark:shadow-xs dark:hover:border-input dark:focus-visible:border-input dark:focus-visible:ring-2 dark:focus-visible:ring-ring dark:read-only:bg-card dark:disabled:opacity-70 dark:aria-invalid:ring-destructive/40 dark:file:me-0 dark:file:h-7 dark:file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
