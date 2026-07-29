import * as React from "react"

import { commitWhenStreamSettled } from "@/lib/runtime/streamingHydration"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Default to the desktop shell so server rendering and desktop hydration keep
  // a stable sidebar track. The mobile media query hides the rail immediately;
  // this hook then unmounts it once the client viewport has been confirmed.
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }

    mql.addEventListener("change", onChange)
    // The first-paint sync must not land while a route Suspense segment is
    // still dehydrated (see streamingHydration.ts).
    const cancelCommit = commitWhenStreamSettled(() => {
      React.startTransition(() => setIsMobile(mql.matches))
    })
    return () => {
      cancelCommit()
      mql.removeEventListener("change", onChange)
    }
  }, [])

  return isMobile
}
