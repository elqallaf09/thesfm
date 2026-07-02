import {
  MARKET_SIGNAL_DISCLAIMER_AR,
  type MarketSignal,
  type MarketSignalAction,
} from '@/lib/market/signalEngine';

export type SignalRiskProfile = 'conservative' | 'balanced' | 'aggressive';
export type SignalAlertChannel = 'in-app' | 'email' | 'telegram' | 'push';

export type UserSignalPreferences = {
  minConfidence: number;
  riskProfile: SignalRiskProfile;
  enabledMarkets: string[];
  buyAlertsEnabled: boolean;
  sellAlertsEnabled: boolean;
  waitAlertsEnabled: boolean;
  emailAlertsEnabled: boolean;
  inAppAlertsEnabled: boolean;
  telegramAlertsEnabled?: boolean;
  pushAlertsEnabled?: boolean;
};

export type SignalNotificationEvent =
  | 'new_buy'
  | 'new_sell'
  | 'signal_changed'
  | 'target_reached'
  | 'stop_loss_crossed'
  | 'confidence_change'
  | 'high_risk'
  | 'wait_watch';

export type SignalNotificationDraft = {
  symbol: string;
  action: MarketSignalAction;
  event: SignalNotificationEvent;
  title: string;
  message: string;
  channel: SignalAlertChannel;
};

export const DEFAULT_SIGNAL_ENABLED_MARKETS = [
  'US',
  'Kuwait',
  'Saudi',
  'UAE',
  'Qatar',
  'Bahrain',
  'Oman',
  'Forex',
  'Crypto',
  'Commodities',
];

export const DEFAULT_SIGNAL_PREFERENCES: UserSignalPreferences = {
  minConfidence: 70,
  riskProfile: 'balanced',
  enabledMarkets: DEFAULT_SIGNAL_ENABLED_MARKETS,
  buyAlertsEnabled: true,
  sellAlertsEnabled: true,
  waitAlertsEnabled: false,
  emailAlertsEnabled: false,
  inAppAlertsEnabled: true,
  telegramAlertsEnabled: false,
  pushAlertsEnabled: false,
};

function formatNumber(value: number | null | undefined, maxDigits = 2) {
  if (!Number.isFinite(Number(value))) return '--';
  return Number(value).toLocaleString('en-US', {
    maximumFractionDigits: maxDigits,
    minimumFractionDigits: 0,
  });
}

function price(value: number | null | undefined, currency: string) {
  if (!Number.isFinite(Number(value))) return '--';
  return `${formatNumber(value, Math.abs(Number(value)) < 10 ? 4 : 2)} ${currency}`;
}

function actionAr(action: MarketSignalAction) {
  if (action === 'buy') return 'شراء';
  if (action === 'cautious_buy') return 'شراء بحذر';
  if (action === 'sell' || action === 'sell_or_avoid') return 'تجنب / بيع';
  if (action === 'insufficient_data') return 'بيانات غير كافية';
  if (action === 'watch') return 'مراقبة';
  return 'انتظار';
}

function marketEnabled(signal: MarketSignal, prefs: UserSignalPreferences) {
  const normalized = signal.market.toLowerCase();
  return prefs.enabledMarkets.some(market => {
    const item = market.toLowerCase();
    return normalized === item || normalized.includes(item) || item.includes(normalized);
  });
}

function actionEnabled(action: MarketSignalAction, prefs: UserSignalPreferences) {
  if (action === 'buy' || action === 'cautious_buy') return prefs.buyAlertsEnabled;
  if (action === 'sell' || action === 'sell_or_avoid') return prefs.sellAlertsEnabled;
  return prefs.waitAlertsEnabled;
}

function riskAllowed(signal: MarketSignal, prefs: UserSignalPreferences) {
  const defensiveSignal = signal.action === 'sell' || signal.action === 'sell_or_avoid';
  if (prefs.riskProfile === 'aggressive') return true;
  if (prefs.riskProfile === 'conservative') return signal.riskLevel === 'low' || defensiveSignal;
  return signal.riskLevel !== 'high' || defensiveSignal;
}

function channelEnabled(channel: SignalAlertChannel, prefs: UserSignalPreferences) {
  if (channel === 'in-app') return prefs.inAppAlertsEnabled;
  if (channel === 'email') return prefs.emailAlertsEnabled;
  if (channel === 'telegram') return prefs.telegramAlertsEnabled === true;
  if (channel === 'push') return prefs.pushAlertsEnabled === true;
  return false;
}

