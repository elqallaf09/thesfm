"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-inner transition-[background-color,border-color,box-shadow,opacity] after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] hover:border-primary/25 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input motion-reduce:transition-none dark:h-6 dark:w-11 dark:shadow-none dark:after:hidden dark:hover:border-transparent dark:focus-visible:ring-2 dark:focus-visible:ring-ring dark:disabled:opacity-50",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-6 w-6 rounded-full border border-border bg-card shadow-md ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 motion-reduce:transition-none rtl:data-[state=checked]:-translate-x-5 dark:h-5 dark:w-5 dark:border-0 dark:bg-background dark:shadow-lg"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
