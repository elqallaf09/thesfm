import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-border bg-card text-card-foreground shadow-[var(--shadow-sm)] transition-[border-color,background-color,box-shadow,transform,opacity] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-md)] data-[state=active]:border-primary/40 data-[state=active]:shadow-[var(--shadow-md)] data-[state=empty]:border-dashed data-[state=empty]:shadow-none aria-selected:border-primary/40 aria-selected:bg-primary/[0.04] aria-busy:cursor-progress aria-busy:opacity-80 aria-invalid:border-destructive/50 aria-invalid:bg-destructive/[0.03] motion-reduce:transition-none motion-reduce:hover:transform-none dark:shadow-sm dark:shadow-black/25 dark:hover:translate-y-0 dark:hover:border-border dark:hover:shadow-sm dark:hover:shadow-black/25",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 p-5 sm:p-6 dark:p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-xl font-bold leading-tight tracking-tight text-card-foreground dark:text-2xl dark:font-semibold dark:leading-none",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-6 text-muted-foreground dark:leading-normal", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0 sm:p-6 sm:pt-0 dark:p-6 dark:pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2 p-5 pt-0 sm:p-6 sm:pt-0 dark:gap-0 dark:p-6 dark:pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