export function shouldNotifySignal(signal: MarketSignal, prefs: UserSignalPreferences, channel: SignalAlertChannel, event?: SignalNotificationEvent) {
  if (!channelEnabled(channel, prefs)) return false;
  if (!marketEnabled(signal, prefs)) return false;
  if (!riskAllowed(signal, prefs)) return false;
  if (!actionEnabled(signal.action, prefs) && event !== 'stop_loss_crossed' && event !== 'high_risk') return false;
  if (signal.action !== 'sell' && signal.action !== 'sell_or_avoid' && signal.confidence < prefs.minConfidence && event !== 'signal_changed' && event !== 'stop_loss_crossed') return false;
  return true;
}

export function detectSignalNotificationEvents(current: MarketSignal, previous?: MarketSignal | null): SignalNotificationEvent[] {
  const events: SignalNotificationEvent[] = [];
  if (!previous) {
    if (current.action === 'buy' || current.action === 'cautious_buy') events.push('new_buy');
    if (current.action === 'sell' || current.action === 'sell_or_avoid') events.push('new_sell');
    if (current.action === 'wait' || current.action === 'watch' || current.action === 'insufficient_data') events.push('wait_watch');
  } else {
    if (previous.action !== current.action) events.push('signal_changed');
    if (Math.abs(current.confidence - previous.confidence) >= 15) events.push('confidence_change');
  }

  if (
    current.currentPrice !== null &&
    current.targetPrice !== null &&
    (((current.action === 'buy' || current.action === 'cautious_buy') && current.currentPrice >= current.targetPrice) ||
      ((current.action === 'sell' || current.action === 'sell_or_avoid') && current.currentPrice <= current.targetPrice))
  ) {
    events.push('target_reached');
  }

  if (
    current.currentPrice !== null &&
    current.stopLoss !== null &&
    (((current.action === 'buy' || current.action === 'cautious_buy') && current.currentPrice <= current.stopLoss) ||
      ((current.action === 'sell' || current.action === 'sell_or_avoid') && current.currentPrice >= current.stopLoss))
  ) {
    events.push('stop_loss_crossed');
  }

  if (current.riskLevel === 'high' && (current.action === 'buy' || current.action === 'cautious_buy' || current.action === 'sell' || current.action === 'sell_or_avoid')) events.push('high_risk');
  return Array.from(new Set(events));
}

export function buildSignalNotification(
  signal: MarketSignal,
  event: SignalNotificationEvent,
  channel: SignalAlertChannel = 'in-app',
  previous?: MarketSignal | null,
): SignalNotificationDraft {
  const base = `${signal.symbol} عند ${price(signal.currentPrice, signal.currency)} — الثقة ${signal.confidence}%`;
  const target = signal.targetPrice !== null ? ` — الهدف ${price(signal.targetPrice, signal.currency)}` : '';
  const stop = signal.stopLoss !== null ? ` — وقف الخسارة ${price(signal.stopLoss, signal.currency)}` : '';
  const reason = signal.reasons[0] ? ` — السبب: ${signal.reasons[0]}` : '';
  const disclaimer = ` ليست نصيحة مالية. ${MARKET_SIGNAL_DISCLAIMER_AR}`;

  if (event === 'new_buy') {
    return {
      symbol: signal.symbol,
      action: signal.action,
      event,
      channel,
      title: `${signal.actionLabelAr} على ${signal.symbol}`,
      message: `${signal.actionLabelAr}: ${base}${target}${stop}.${disclaimer}`,
    };
  }

  if (event === 'new_sell') {
    return {
      symbol: signal.symbol,
      action: signal.action,
      event,
      channel,
      title: `${signal.actionLabelAr} على ${signal.symbol}`,
      message: `${signal.actionLabelAr}: ${base}${reason}.${disclaimer}`,
    };
  }

  if (event === 'signal_changed') {
    return {
      symbol: signal.symbol,
      action: signal.action,
      event,
      channel,
      title: `تغيرت التوصية على ${signal.symbol}`,
      message: `انتبه: تغيرت التوصية على ${signal.symbol} من ${actionAr(previous?.action ?? 'watch')} إلى ${actionAr(signal.action)} — الثقة ${signal.confidence}%. ليست نصيحة مالية. ${MARKET_SIGNAL_DISCLAIMER_AR}`,
    };
  }

  if (event === 'target_reached') {
    return {
      symbol: signal.symbol,
      action: signal.action,
      event,
      channel,
      title: `تم الوصول للهدف على ${signal.symbol}`,
      message: `تم الوصول للهدف: ${signal.symbol} عند ${price(signal.currentPrice, signal.currency)} — الهدف ${price(signal.targetPrice, signal.currency)}. ليست نصيحة مالية. ${MARKET_SIGNAL_DISCLAIMER_AR}`,
    };
  }

  if (event === 'stop_loss_crossed') {
    return {
      symbol: signal.symbol,
      action: signal.action,
      event,
      channel,
      title: `تحذير وقف الخسارة على ${signal.symbol}`,
      message: `تحذير: كسر السهم مستوى وقف الخسارة على ${signal.symbol} — السعر ${price(signal.currentPrice, signal.currency)} — وقف الخسارة ${price(signal.stopLoss, signal.currency)}. ليست نصيحة مالية. ${MARKET_SIGNAL_DISCLAIMER_AR}`,
    };
  }

  if (event === 'confidence_change') {
    return {
      symbol: signal.symbol,
      action: signal.action,
      event,
      channel,
      title: `تغيرت الثقة على ${signal.symbol}`,
      message: `تغيرت الثقة على ${signal.symbol} من ${previous?.confidence ?? '--'}% إلى ${signal.confidence}% — الحالة الحالية ${signal.actionLabelAr}. ليست نصيحة مالية. ${MARKET_SIGNAL_DISCLAIMER_AR}`,
    };
  }

  if (event === 'high_risk') {
    return {
      symbol: signal.symbol,
      action: signal.action,
      event,
      channel,
      title: `تحذير مخاطر مرتفعة على ${signal.symbol}`,
      message: `تحذير: ${signal.symbol} يحمل مستوى مخاطر مرتفع — ${base}${stop}. ليست نصيحة مالية. ${MARKET_SIGNAL_DISCLAIMER_AR}`,
    };
  }

  return {
    symbol: signal.symbol,
    action: signal.action,
    event,
    channel,
    title: `${signal.actionLabelAr}: ${signal.symbol}`,
    message: `انتظار: ${signal.symbol} لا توجد إشارة قوية حالياً — الثقة ${signal.confidence}% — تحت المراقبة. ليست نصيحة مالية. ${MARKET_SIGNAL_DISCLAIMER_AR}`,
  };
}

