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

export type OilScenarioContext = {
  hormuzReferenceMbd?: number | null;
  babElMandebReferenceMbd?: number | null;
  sourceLabel?: string | null;
  referencePeriod?: string | null;
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
  referenceVolumeMbd?: number | null;
  impliedDisruptionMbd?: number | null;
};

export type OilScenarioBand = {
  id: OilScenarioId;
  modeledChangePct: number;
  priceLow: number;
  priceMid: number;
  priceHigh: number;
};

export type OilTargetEquivalent = {
  key: OilScenarioDriverKey;
  currentValue: number;
  requiredValue: number;
  delta: number;
  unit: 'pct' | 'mbd' | 'bps';
  min: number;
  max: number;
  insideConfiguredRange: boolean;
  impliedDisruptionMbd: number | null;
};

export type OilTargetBasketItem = {
  key: OilScenarioDriverKey;
  currentValue: number;
  requiredValue: number;
  delta: number;
  unit: OilTargetEquivalent['unit'];
  contributionDeltaPct: number;
  rangeUtilizationPct: number;
  impliedDisruptionMbd: number | null;
};

export type OilTargetBasketResult = {
  methodology: 'equal_remaining_range_utilization_v1';
  targetPrice: number;
  direction: 'up' | 'down' | 'flat';
  targetReachableWithBasket: boolean;
  requiredGapPct: number;
  availableDirectionalHeadroomPct: number;
  appliedRangeUtilizationPct: number;
  achievedCentralPrice: number;
  fullRangeCentralPrice: number;
  items: OilTargetBasketItem[];
};

export type OilTargetStressResult = {
  methodology: 'single_variable_reverse_sensitivity_v1';
  referencePrice: number;
  targetPrice: number;
  currentCentralPrice: number;
  currentImpactPct: number;
  requiredImpactPct: number;
  impactGapPct: number;
  direction: 'up' | 'down' | 'flat';
  modelReachable: boolean;
  modelImpactBounds: { min: number; max: number };
  context: OilScenarioResult['context'];
  equivalents: OilTargetEquivalent[];
};

