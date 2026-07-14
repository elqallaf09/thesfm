export const TRADER_THEME_MESSAGE_VERSION = 1 as const;
export const TRADER_THEME_READY_MESSAGE_TYPE = 'SFM_TRADER_READY' as const;
export const TRADER_THEME_SET_MESSAGE_TYPE = 'SFM_TRADER_THEME_SET' as const;

export type TraderThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTraderTheme = 'light' | 'dark';

export type TraderThemeReadyMessage = {
  type: typeof TRADER_THEME_READY_MESSAGE_TYPE;
  version: typeof TRADER_THEME_MESSAGE_VERSION;
};

export type TraderThemeSetMessage = {
  type: typeof TRADER_THEME_SET_MESSAGE_TYPE;
  version: typeof TRADER_THEME_MESSAGE_VERSION;
  preference: TraderThemePreference;
  resolvedTheme: ResolvedTraderTheme;
};

export function isTraderThemePreference(value: unknown): value is TraderThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function isResolvedTraderTheme(value: unknown): value is ResolvedTraderTheme {
  return value === 'light' || value === 'dark';
}

export function isTraderThemeReadyMessage(value: unknown): value is TraderThemeReadyMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const message = value as Record<string, unknown>;
  return Object.keys(message).length === 2
    && message.type === TRADER_THEME_READY_MESSAGE_TYPE
    && message.version === TRADER_THEME_MESSAGE_VERSION;
}

export function createTraderThemeSetMessage(
  preference: TraderThemePreference,
  resolvedTheme: ResolvedTraderTheme,
): TraderThemeSetMessage {
  return {
    type: TRADER_THEME_SET_MESSAGE_TYPE,
    version: TRADER_THEME_MESSAGE_VERSION,
    preference,
    resolvedTheme,
  };
}
