"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-inner aria-busy:animate-pulse motion-reduce:aria-busy:animate-none dark:h-4 dark:bg-secondary dark:shadow-none",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 rounded-full bg-primary transition-transform duration-300 ease-out [transform:translateX(calc(-1*var(--sfm-progress-offset)))] motion-reduce:transition-none rtl:[transform:translateX(var(--sfm-progress-offset))] dark:duration-150"
      style={{ '--sfm-progress-offset': `${100 - (value || 0)}%` } as React.CSSProperties}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
