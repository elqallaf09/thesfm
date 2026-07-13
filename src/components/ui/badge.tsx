import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs font-medium leading-5 transition-[color,background-color,border-color,box-shadow,opacity] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:ring-offset-2 aria-busy:animate-pulse aria-busy:cursor-wait aria-disabled:opacity-55 motion-reduce:transition-none motion-reduce:aria-busy:animate-none",
  {
    variants: {
      variant: {
        default:
          "border-primary/25 bg-primary-soft text-primary-hover",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/25 bg-danger-soft text-destructive",
        outline: "border-border bg-card text-card-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
