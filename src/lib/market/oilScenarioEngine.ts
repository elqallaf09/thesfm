export type OilScenarioInput = {
  referencePrice: number;
  hormuzDisruptionPct: number;
  babElMandebDisruptionPct: number;
  offlineProductionMbd: number;
  spareCapacityResponseMbd: number;
  stockReleaseMbd: number;
  tankerDisruptionPct: number;
  freightInsurancePremiumPct: number;
  demandChangePct: number;
  policyRateChangeBps: number;
  durationDays: number;
};

export type OilScenarioId = 'lower' | 'central' | 'higher';

export type OilScenarioDriverKey =
  | 'hormuz'
  | 'babElMandeb'
  | 'offlineProduction'
  | 'spareCapacity'
  | 'stockRelease'
  | 'tankers'
  | 'freightInsurance'
  | 'demand'
  | 'rates';

export type OilScenarioDriver = {
  key: OilScenarioDriverKey;
  contributionPct: number;
};

export type OilScenarioBand = {
  id: OilScenarioId;
  modeledChangePct: number;
  priceLow: number;
  priceMid: number;
  priceHigh: number;
};

export type OilScenarioResult = {
  methodology: 'transparent_sensitivity_model_v1';
  input: OilScenarioInput;
  durationFactor: number;
  centralImpactPct: number;
  drivers: OilScenarioDriver[];
  scenarios: OilScenarioBand[];
};

export const DEFAULT_OIL_SCENARIO_INPUT: OilScenarioInput = {
  referencePrice: 0,
  hormuzDisruptionPct: 0,
  babElMandebDisruptionPct: 0,
  offlineProductionMbd: 0,
  spareCapacityResponseMbd: 0,
  stockReleaseMbd: 0,
  tankerDisruptionPct: 0,
  freightInsurancePremiumPct: 0,
  demandChangePct: 0,
  policyRateChangeBps: 0,
  durationDays: 30,
};

const LIMITS: Record<keyof OilScenarioInput, readonly [number, number]> = {
  referencePrice: [0, 500],
  hormuzDisruptionPct: [0, 100],
  babElMandebDisruptionPct: [0, 100],
  offlineProductionMbd: [0, 20],
  spareCapacityResponseMbd: [0, 15],
  stockReleaseMbd: [0, 15],
  tankerDisruptionPct: [0, 100],
  freightInsurancePremiumPct: [0, 300],
  demandChangePct: [-15, 15],
  policyRateChangeBps: [-500, 1000],
  durationDays: [1, 365],
};

const SCENARIO_MULTIPLIERS: Record<OilScenarioId, number> = {
  lower: 0.65,
  central: 1,
  higher: 1.45,
};

function finite(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

export function sanitizeOilScenarioInput(raw: Partial<OilScenarioInput>): OilScenarioInput {
  const next = { ...DEFAULT_OIL_SCENARIO_INPUT, ...raw };
  return (Object.keys(DEFAULT_OIL_SCENARIO_INPUT) as Array<keyof OilScenarioInput>).reduce<OilScenarioInput>(
    (result, key) => {
      const [min, max] = LIMITS[key];
      result[key] = clamp(finite(next[key], DEFAULT_OIL_SCENARIO_INPUT[key]), min, max);
      return result;
    },
    { ...DEFAULT_OIL_SCENARIO_INPUT },
  );
}

function priceFromImpact(referencePrice: number, impactPct: number) {
  return Math.max(0.01, referencePrice * (1 + impactPct / 100));
}

export function calculateOilScenario(raw: OilScenarioInput): OilScenarioResult {
  const input = sanitizeOilScenarioInput(raw);
  const durationFactor = clamp(0.65 + (Math.min(input.durationDays, 180) / 180) * 0.7, 0.65, 1.35);

  const rawDrivers: OilScenarioDriver[] = [
    { key: 'hormuz', contributionPct: input.hormuzDisruptionPct * 0.18 },
    { key: 'babElMandeb', contributionPct: input.babElMandebDisruptionPct * 0.08 },
    { key: 'offlineProduction', contributionPct: input.offlineProductionMbd * 2.4 },
    { key: 'spareCapacity', contributionPct: input.spareCapacityResponseMbd * -1.8 },
    { key: 'stockRelease', contributionPct: input.stockReleaseMbd * -1.5 },
    { key: 'tankers', contributionPct: input.tankerDisruptionPct * 0.08 },
    { key: 'freightInsurance', contributionPct: input.freightInsurancePremiumPct * 0.025 },
    { key: 'demand', contributionPct: input.demandChangePct * 2 },
    { key: 'rates', contributionPct: input.policyRateChangeBps * -0.003 },
  ];

  const drivers = rawDrivers
    .map(driver => ({ ...driver, contributionPct: round(driver.contributionPct * durationFactor) }))
    .sort((a, b) => Math.abs(b.contributionPct) - Math.abs(a.contributionPct));

  const centralImpactPct = clamp(
    drivers.reduce((sum, driver) => sum + driver.contributionPct, 0),
    -55,
    135,
  );

  const scenarios = (Object.keys(SCENARIO_MULTIPLIERS) as OilScenarioId[]).map(id => {
    const modeledChangePct = clamp(centralImpactPct * SCENARIO_MULTIPLIERS[id], -65, 200);
    const halfWidthPct = Math.abs(modeledChangePct) < 0.01
      ? 0
      : Math.min(24, 1.5 + Math.abs(modeledChangePct) * (id === 'higher' ? 0.22 : id === 'lower' ? 0.14 : 0.18));
    return {
      id,
      modeledChangePct: round(modeledChangePct),
      priceLow: round(priceFromImpact(input.referencePrice, modeledChangePct - halfWidthPct)),
      priceMid: round(priceFromImpact(input.referencePrice, modeledChangePct)),
      priceHigh: round(priceFromImpact(input.referencePrice, modeledChangePct + halfWidthPct)),
    };
  });

  return {
    methodology: 'transparent_sensitivity_model_v1',
    input,
    durationFactor: round(durationFactor, 3),
    centralImpactPct: round(centralImpactPct),
    drivers,
    scenarios,
  };
}