export function buildSignalNotificationsForPreferences(
  signal: MarketSignal,
  prefs: UserSignalPreferences,
  previous?: MarketSignal | null,
  channels: SignalAlertChannel[] = ['in-app'],
) {
  const events = detectSignalNotificationEvents(signal, previous);
  const drafts: SignalNotificationDraft[] = [];
  for (const channel of channels) {
    for (const event of events) {
      if (shouldNotifySignal(signal, prefs, channel, event)) {
        drafts.push(buildSignalNotification(signal, event, channel, previous));
      }
    }
  }
  return drafts;
}

export function normalizeSignalPreferences(row: Record<string, unknown> | null | undefined): UserSignalPreferences {
  if (!row) return { ...DEFAULT_SIGNAL_PREFERENCES };
  const enabledMarkets = Array.isArray(row.enabled_markets)
    ? row.enabled_markets.map(String)
    : Array.isArray(row.enabledMarkets)
      ? row.enabledMarkets.map(String)
      : DEFAULT_SIGNAL_ENABLED_MARKETS;
  const riskProfile = row.risk_profile === 'conservative' || row.risk_profile === 'aggressive' || row.risk_profile === 'balanced'
    ? row.risk_profile
    : row.riskProfile === 'conservative' || row.riskProfile === 'aggressive' || row.riskProfile === 'balanced'
      ? row.riskProfile
      : DEFAULT_SIGNAL_PREFERENCES.riskProfile;
  const minConfidence = Number(row.min_confidence ?? row.minConfidence ?? DEFAULT_SIGNAL_PREFERENCES.minConfidence);
  return {
    minConfidence: Number.isFinite(minConfidence) ? Math.max(0, Math.min(95, Math.round(minConfidence))) : DEFAULT_SIGNAL_PREFERENCES.minConfidence,
    riskProfile,
    enabledMarkets,
    buyAlertsEnabled: row.buy_alerts_enabled !== false && row.buyAlertsEnabled !== false,
    sellAlertsEnabled: row.sell_alerts_enabled !== false && row.sellAlertsEnabled !== false,
    waitAlertsEnabled: row.wait_alerts_enabled === true || row.waitAlertsEnabled === true,
    emailAlertsEnabled: row.email_alerts_enabled === true || row.emailAlertsEnabled === true,
    inAppAlertsEnabled: row.in_app_alerts_enabled !== false && row.inAppAlertsEnabled !== false,
    telegramAlertsEnabled: row.telegram_alerts_enabled === true || row.telegramAlertsEnabled === true,
    pushAlertsEnabled: row.push_alerts_enabled === true || row.pushAlertsEnabled === true,
  };
}
