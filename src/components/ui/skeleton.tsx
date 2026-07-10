import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-border/40 bg-muted/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] motion-reduce:animate-none dark:rounded-md dark:border-transparent dark:bg-muted dark:shadow-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
