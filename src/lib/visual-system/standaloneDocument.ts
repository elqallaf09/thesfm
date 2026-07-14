const standaloneSemanticTokens = [
  '--background',
  '--surface',
  '--surface-muted',
  '--foreground',
  '--foreground-secondary',
  '--foreground-muted',
  '--border',
  '--border-strong',
  '--primary',
  '--primary-hover',
  '--primary-soft',
  '--primary-foreground',
  '--accent',
  '--accent-soft',
  '--success',
  '--success-soft',
  '--warning',
  '--warning-soft',
  '--danger',
  '--danger-soft',
  '--info',
  '--info-soft',
  '--font-ui',
  '--font-data',
  '--radius-control',
  '--radius-card',
  '--radius-panel',
  '--radius-pill',
  '--shadow-card',
] as const;

/**
 * Standalone print windows do not inherit CSS custom properties from the
 * application document. This bridge serializes the already-resolved shared
 * tokens instead of creating a second report palette.
 */
export function semanticStandaloneDocumentStyles() {
  const computed = window.getComputedStyle(document.documentElement);
  const declarations = standaloneSemanticTokens.flatMap(token => {
    const value = computed.getPropertyValue(token).trim();
    return value ? [`${token}:${value}`] : [];
  });

  return `:root{${declarations.join(';')}}`;
}

/** Reuse the application's compiled font-face declarations in print windows. */
export function semanticStandaloneStylesheetLinks() {
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'))
    .map(link => {
      const href = link.href
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;');
      return `<link rel="stylesheet" href="${href}" />`;
    })
    .join('');
}