export type OilScenarioResult = {
  methodology: 'transparent_sensitivity_model_v2';
  input: OilScenarioInput;
  context: {
    mode: 'official_flow_baseline' | 'percentage_proxy';
    hormuzReferenceMbd: number | null;
    babElMandebReferenceMbd: number | null;
    sourceLabel: string | null;
    referencePeriod: string | null;
  };
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

function referenceFlow(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? clamp(parsed, 0, 40) : null;
}

function scenarioContext(context: OilScenarioContext | undefined) {
  const hormuzReferenceMbd = referenceFlow(context?.hormuzReferenceMbd);
  const babElMandebReferenceMbd = referenceFlow(context?.babElMandebReferenceMbd);
  const hasOfficialFlow = hormuzReferenceMbd !== null && babElMandebReferenceMbd !== null;
  return {
    mode: hasOfficialFlow ? 'official_flow_baseline' as const : 'percentage_proxy' as const,
    hormuzReferenceMbd,
    babElMandebReferenceMbd,
    sourceLabel: hasOfficialFlow ? String(context?.sourceLabel ?? '').trim().slice(0, 160) || null : null,
    referencePeriod: hasOfficialFlow ? String(context?.referencePeriod ?? '').trim().slice(0, 24) || null : null,
  };
}

export function calculateOilScenario(raw: OilScenarioInput, rawContext?: OilScenarioContext): OilScenarioResult {
  const input = sanitizeOilScenarioInput(raw);
  const context = scenarioContext(rawContext);
  const durationFactor = clamp(0.65 + (Math.min(input.durationDays, 180) / 180) * 0.7, 0.65, 1.35);
  const hormuzDisruptionMbd = context.hormuzReferenceMbd === null
    ? null
    : context.hormuzReferenceMbd * input.hormuzDisruptionPct / 100;
  const babElMandebDisruptionMbd = context.babElMandebReferenceMbd === null
    ? null
    : context.babElMandebReferenceMbd * input.babElMandebDisruptionPct / 100;

  const rawDrivers: OilScenarioDriver[] = [
    {
      key: 'hormuz',
      contributionPct: hormuzDisruptionMbd === null ? input.hormuzDisruptionPct * 0.18 : hormuzDisruptionMbd * 2.8,
      referenceVolumeMbd: context.hormuzReferenceMbd,
      impliedDisruptionMbd: hormuzDisruptionMbd,
    },
    {
      key: 'babElMandeb',
      contributionPct: babElMandebDisruptionMbd === null ? input.babElMandebDisruptionPct * 0.08 : babElMandebDisruptionMbd,
      referenceVolumeMbd: context.babElMandebReferenceMbd,
      impliedDisruptionMbd: babElMandebDisruptionMbd,
    },
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
    methodology: 'transparent_sensitivity_model_v2',
    input,
    context,
    durationFactor: round(durationFactor, 3),
    centralImpactPct: round(centralImpactPct),
    drivers,
    scenarios,
  };
}


type TargetLeverSpec = {
  key: OilScenarioDriverKey;
  inputKey: keyof Pick<
    OilScenarioInput,
    | 'hormuzDisruptionPct'
    | 'babElMandebDisruptionPct'
    | 'offlineProductionMbd'
    | 'spareCapacityResponseMbd'
    | 'stockReleaseMbd'
    | 'tankerDisruptionPct'
    | 'freightInsurancePremiumPct'
    | 'demandChangePct'
    | 'policyRateChangeBps'
  >;
  unit: OilTargetEquivalent['unit'];
  min: number;
  max: number;
  coefficient: number;
  referenceVolumeMbd: number | null;
};

function targetLeverSpecs(result: OilScenarioResult): TargetLeverSpec[] {
  const duration = result.durationFactor;
  const hormuzReference = result.context.hormuzReferenceMbd;
  const babReference = result.context.babElMandebReferenceMbd;
  return [
    {
      key: 'hormuz',
      inputKey: 'hormuzDisruptionPct',
      unit: 'pct',
      min: 0,
      max: 100,
      coefficient: duration * (hormuzReference === null ? 0.18 : hormuzReference * 2.8 / 100),
      referenceVolumeMbd: hormuzReference,
    },
    {
      key: 'babElMandeb',
      inputKey: 'babElMandebDisruptionPct',
      unit: 'pct',
      min: 0,
      max: 100,
      coefficient: duration * (babReference === null ? 0.08 : babReference / 100),
      referenceVolumeMbd: babReference,
    },
    { key: 'offlineProduction', inputKey: 'offlineProductionMbd', unit: 'mbd', min: 0, max: 20, coefficient: duration * 2.4, referenceVolumeMbd: null },
    { key: 'spareCapacity', inputKey: 'spareCapacityResponseMbd', unit: 'mbd', min: 0, max: 15, coefficient: duration * -1.8, referenceVolumeMbd: null },
    { key: 'stockRelease', inputKey: 'stockReleaseMbd', unit: 'mbd', min: 0, max: 15, coefficient: duration * -1.5, referenceVolumeMbd: null },
    { key: 'tankers', inputKey: 'tankerDisruptionPct', unit: 'pct', min: 0, max: 100, coefficient: duration * 0.08, referenceVolumeMbd: null },
    { key: 'freightInsurance', inputKey: 'freightInsurancePremiumPct', unit: 'pct', min: 0, max: 300, coefficient: duration * 0.025, referenceVolumeMbd: null },
    { key: 'demand', inputKey: 'demandChangePct', unit: 'pct', min: -15, max: 15, coefficient: duration * 2, referenceVolumeMbd: null },
    { key: 'rates', inputKey: 'policyRateChangeBps', unit: 'bps', min: -500, max: 1000, coefficient: duration * -0.003, referenceVolumeMbd: null },
  ];
}

export function calculateOilTargetStress(
  raw: OilScenarioInput,
  targetPriceInput: number,
  rawContext?: OilScenarioContext,
): OilTargetStressResult {
  const input = sanitizeOilScenarioInput(raw);
  const scenario = calculateOilScenario(input, rawContext);
  const referencePrice = Math.max(0.01, input.referencePrice);
  const targetPrice = clamp(finite(targetPriceInput, referencePrice), 0.01, 2_000);
  const requiredImpactPct = ((targetPrice / referencePrice) - 1) * 100;
  const currentImpactPct = scenario.centralImpactPct;
  const impactGapPct = requiredImpactPct - currentImpactPct;
  const rawImpact = scenario.drivers.reduce((sum, driver) => sum + driver.contributionPct, 0);
  const driverContribution = new Map(scenario.drivers.map(driver => [driver.key, driver.contributionPct]));
  const modelReachable = requiredImpactPct >= -55 && requiredImpactPct <= 135;

  const equivalents = targetLeverSpecs(scenario).map(spec => {
    const currentValue = input[spec.inputKey];
    const currentContribution = driverContribution.get(spec.key) ?? 0;
    const otherContribution = rawImpact - currentContribution;
    const requiredValue = spec.coefficient === 0
      ? Number.NaN
      : (requiredImpactPct - otherContribution) / spec.coefficient;
    const insideConfiguredRange = modelReachable
      && Number.isFinite(requiredValue)
      && requiredValue >= spec.min
      && requiredValue <= spec.max;
    const impliedDisruptionMbd = spec.referenceVolumeMbd !== null && Number.isFinite(requiredValue)
      ? spec.referenceVolumeMbd * requiredValue / 100
      : null;

    return {
      key: spec.key,
      currentValue: round(currentValue, 3),
      requiredValue: round(requiredValue, 3),
      delta: round(requiredValue - currentValue, 3),
      unit: spec.unit,
      min: spec.min,
      max: spec.max,
      insideConfiguredRange,
      impliedDisruptionMbd: impliedDisruptionMbd === null ? null : round(impliedDisruptionMbd, 3),
    };
  });

  return {
    methodology: 'single_variable_reverse_sensitivity_v1',
    referencePrice,
    targetPrice: round(targetPrice),
    currentCentralPrice: round(priceFromImpact(referencePrice, currentImpactPct)),
    currentImpactPct: round(currentImpactPct),
    requiredImpactPct: round(requiredImpactPct),
    impactGapPct: round(impactGapPct),
    direction: Math.abs(impactGapPct) < 0.05 ? 'flat' : impactGapPct > 0 ? 'up' : 'down',
    modelReachable,
    modelImpactBounds: { min: -55, max: 135 },
    context: scenario.context,
    equivalents,
  };
}


export function calculateOilBalancedTargetBasket(
  raw: OilScenarioInput,
  targetPriceInput: number,
  rawContext?: OilScenarioContext,
): OilTargetBasketResult {
  const input = sanitizeOilScenarioInput(raw);
  const scenario = calculateOilScenario(input, rawContext);
  const target = calculateOilTargetStress(input, targetPriceInput, rawContext);
  const direction = target.direction;

  if (direction === 'flat') {
    return {
      methodology: 'equal_remaining_range_utilization_v1',
      targetPrice: target.targetPrice,
      direction,
      targetReachableWithBasket: true,
      requiredGapPct: 0,
      availableDirectionalHeadroomPct: 0,
      appliedRangeUtilizationPct: 0,
      achievedCentralPrice: target.currentCentralPrice,
      fullRangeCentralPrice: target.currentCentralPrice,
      items: [],
    };
  }

  const directionSign = direction === 'up' ? 1 : -1;
  const specs = targetLeverSpecs(scenario);
  const candidates = specs.flatMap(spec => {
    const currentValue = input[spec.inputKey];
    const extreme = direction === 'up'
      ? spec.coefficient >= 0 ? spec.max : spec.min
      : spec.coefficient >= 0 ? spec.min : spec.max;
    const fullContributionDelta = (extreme - currentValue) * spec.coefficient;
    const directionalHeadroom = fullContributionDelta * directionSign;
    if (!Number.isFinite(directionalHeadroom) || directionalHeadroom <= 0.0001) return [];
    return [{
      spec,
      currentValue,
      extreme,
      fullContributionDelta,
      directionalHeadroom,
    }];
  });

  const availableDirectionalHeadroomPct = candidates.reduce((sum, item) => sum + item.directionalHeadroom, 0);
  const requiredGapPct = Math.abs(target.impactGapPct);
  const rawUtilization = availableDirectionalHeadroomPct > 0 ? requiredGapPct / availableDirectionalHeadroomPct : Number.POSITIVE_INFINITY;
  const appliedUtilization = Math.min(1, Math.max(0, rawUtilization));
  const targetReachableWithBasket = target.modelReachable
    && Number.isFinite(rawUtilization)
    && rawUtilization <= 1 + 0.0001;

  const items: OilTargetBasketItem[] = candidates.map(({ spec, currentValue, extreme, fullContributionDelta }) => {
    const requiredValue = currentValue + (extreme - currentValue) * appliedUtilization;
    const contributionDeltaPct = fullContributionDelta * appliedUtilization;
    const impliedDisruptionMbd = spec.referenceVolumeMbd !== null
      ? spec.referenceVolumeMbd * requiredValue / 100
      : null;
    return {
      key: spec.key,
      currentValue: round(currentValue, 3),
      requiredValue: round(requiredValue, 3),
      delta: round(requiredValue - currentValue, 3),
      unit: spec.unit,
      contributionDeltaPct: round(contributionDeltaPct),
      rangeUtilizationPct: round(appliedUtilization * 100, 1),
      impliedDisruptionMbd: impliedDisruptionMbd === null ? null : round(impliedDisruptionMbd, 3),
    };
  });

  const appliedImpact = items.reduce((sum, item) => sum + item.contributionDeltaPct, 0);
  const fullImpact = candidates.reduce((sum, item) => sum + item.fullContributionDelta, 0);
  const achievedImpactPct = clamp(scenario.centralImpactPct + appliedImpact, -55, 135);
  const fullRangeImpactPct = clamp(scenario.centralImpactPct + fullImpact, -55, 135);

  return {
    methodology: 'equal_remaining_range_utilization_v1',
    targetPrice: target.targetPrice,
    direction,
    targetReachableWithBasket,
    requiredGapPct: round(requiredGapPct),
    availableDirectionalHeadroomPct: round(availableDirectionalHeadroomPct),
    appliedRangeUtilizationPct: round(appliedUtilization * 100, 1),
    achievedCentralPrice: round(priceFromImpact(target.referencePrice, achievedImpactPct)),
    fullRangeCentralPrice: round(priceFromImpact(target.referencePrice, fullRangeImpactPct)),
    items,
  };
}
