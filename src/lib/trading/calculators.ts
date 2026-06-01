export type TradingInstrumentType = 'forex' | 'metals' | 'indices' | 'crypto' | 'stocks';
export type TradeDirection = 'buy' | 'sell';

export type PositionSizeInput = {
  accountBalance: number;
  riskPercentage: number;
  stopLossDistance: number;
  instrumentType: TradingInstrumentType;
  entryPrice?: number;
  stopLossPrice?: number;
};

export type PositionSizeResult = {
  riskAmount: number;
  stopLossDistance: number;
  positionSize: number;
  lotSize: number | null;
  estimatedLoss: number;
  riskWarning: boolean;
};

export type PipsInput = {
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  direction: TradeDirection;
  pair: string;
};

export type PipsResult = {
  pips: number;
  profitLoss: number;
};

export type LotSizeInput = {
  accountBalance: number;
  riskPercentage: number;
  stopLossPips: number;
  pipValue: number;
};

export type LotSizeResult = {
  recommendedLotSize: number;
  microLots: number;
  miniLots: number;
  standardLots: number;
  riskAmount: number;
};

const CONTRACT_SIZES: Record<TradingInstrumentType, number> = {
  forex: 100000,
  metals: 100,
  indices: 1,
  crypto: 1,
  stocks: 1,
};

export function safeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number'
    ? value
    : Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const accountBalance = Math.max(0, safeNumber(input.accountBalance));
  const riskPercentage = Math.max(0, safeNumber(input.riskPercentage));
  const explicitDistance = Math.max(0, safeNumber(input.stopLossDistance));
  const entryPrice = safeNumber(input.entryPrice);
  const stopLossPrice = safeNumber(input.stopLossPrice);
  const derivedDistance = entryPrice > 0 && stopLossPrice > 0 ? Math.abs(entryPrice - stopLossPrice) : 0;
  const stopLossDistance = derivedDistance || explicitDistance;
  const riskAmount = accountBalance * (riskPercentage / 100);
  const contractSize = CONTRACT_SIZES[input.instrumentType] ?? 1;
  const positionSize = stopLossDistance > 0 ? riskAmount / stopLossDistance : 0;
  const lotSize = input.instrumentType === 'forex' && contractSize > 0 ? positionSize / contractSize : null;

  return {
    riskAmount,
    stopLossDistance,
    positionSize,
    lotSize,
    estimatedLoss: riskAmount,
    riskWarning: riskPercentage > 2,
  };
}

export function pipSizeForPair(pair: string) {
  const normalized = pair.replace(/[^A-Z]/gi, '').toUpperCase();
  return normalized.endsWith('JPY') ? 0.01 : 0.0001;
}

export function calculatePips(input: PipsInput): PipsResult {
  const entryPrice = safeNumber(input.entryPrice);
  const exitPrice = safeNumber(input.exitPrice);
  const lotSize = Math.max(0, safeNumber(input.lotSize));
  const pipSize = pipSizeForPair(input.pair);
  const rawPips = pipSize > 0 ? (exitPrice - entryPrice) / pipSize : 0;
  const directionalPips = input.direction === 'sell' ? -rawPips : rawPips;
  const profitLoss = directionalPips * 10 * lotSize;

  return {
    pips: directionalPips,
    profitLoss,
  };
}

export function calculateLotSizeByRisk(input: LotSizeInput): LotSizeResult {
  const accountBalance = Math.max(0, safeNumber(input.accountBalance));
  const riskPercentage = Math.max(0, safeNumber(input.riskPercentage));
  const stopLossPips = Math.max(0, safeNumber(input.stopLossPips));
  const pipValue = Math.max(0, safeNumber(input.pipValue));
  const riskAmount = accountBalance * (riskPercentage / 100);
  const recommendedLotSize = stopLossPips > 0 && pipValue > 0 ? riskAmount / (stopLossPips * pipValue) : 0;

  return {
    recommendedLotSize,
    microLots: recommendedLotSize * 100,
    miniLots: recommendedLotSize * 10,
    standardLots: recommendedLotSize,
    riskAmount,
  };
}
