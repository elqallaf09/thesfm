/**
 * Static metadata and email clients cannot reliably consume the application's
 * CSS custom properties. Keep this adapter synchronized with the canonical
 * values in themes.css/tokens.css; browser UI must continue to use CSS vars.
 */
const STATIC_FONT_FAMILIES = {
  ui: 'IBM Plex Sans Arabic',
  data: 'IBM Plex Mono',
} as const;

export const STATIC_LIGHT_VISUAL_TOKENS = {
  background: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  foreground: '#0F2742',
  foregroundSecondary: '#334155',
  foregroundMuted: '#5F6F84',
  foregroundSubtle: '#7C8A9E',
  foregroundInverse: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  primary: '#1769D2',
  primaryHover: '#1258B3',
  primarySoft: '#EAF3FF',
  primaryForeground: '#FFFFFF',
  accent: '#0F9F9A',
  accentHover: '#0B7F7A',
  accentSoft: '#E6F8F6',
  success: '#15803D',
  successSoft: '#EAF7EE',
  warning: '#B45309',
  warningSoft: '#FFF7E6',
  danger: '#C62828',
  dangerSoft: '#FDECEC',
  info: '#0369A1',
  infoSoft: '#EAF6FC',
  focusRing: '#2563EB',
  shadowColor: '#0F2742',
  radiusCard: '14px',
  radiusPanel: '20px',
  fontUi: `'${STATIC_FONT_FAMILIES.ui}', system-ui, sans-serif`,
  fontData: `'${STATIC_FONT_FAMILIES.data}', ui-monospace, monospace`,
} as const;

const toPresentationColor = (value: string) => value.replace(/^#/, '').toUpperCase();

/**
 * Presentation libraries require bare RGB values and a single installed font
 * name rather than CSS variables or font stacks. These roles are derived from
 * the same canonical static palette so exports cannot introduce a local theme.
 */
export const STATIC_PRESENTATION_VISUAL_TOKENS = {
  background: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.background),
  surface: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.surface),
  surfaceMuted: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.surfaceMuted),
  foreground: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.foreground),
  foregroundSecondary: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.foregroundSecondary),
  foregroundMuted: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.foregroundMuted),
  foregroundSubtle: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.foregroundSubtle),
  foregroundInverse: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.foregroundInverse),
  border: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.border),
  borderStrong: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.borderStrong),
  primary: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.primary),
  primaryHover: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.primaryHover),
  primarySoft: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.primarySoft),
  primaryForeground: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.primaryForeground),
  accent: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.accent),
  accentSoft: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.accentSoft),
  success: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.success),
  successSoft: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.successSoft),
  warning: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.warning),
  warningSoft: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.warningSoft),
  danger: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.danger),
  dangerSoft: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.dangerSoft),
  info: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.info),
  infoSoft: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.infoSoft),
  shadowColor: toPresentationColor(STATIC_LIGHT_VISUAL_TOKENS.shadowColor),
  fontUi: STATIC_FONT_FAMILIES.ui,
  fontData: STATIC_FONT_FAMILIES.data,
} as const;

/** PptxGenJS mutates shadow options, so callers must receive a fresh object. */
export function createStaticPresentationCardShadow() {
  return {
    type: 'outer' as const,
    color: STATIC_PRESENTATION_VISUAL_TOKENS.shadowColor,
    opacity: 0.12,
    blur: 1,
    angle: 45,
    offset: 1,
  };
}

/**
 * Shared inline styles for transactional email HTML. Email markup consumes
 * these semantic styles instead of defining route-local palettes or fonts.
 */
export const STATIC_EMAIL_VISUAL_STYLES = {
  canvas: `font-family:${STATIC_LIGHT_VISUAL_TOKENS.fontUi};line-height:1.8;color:${STATIC_LIGHT_VISUAL_TOKENS.foreground};background:${STATIC_LIGHT_VISUAL_TOKENS.background};padding:24px`,
  panel: `background:${STATIC_LIGHT_VISUAL_TOKENS.surface};border:1px solid ${STATIC_LIGHT_VISUAL_TOKENS.border};border-radius:${STATIC_LIGHT_VISUAL_TOKENS.radiusPanel};padding:24px`,
  brand: `color:${STATIC_LIGHT_VISUAL_TOKENS.primary};font-weight:700`,
  dividerLabel: `border-bottom:1px solid ${STATIC_LIGHT_VISUAL_TOKENS.border};color:${STATIC_LIGHT_VISUAL_TOKENS.foregroundMuted}`,
  dividerValue: `border-bottom:1px solid ${STATIC_LIGHT_VISUAL_TOKENS.border}`,
  supportingText: `color:${STATIC_LIGHT_VISUAL_TOKENS.foregroundSecondary}`,
  primaryAction: `display:inline-block;background:${STATIC_LIGHT_VISUAL_TOKENS.primary};color:${STATIC_LIGHT_VISUAL_TOKENS.primaryForeground};text-decoration:none;font-weight:700;border-radius:${STATIC_LIGHT_VISUAL_TOKENS.radiusCard}`,
} as const;
