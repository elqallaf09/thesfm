import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm shadow-blue-500/15",
        secondary:
          "border-border bg-secondary text-secondary-foreground dark:bg-[rgba(29,140,255,0.16)] dark:text-[#A7D8FF] dark:border-[rgba(24,212,212,0.22)]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm shadow-red-500/15",
        outline: "border-border bg-white text-foreground dark:bg-[#0B2748] dark:text-[#EAF6FF] dark:border-[rgba(167,243,240,0.16)]",
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
