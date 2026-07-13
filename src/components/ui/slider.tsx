"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex min-h-11 w-full touch-none select-none items-center data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55 dark:min-h-0 dark:data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2.5 w-full grow overflow-hidden rounded-[var(--radius-pill)] bg-muted shadow-[var(--shadow-xs)] dark:h-2 dark:bg-secondary dark:shadow-none">
      <SliderPrimitive.Range className="absolute h-full rounded-[var(--radius-pill)] bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-6 w-6 cursor-grab rounded-[var(--radius-circle)] border-2 border-primary bg-card shadow-[var(--shadow-sm)] ring-offset-background transition-[border-color,box-shadow,transform] hover:scale-105 active:cursor-grabbing active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:ring-offset-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 motion-reduce:transition-none motion-reduce:transform-none dark:h-5 dark:w-5 dark:bg-background dark:shadow-none dark:focus-visible:ring-2 dark:focus-visible:ring-ring" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
