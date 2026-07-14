import * as React from "react"

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
    setIsMobile(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
