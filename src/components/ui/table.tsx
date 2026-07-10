import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-x-auto overscroll-x-contain">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm text-foreground", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("bg-secondary/95 [&_tr]:border-b dark:bg-transparent", className)}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-secondary/80 font-semibold text-foreground [&>tr]:last:border-b-0 dark:bg-muted/50 dark:font-medium",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-primary/[0.045] focus-within:bg-primary/[0.045] data-[state=selected]:bg-primary/10 aria-selected:bg-primary/10 motion-reduce:transition-none dark:hover:bg-muted/50 dark:focus-within:bg-muted/50 dark:data-[state=selected]:bg-muted dark:aria-selected:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "sticky top-0 z-10 h-11 whitespace-nowrap bg-secondary/95 px-4 text-start align-middle text-xs font-bold tracking-wide text-foreground shadow-[inset_0_-1px_0_var(--border)] backdrop-blur-sm supports-[backdrop-filter]:bg-secondary/90 data-[numeric=true]:text-end data-[numeric=true]:tabular-nums [&:has([role=checkbox])]:pe-0 dark:static dark:z-auto dark:h-12 dark:bg-transparent dark:text-sm dark:font-medium dark:tracking-normal dark:text-muted-foreground dark:shadow-none dark:backdrop-blur-none",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3.5 align-middle data-[numeric=true]:text-end data-[numeric=true]:font-semibold data-[numeric=true]:tabular-nums [&:has([role=checkbox])]:pe-0 dark:p-4",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm leading-6 text-muted-foreground dark:leading-normal", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
