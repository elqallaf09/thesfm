import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold leading-5 transition-[color,background-color,border-color,box-shadow,opacity] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:ring-offset-2 aria-busy:animate-pulse aria-busy:cursor-wait aria-disabled:opacity-55 motion-reduce:transition-none motion-reduce:aria-busy:animate-none dark:min-h-0 dark:gap-0 dark:leading-normal dark:focus-visible:ring-2 dark:focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary text-primary-foreground shadow-sm shadow-primary/15 dark:border-transparent dark:shadow-blue-500/15",
        secondary:
          "border-border bg-secondary text-secondary-foreground shadow-xs dark:shadow-none",
        destructive:
          "border-destructive/20 bg-destructive text-destructive-foreground shadow-sm shadow-destructive/15 dark:border-transparent dark:shadow-red-500/15",
        outline: "border-border bg-card text-card-foreground shadow-xs dark:shadow-none",
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
