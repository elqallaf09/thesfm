"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-left"
      duration={4000}
      className="toaster group [--mobile-offset:16px] [--width:420px]"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:shadow-[var(--shadow-lg)] dark:group-[.toaster]:border-[rgba(24,212,212,0.28)] dark:group-[.toaster]:bg-[#061B33] dark:group-[.toaster]:text-[#EAF6FF] dark:group-[.toaster]:shadow-[0_18px_45px_rgba(3,18,37,0.22)]",
          description: "group-[.toast]:text-muted-foreground dark:group-[.toast]:text-[#A7C7E7]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
