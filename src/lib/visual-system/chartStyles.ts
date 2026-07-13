/**
 * Builds the one intentional runtime gradient used by segmented financial
 * charts. Callers must supply semantic CSS custom properties (for example
 * `var(--chart-1)`) rather than literal colours.
 */
export function buildSemanticConicGradient(stops: string): string {
  return `conic-gradient(${stops})`;
}
