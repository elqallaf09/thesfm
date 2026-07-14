import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex min-w-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] text-sm font-semibold leading-5 ring-offset-background transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none aria-busy:pointer-events-none aria-busy:cursor-wait aria-busy:opacity-80 aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 motion-reduce:transition-none motion-reduce:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "sfm-button-base sfm-button-primary",
        destructive:
          "sfm-button-base sfm-button-danger",
        outline:
          "sfm-button-base sfm-button-secondary",
        secondary:
          "sfm-button-base sfm-button-secondary",
        ghost: "sfm-button-base sfm-button-ghost",
        success: "sfm-button-base sfm-button-success",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-11 rounded-[var(--radius-sm)] px-3 sm:h-9",
        lg: "h-12 px-8",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={asChild ? undefined : type}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
