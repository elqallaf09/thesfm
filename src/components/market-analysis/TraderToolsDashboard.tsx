'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, BarChart3, Calculator, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Gauge, Landmark, LineChart, Percent, PieChart, RefreshCw, ShieldAlert, Sparkles, TrendingUp, WalletCards } from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { calculateLotSizeByRisk, calculatePips, calculatePositionSize, type TradeDirection, type TradingInstrumentType } from '@/lib/trading/calculators';
import type { MarketAssetType } from '@/lib/market/marketService';
import { currencyDisplaySymbol } from '@/lib/currencies';
import { normalizeDigits } from '@/lib/locale';
import type { ApiListState, MarketAssetFilter, MarketAiInsightView, MarketResultWithMeta,
  MarketSearchSuggestion, MarketServiceState, MarketViewAnalysis, PipCalculatorAsset,
  PipCalculatorAssetType, ScenarioCurrencyCode, AccountCurrencyCode, TraderToolsSubTab,
  MarketPerformanceItem } from './types';
import {
  ACCOUNT_CURRENCY_OPTIONS, SCENARIO_CURRENCY_OPTIONS, PIP_CALCULATOR_ASSETS,
  PIP_CALCULATOR_ASSET_TYPES, DEFAULT_PIP_CALCULATOR_ASSET, MARKET_TOOL_REQUEST_TIMEOUT_MS,
  money, percent, formatNumber, getPipCalculatorAsset, pipAssetTypeTranslationKey,
  pipAssetName, pipCalculatorWarningKey, sanitizeMarketToolMessage, logMarketToolPerformance,
  marketToolFailureState, isAbortLikeError, normalizePerformanceTrend, assetTypeTranslationKey,
  normalizeAccountCurrency, parseNumber,
} from './utils';
import { EmptyToolState, MarketSectionLoading } from './NewsSentimentPanel';

export function TraderToolsDashboard({
  t,
  locale,
  currency,
  subTab,
  setSubTab,
  performance,
}: {
  t: (key: string) => string;
  locale: string;
  currency: string;
  subTab: TraderToolsSubTab;
  setSubTab: (tab: TraderToolsSubTab) => void;
  performance: ApiListState<MarketPerformanceItem>;
}) {
  const defaultPositionInput = {
    accountBalance: '10000',
    riskPercentage: '1',
    stopLossDistance: '50',
    instrumentType: 'forex' as TradingInstrumentType,
    entryPrice: '',
    stopLossPrice: '',
  };
  const defaultPipsInput = {
    assetType: 'forex' as PipCalculatorAssetType,
    assetSymbol: DEFAULT_PIP_CALCULATOR_ASSET.internalSymbol,
    pair: DEFAULT_PIP_CALCULATOR_ASSET.internalSymbol,
    entryPrice: '1.0800',
    exitPrice: '1.0850',
    lotSize: '1',
    direction: 'buy' as TradeDirection,
    pointSize: String(DEFAULT_PIP_CALCULATOR_ASSET.pointSize),
    pipValue: String(DEFAULT_PIP_CALCULATOR_ASSET.defaultPointValue),
  };
  const defaultLotInput = {
    accountBalance: '10000',
    riskPercentage: '1',
    stopLossPips: '50',
    pipValue: '10',
    assetType: 'EURUSD',
  };
  const defaultMarginInput = {
    tradeSize: '100000',
    leverage: '100',
    currentPrice: '1',
  };
  const [positionInput, setPositionInput] = useState({ ...defaultPositionInput });
  const [pipsInput, setPipsInput] = useState({ ...defaultPipsInput });
  const [lotInput, setLotInput] = useState({ ...defaultLotInput });
  const [marginInput, setMarginInput] = useState({ ...defaultMarginInput });
  const [accountCurrency, setAccountCurrency] = useState<AccountCurrencyCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('calculator_account_currency') as AccountCurrencyCode | null;
      if (saved) return normalizeAccountCurrency(saved);
    }
    return normalizeAccountCurrency(currency);
  });
  const [accountCurrencyTouched, setAccountCurrencyTouched] = useState(false);
  const [currencyMessage, setCurrencyMessage] = useState('');
  const [currencyError, setCurrencyError] = useState('');

  useEffect(() => {
    if (!accountCurrencyTouched) {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('calculator_account_currency') as AccountCurrencyCode | null : null;
      setAccountCurrency(normalizeAccountCurrency(saved ?? currency));
    }
  }, [accountCurrencyTouched, currency]);

  const position = calculatePositionSize({
    accountBalance: parseNumber(positionInput.accountBalance),
    riskPercentage: parseNumber(positionInput.riskPercentage),
    stopLossDistance: parseNumber(positionInput.stopLossDistance),
    instrumentType: positionInput.instrumentType,
    entryPrice: parseNumber(positionInput.entryPrice),
    stopLossPrice: parseNumber(positionInput.stopLossPrice),
  });
  const pips = calculatePips({
    pair: pipsInput.pair,
    entryPrice: parseNumber(pipsInput.entryPrice),
    exitPrice: parseNumber(pipsInput.exitPrice),
    lotSize: parseNumber(pipsInput.lotSize),
    direction: pipsInput.direction,
    pipSize: parseNumber(pipsInput.pointSize),
    pipValuePerLot: parseNumber(pipsInput.pipValue),
  });
  const lots = calculateLotSizeByRisk({
    accountBalance: parseNumber(lotInput.accountBalance),
    riskPercentage: parseNumber(lotInput.riskPercentage),
    stopLossPips: parseNumber(lotInput.stopLossPips),
    pipValue: parseNumber(lotInput.pipValue),
  });
  const margin = {
    required: parseNumber(marginInput.leverage) > 0
      ? (parseNumber(marginInput.tradeSize) * parseNumber(marginInput.currentPrice)) / parseNumber(marginInput.leverage)
      : 0,
    leverage: parseNumber(marginInput.leverage),
    tradeSize: parseNumber(marginInput.tradeSize),
  };
  const pipUnit = t('market_unit_pip');
  const pipAssetOptions = PIP_CALCULATOR_ASSETS[pipsInput.assetType] ?? PIP_CALCULATOR_ASSETS.forex;
  const selectedPipAsset = getPipCalculatorAsset(pipsInput.assetType, pipsInput.assetSymbol);
  const pipsPointSize = parseNumber(pipsInput.pointSize);
  const pipsPointValue = parseNumber(pipsInput.pipValue);
  const pipsPriceDifference = pipsInput.direction === 'sell'
    ? parseNumber(pipsInput.entryPrice) - parseNumber(pipsInput.exitPrice)
    : parseNumber(pipsInput.exitPrice) - parseNumber(pipsInput.entryPrice);
  const pipsTradeStatus = Math.abs(pips.profitLoss) < 0.000001 ? t('market_trade_breakeven') : pips.profitLoss > 0 ? t('market_trade_profit') : t('market_trade_loss');
  const pipsValidationMessage = pipsPointSize <= 0
    ? t('market_valid_point_size_required')
    : pipsPointValue <= 0
      ? t('market_valid_point_value_required')
      : parseNumber(pipsInput.entryPrice) <= 0
        ? t('market_valid_entry_price_required')
        : parseNumber(pipsInput.exitPrice) <= 0
          ? t('market_valid_exit_price_required')
          : parseNumber(pipsInput.lotSize) <= 0
            ? t('market_valid_lot_size_required')
            : '';
  const positionBalance = parseNumber(positionInput.accountBalance);
  const positionRiskPercentage = parseNumber(positionInput.riskPercentage);
  const positionStopDistance = position.stopLossDistance;
  const positionCanCalculate = positionBalance > 0 && positionRiskPercentage > 0 && positionStopDistance > 0;
  const positionUnitValue = `${formatNumber(position.positionSize, positionInput.instrumentType === 'stocks' ? 0 : 2)} ${t('market_units')}`;
  const lotValue = position.lotSize === null ? positionUnitValue : `${formatNumber(position.lotSize, 2)} ${t('market_lot_unit')}`;
  const riskPercentDisplay = `${formatNumber(parseNumber(positionInput.riskPercentage), 2)}%`;
  const stopLossDisplay = `${formatNumber(parseNumber(positionInput.stopLossDistance), 0)} ${pipUnit}`;
  const positionInputStatus = positionBalance <= 0
    ? t('market_valid_account_balance_required')
    : positionRiskPercentage <= 0
      ? t('market_valid_risk_percentage_required')
      : positionStopDistance <= 0
        ? t('market_valid_stop_loss_required')
        : t('market_inputs_ready');
  const positionSummaryRows: Array<[string, string, 'ltr' | 'auto', ReactNode]> = [
    [t('market_account_currency'), accountCurrency, 'ltr' as const, <WalletCards key="side-currency" size={16} />],
    [t('market_account_balance'), money(positionBalance, accountCurrency), 'ltr' as const, <WalletCards key="side-balance" size={16} />],
    [t('market_risk_percentage'), riskPercentDisplay, 'ltr' as const, <Percent key="side-risk" size={16} />],
    [t('market_input_status'), positionInputStatus, 'auto' as const, <CheckCircle2 key="side-status" size={16} />],
  ];
  const activeSummaryRows: Array<[string, string, 'ltr' | 'auto', ReactNode]> = subTab === 'pips'
    ? [
      [t('market_asset_symbol'), selectedPipAsset.symbol, 'ltr', <LineChart key="side-pips-symbol" size={16} />],
      [t('market_number_of_pips'), `${formatNumber(pips.pips, 1)} ${pipUnit}`, 'ltr', <Gauge key="side-pips-count" size={16} />],
      [t('market_profit_loss'), money(pips.profitLoss, accountCurrency), 'ltr', <TrendingUp key="side-pips-pl" size={16} />],
    ]
    : subTab === 'lot'
      ? [
        [t('market_recommended_lot_size'), `${formatNumber(lots.recommendedLotSize, 4)} ${t('market_lot_unit')}`, 'ltr', <PieChart key="side-lot-size" size={16} />],
        [t('market_cash_risk'), money(lots.riskAmount, accountCurrency), 'ltr', <ShieldAlert key="side-lot-risk" size={16} />],
        [t('market_stop_loss_pips'), `${formatNumber(parseNumber(lotInput.stopLossPips), 1)} ${pipUnit}`, 'ltr', <Gauge key="side-lot-stop" size={16} />],
      ]
      : subTab === 'margin'
        ? [
          [t('market_required_margin'), money(margin.required, accountCurrency), 'ltr', <Landmark key="side-margin-required" size={16} />],
          [t('market_trade_size'), formatNumber(margin.tradeSize, 2), 'ltr', <TrendingUp key="side-margin-size" size={16} />],
          [t('market_leverage'), `1:${formatNumber(margin.leverage, 0)}`, 'ltr', <Gauge key="side-margin-leverage" size={16} />],
        ]
        : positionSummaryRows;

  const handleSaveDefaultCurrency = () => {
    setCurrencyMessage('');
    setCurrencyError('');
    try {
      window.localStorage.setItem('calculator_account_currency', accountCurrency);
      setCurrencyMessage(t('market_account_currency_saved'));
    } catch {
      setCurrencyError(t('market_account_currency_save_error'));
    }
  };

  const accountCurrencyOptions = ACCOUNT_CURRENCY_OPTIONS.map(code => [code, code] as [string, string]);
  const toolItems: Array<{ id: TraderToolsSubTab; title: string; description: string; icon: ReactNode }> = [
    { id: 'risk', title: t('market_risk_position_calculator'), description: t('market_risk_position_description'), icon: <ShieldAlert size={18} /> },
    { id: 'pips', title: t('market_pip_value_calculator'), description: t('market_pips_description'), icon: <LineChart size={18} /> },
    { id: 'lot', title: t('market_risk_reward_calculator'), description: t('market_lot_by_risk_description'), icon: <Calculator size={18} /> },
    { id: 'margin', title: t('market_margin_calculator'), description: t('market_margin_description'), icon: <Landmark size={18} /> },
    { id: 'performance', title: t('market_asset_performance'), description: t('market_asset_performance_description'), icon: <BarChart3 size={18} /> },
  ];
  const activeTool = toolItems.find(item => item.id === subTab) ?? toolItems[0];
  const activeDescription = activeTool.description;
  const activeToolZeroIndex = Math.max(0, toolItems.findIndex(item => item.id === activeTool.id));
  const activeToolIndex = activeToolZeroIndex + 1;
  const isRtlLocale = locale === 'ar';
  const selectToolByOffset = (offset: number) => {
    const nextIndex = (activeToolZeroIndex + offset + toolItems.length) % toolItems.length;
    setSubTab(toolItems[nextIndex].id);
  };
  const renderToolPanel = (toolId: TraderToolsSubTab) => {
    if (toolId === 'risk') {
      return (
        <div className="trader-premium-panel-grid">
          <article className="trader-tool-card trader-tool-input-card">
            <div className="trader-tool-card-head">
              <span><ShieldAlert size={18} /></span>
              <div>
                <h3>{t('market_risk_position_calculator')}</h3>
                <p>{t('market_risk_position_description')}</p>
              </div>
              <button type="button" className="tool-reset" onClick={() => setPositionInput({ ...defaultPositionInput })}>
                {t('market_reset')}
              </button>
            </div>
            <div className="trader-field-groups">
              <TraderFieldGroup title={t('market_account_settings')} icon={<WalletCards size={15} />}>
                <ToolSelect
                  label={t('market_account_currency')}
                  helper={t('market_account_currency_hint')}
                  value={accountCurrency}
                  onChange={value => {
                    setAccountCurrency(normalizeAccountCurrency(value));
                    setAccountCurrencyTouched(true);
                    setCurrencyMessage('');
                    setCurrencyError('');
                  }}
                  options={accountCurrencyOptions}
                />
                <ToolInput label={t('market_account_balance')} helper={t('market_account_balance_hint')} prefix={accountCurrency} value={positionInput.accountBalance} onChange={value => setPositionInput(prev => ({ ...prev, accountBalance: value }))} />
              </TraderFieldGroup>

              <TraderFieldGroup title={t('market_risk_settings')} icon={<ShieldAlert size={15} />}>
                <ToolInput label={t('market_risk_percentage')} helper={t('market_risk_percentage_hint')} suffix="%" value={positionInput.riskPercentage} onChange={value => setPositionInput(prev => ({ ...prev, riskPercentage: value }))} />
                <ToolInput label={t('market_stop_loss')} helper={t('market_stop_loss_hint')} suffix={pipUnit} value={positionInput.stopLossDistance} onChange={value => setPositionInput(prev => ({ ...prev, stopLossDistance: value }))} />
              </TraderFieldGroup>

              <TraderFieldGroup title={t('market_instrument_type')} icon={<Gauge size={15} />}>
                <ToolSelect
                  label={t('market_instrument_type')}
                  helper={t('market_instrument_type_hint')}
                  value={positionInput.instrumentType}
                  onChange={value => setPositionInput(prev => ({ ...prev, instrumentType: value as TradingInstrumentType }))}
                  options={[
                    ['forex', t('market_asset_forex')],
                    ['metals', t('market_gold_metals')],
                    ['indices', t('market_indices')],
                    ['crypto', t('market_asset_crypto')],
                    ['stocks', t('market_asset_stocks')],
                  ]}
                />
              </TraderFieldGroup>

              <details className="tool-advanced">
                <summary>{t('market_advanced_settings')}</summary>
                <div className="trader-form-grid">
                  <ToolInput label={t('market_entry_price_optional')} helper={t('market_entry_price_hint')} prefix={accountCurrency} value={positionInput.entryPrice} onChange={value => setPositionInput(prev => ({ ...prev, entryPrice: value }))} />
                  <ToolInput label={t('market_stop_price_optional')} helper={t('market_stop_price_hint')} prefix={accountCurrency} value={positionInput.stopLossPrice} onChange={value => setPositionInput(prev => ({ ...prev, stopLossPrice: value }))} />
                </div>
              </details>
            </div>
          </article>

          <aside className="trader-result-stack trader-premium-result-stack">
            <section className="trader-highlight-result" aria-live="polite">
              <span>{t('market_suitable_position_size')}</span>
              <strong dir="ltr">{lotValue}</strong>
              <p>
                {positionCanCalculate ? (
                  <>
                    {t('market_risk_result_explanation_start')}{' '}
                    <b dir="ltr">{money(position.riskAmount, accountCurrency)}</b>{' '}
                    {t('market_risk_result_explanation_middle')}{' '}
                    <b dir="ltr">{riskPercentDisplay}</b>{' '}
                    {t('market_risk_result_explanation_end')}{' '}
                    <b dir="ltr">{stopLossDisplay}</b>.
                  </>
                ) : positionInputStatus}
              </p>
            </section>
            <ResultGrid title={t('market_calculation_results')} subtitle={t('market_live_calculation_note')} rows={[
              [t('market_risk_amount'), money(position.riskAmount, accountCurrency), 'ltr', <CircleDollarSign key="risk-amount" size={16} />],
              [t('market_suggested_position_size'), positionUnitValue, 'ltr', <TrendingUp key="position-size" size={16} />],
              [positionInput.instrumentType === 'forex' ? t('market_lot_size') : t('market_units'), lotValue, 'ltr', <PieChart key="lot-size" size={16} />],
              [t('market_expected_loss'), money(position.estimatedLoss, accountCurrency), 'ltr', <ShieldAlert key="expected-loss" size={16} />],
            ]} />
            <FormulaCard
              title={t('market_calculation_method')}
              body={t('market_risk_formula')}
              example={`${accountCurrency} ${formatNumber(parseNumber(positionInput.accountBalance), 2)} x ${formatNumber(parseNumber(positionInput.riskPercentage), 2)}% = ${money(position.riskAmount, accountCurrency)}`}
            />
            {position.riskWarning && <p className="tool-warning">{t('market_risk_above_two_warning')}</p>}
            {!positionCanCalculate && <p className="tool-warning">{positionInputStatus}</p>}
          </aside>
        </div>
      );
    }

    if (toolId === 'pips') {
      return (
        <div className="trader-premium-panel-grid">
          <article className="trader-tool-card trader-tool-input-card">
            <div className="trader-tool-card-head">
              <span><LineChart size={18} /></span>
              <div>
                <h3>{t('market_pip_value_calculator')}</h3>
                <p>{t('market_pips_description')}</p>
              </div>
              <button type="button" className="tool-reset" onClick={() => setPipsInput({ ...defaultPipsInput })}>
                {t('market_reset')}
              </button>
            </div>
            <div className="trader-field-groups">
              <TraderFieldGroup title={t('market_instrument_type')} icon={<LineChart size={15} />}>
                <ToolSelect
                  label={t('market_asset_type')}
                  helper={t('market_instrument_type_hint')}
                  value={pipsInput.assetType}
                  onChange={value => {
                    const nextType = value as PipCalculatorAssetType;
                    const nextAsset = PIP_CALCULATOR_ASSETS[nextType][0] ?? DEFAULT_PIP_CALCULATOR_ASSET;
                    setPipsInput(prev => ({
                      ...prev,
                      assetType: nextType,
                      assetSymbol: nextAsset.internalSymbol,
                      pair: nextAsset.internalSymbol,
                      pointSize: String(nextAsset.pointSize),
                      pipValue: String(nextAsset.defaultPointValue),
                    }));
                  }}
                  options={PIP_CALCULATOR_ASSET_TYPES.map(type => [type, t(pipAssetTypeTranslationKey(type))])}
                />
                <ToolSelect
                  label={t('market_asset_symbol')}
                  helper={t('market_asset_symbol_hint')}
                  value={pipsInput.assetSymbol}
                  onChange={value => {
                    const nextAsset = getPipCalculatorAsset(pipsInput.assetType, value);
                    setPipsInput(prev => ({
                      ...prev,
                      assetSymbol: nextAsset.internalSymbol,
                      pair: nextAsset.internalSymbol,
                      pointSize: String(nextAsset.pointSize),
                      pipValue: String(nextAsset.defaultPointValue),
                    }));
                  }}
                  options={pipAssetOptions.map(asset => [asset.internalSymbol, `${pipAssetName(asset, locale)} - ${asset.symbol}`])}
                />
              </TraderFieldGroup>

              <TraderFieldGroup title={t('market_trade_direction')} icon={<TrendingUp size={15} />}>
                <ToolInput label={t('market_entry_price')} helper={t('market_entry_price_hint')} value={pipsInput.entryPrice} onChange={value => setPipsInput(prev => ({ ...prev, entryPrice: value }))} />
                <ToolInput label={t('market_exit_price')} helper={t('market_exit_price_hint')} value={pipsInput.exitPrice} onChange={value => setPipsInput(prev => ({ ...prev, exitPrice: value }))} />
                <ToolInput label={t('market_lot_size')} helper={t('market_lot_size_hint')} suffix={t('market_lot_unit')} value={pipsInput.lotSize} onChange={value => setPipsInput(prev => ({ ...prev, lotSize: value }))} />
                <ToolSegmented
                  label={t('market_trade_direction')}
                  helper={t('market_trade_direction_hint')}
                  value={pipsInput.direction}
                  onChange={value => setPipsInput(prev => ({ ...prev, direction: value as TradeDirection }))}
                  options={[
                    ['buy', t('market_buy')],
                    ['sell', t('market_sell')],
                  ]}
                />
              </TraderFieldGroup>

              <TraderFieldGroup title={t('market_advanced_settings')} icon={<Gauge size={15} />}>
                <ToolInput label={t('market_point_size')} helper={t('market_point_size_hint')} suffix={pipUnit} value={pipsInput.pointSize} onChange={value => setPipsInput(prev => ({ ...prev, pointSize: value }))} />
                <ToolInput label={t('market_point_value_per_lot')} helper={t('market_point_value_per_lot_hint')} prefix={accountCurrency} value={pipsInput.pipValue} onChange={value => setPipsInput(prev => ({ ...prev, pipValue: value }))} />
              </TraderFieldGroup>
            </div>
            <p className="tool-warning">{t(pipCalculatorWarningKey(pipsInput.assetType))}</p>
          </article>
          <aside className="trader-result-stack trader-premium-result-stack">
            <section className="trader-highlight-result" aria-live="polite">
              <span>{t('market_profit_loss')}</span>
              <strong dir="ltr">{money(pips.profitLoss, accountCurrency)}</strong>
              <p>
                <b dir="ltr">{selectedPipAsset.symbol}</b>{' '}
                {t('market_point_value_per_lot')}: <b dir="ltr">{accountCurrency} {formatNumber(pipsPointValue, 2)}</b>
              </p>
            </section>
            <ResultGrid title={t('market_calculation_results')} subtitle={t('market_live_calculation_note')} rows={[
              [t('market_asset_symbol'), selectedPipAsset.symbol, 'ltr', <LineChart key="pip-symbol" size={16} />],
              [t('market_number_of_pips'), `${formatNumber(pips.pips, 1)} ${pipUnit}`, 'ltr', <Gauge key="pip-count" size={16} />],
              [t('market_point_value_per_lot'), `${accountCurrency} ${formatNumber(pipsPointValue, 2)}`, 'ltr', <CircleDollarSign key="pip-value" size={16} />],
              [t('market_lot_size'), `${formatNumber(parseNumber(pipsInput.lotSize), 2)} ${t('market_lot_unit')}`, 'ltr', <PieChart key="pip-lot-size" size={16} />],
              [t('market_profit_loss'), money(pips.profitLoss, accountCurrency), 'ltr', <TrendingUp key="pip-profit-loss" size={16} />],
              [t('market_trade_status'), pipsTradeStatus, 'auto', <CheckCircle2 key="pip-status" size={16} />],
            ]} />
            <FormulaCard
              title={t('market_calculation_method')}
              body={t('market_pips_formula')}
              example={`${selectedPipAsset.symbol} | (${formatNumber(pipsPriceDifference, 5)} / ${formatNumber(pipsPointSize, 5)}) x ${accountCurrency} ${formatNumber(pipsPointValue, 2)} x ${formatNumber(parseNumber(pipsInput.lotSize), 2)} = ${money(pips.profitLoss, accountCurrency)}`}
            />
            {pipsValidationMessage && <p className="tool-warning">{pipsValidationMessage}</p>}
          </aside>
        </div>
      );
    }

    if (toolId === 'lot') {
      return (
        <div className="trader-premium-panel-grid">
          <article className="trader-tool-card trader-tool-input-card">
            <div className="trader-tool-card-head">
              <span><Calculator size={18} /></span>
              <div>
                <h3>{t('market_risk_reward_calculator')}</h3>
                <p>{t('market_lot_by_risk_description')}</p>
              </div>
              <button type="button" className="tool-reset" onClick={() => setLotInput({ ...defaultLotInput })}>
                {t('market_reset')}
              </button>
            </div>
            <div className="trader-field-groups">
              <TraderFieldGroup title={t('market_account_settings')} icon={<WalletCards size={15} />}>
                <ToolInput label={t('market_account_balance')} helper={t('market_account_balance_hint')} prefix={accountCurrency} value={lotInput.accountBalance} onChange={value => setLotInput(prev => ({ ...prev, accountBalance: value }))} />
              </TraderFieldGroup>

              <TraderFieldGroup title={t('market_risk_settings')} icon={<ShieldAlert size={15} />}>
                <ToolInput label={t('market_risk_percentage')} helper={t('market_risk_percentage_hint')} suffix="%" value={lotInput.riskPercentage} onChange={value => setLotInput(prev => ({ ...prev, riskPercentage: value }))} />
                <ToolInput label={t('market_stop_loss_pips')} helper={t('market_stop_loss_hint')} suffix={pipUnit} value={lotInput.stopLossPips} onChange={value => setLotInput(prev => ({ ...prev, stopLossPips: value }))} />
                <ToolInput label={t('market_pip_value')} helper={t('market_pip_value_hint')} prefix={accountCurrency} value={lotInput.pipValue} onChange={value => setLotInput(prev => ({ ...prev, pipValue: value }))} />
              </TraderFieldGroup>

              <details className="tool-advanced">
                <summary>{t('market_advanced_settings')}</summary>
                <ToolInput label={t('market_pair_asset_type')} helper={t('market_asset_pair_hint')} value={lotInput.assetType} inputDir="ltr" inputMode="text" onChange={value => setLotInput(prev => ({ ...prev, assetType: value.toUpperCase() }))} />
              </details>
            </div>
          </article>
          <aside className="trader-result-stack trader-premium-result-stack">
            <section className="trader-highlight-result" aria-live="polite">
              <span>{t('market_recommended_lot_size')}</span>
              <strong dir="ltr">{formatNumber(lots.recommendedLotSize, 4)} {t('market_lot_unit')}</strong>
              <p>
                <b>{t('market_cash_risk')}</b>: <b dir="ltr">{money(lots.riskAmount, accountCurrency)}</b>
                {' / '}
                <b>{t('market_stop_loss_pips')}</b>: <b dir="ltr">{formatNumber(parseNumber(lotInput.stopLossPips), 1)} {pipUnit}</b>
              </p>
            </section>
            <ResultGrid title={t('market_calculation_results')} subtitle={t('market_live_calculation_note')} rows={[
              [t('market_recommended_lot_size'), `${formatNumber(lots.recommendedLotSize, 4)} ${t('market_lot_unit')}`, 'ltr', <PieChart key="recommended-lot" size={16} />],
              [t('market_micro_lots'), formatNumber(lots.microLots, 2), 'ltr', <Calculator key="micro-lots" size={16} />],
              [t('market_mini_lots'), formatNumber(lots.miniLots, 2), 'ltr', <Calculator key="mini-lots" size={16} />],
              [t('market_standard_lots'), formatNumber(lots.standardLots, 4), 'ltr', <Calculator key="standard-lots" size={16} />],
              [t('market_expected_loss'), money((parseNumber(lotInput.accountBalance) * parseNumber(lotInput.riskPercentage)) / 100, accountCurrency), 'ltr', <ShieldAlert key="lot-expected-loss" size={16} />],
            ]} />
            <FormulaCard
              title={t('market_calculation_method')}
              body={t('market_lot_formula')}
              example={`${money((parseNumber(lotInput.accountBalance) * parseNumber(lotInput.riskPercentage)) / 100, accountCurrency)} / (${formatNumber(parseNumber(lotInput.stopLossPips), 2)} ${pipUnit} x ${accountCurrency} ${formatNumber(parseNumber(lotInput.pipValue), 2)})`}
            />
          </aside>
        </div>
      );
    }

    if (toolId === 'margin') {
      return (
        <div className="trader-premium-panel-grid">
          <article className="trader-tool-card trader-tool-input-card">
            <div className="trader-tool-card-head">
              <span><Landmark size={18} /></span>
              <div>
                <h3>{t('market_margin_calculator')}</h3>
                <p>{t('market_margin_description')}</p>
              </div>
              <button type="button" className="tool-reset" onClick={() => setMarginInput({ ...defaultMarginInput })}>
                {t('market_reset')}
              </button>
            </div>
            <div className="trader-field-groups">
              <TraderFieldGroup title={t('market_margin_calculator')} icon={<Landmark size={15} />}>
                <ToolInput label={t('market_trade_size')} helper={t('market_trade_size_hint')} value={marginInput.tradeSize} onChange={value => setMarginInput(prev => ({ ...prev, tradeSize: value }))} />
                <ToolInput label={t('market_current_price')} helper={t('market_margin_price_hint')} prefix={accountCurrency} value={marginInput.currentPrice} onChange={value => setMarginInput(prev => ({ ...prev, currentPrice: value }))} />
                <ToolInput label={t('market_leverage')} helper={t('market_leverage_hint')} prefix="1:" value={marginInput.leverage} onChange={value => setMarginInput(prev => ({ ...prev, leverage: value }))} />
              </TraderFieldGroup>
            </div>
          </article>
          <aside className="trader-result-stack trader-premium-result-stack">
            <section className="trader-highlight-result" aria-live="polite">
              <span>{t('market_required_margin')}</span>
              <strong dir="ltr">{money(margin.required, accountCurrency)}</strong>
              <p>
                <b>{t('market_trade_size')}</b>: <b dir="ltr">{formatNumber(margin.tradeSize, 2)}</b>
                {' / '}
                <b>{t('market_leverage')}</b>: <b dir="ltr">1:{formatNumber(margin.leverage, 0)}</b>
              </p>
            </section>
            <ResultGrid title={t('market_calculation_results')} subtitle={t('market_live_calculation_note')} rows={[
              [t('market_required_margin'), money(margin.required, accountCurrency), 'ltr', <Landmark key="required-margin" size={16} />],
              [t('market_trade_size'), formatNumber(margin.tradeSize, 2), 'ltr', <TrendingUp key="margin-trade-size" size={16} />],
              [t('market_leverage'), `1:${formatNumber(margin.leverage, 0)}`, 'ltr', <Gauge key="margin-leverage" size={16} />],
            ]} />
            <FormulaCard
              title={t('market_calculation_method')}
              body={t('market_margin_formula')}
              example={`(${formatNumber(margin.tradeSize, 2)} x ${formatNumber(parseNumber(marginInput.currentPrice), 4)}) / ${formatNumber(margin.leverage, 0)} = ${money(margin.required, accountCurrency)}`}
            />
          </aside>
        </div>
      );
    }

    return <PerformanceTable t={t} locale={locale} performance={performance} />;
  };

  return (
    <section className="trader-premium-dashboard" dir={isRtlLocale ? 'rtl' : 'ltr'}>
      <header className="trader-premium-header">
        <span className="trader-premium-header-icon"><Calculator size={22} /></span>
        <div>
          <span>{t('market_trader_tools_subtitle')}</span>
          <h2>{t('market_trader_tools')}</h2>
          <p>{t('market_trader_tools_dashboard_description')}</p>
        </div>
        <b className="trader-premium-header-badge">
          <Sparkles size={14} />
          {t('market_trading_calculators')}
        </b>
      </header>

      <div className={`trader-premium-layout${subTab === 'performance' ? ' performance-layout' : ''}`}>
        {subTab !== 'performance' ? (
        <aside className="trader-support-column" aria-label={t('market_tool_summary')}>
          <TraderSupportCard icon={<Calculator size={18} />} title={t('market_calculation_results')} highlight>
            <div className="trader-side-result-grid">
              {activeSummaryRows.map(([label, value, dir, icon]) => (
                <TraderSideStat key={label} icon={icon} label={label} value={value} valueDir={dir} />
              ))}
            </div>
          </TraderSupportCard>

          <TraderSupportCard icon={<WalletCards size={18} />} title={t('market_tool_summary')}>
            <p>{t('market_tool_summary_body')}</p>
            <div className="trader-guidance-note">
              <span><Sparkles size={14} /></span>
              <div>
                <strong>{t('market_quick_tip')}</strong>
                <p>{t('market_quick_tip_body')}</p>
              </div>
            </div>
            <ol className="trader-steps">
              <li>{t('market_usage_step_balance')}</li>
              <li>{t('market_usage_step_stop_loss')}</li>
              <li>{t('market_usage_step_result')}</li>
            </ol>
          </TraderSupportCard>

        </aside>
        ) : null}

        <article className="trader-premium-main-card">
          <div className="trader-premium-main-head">
            <span className="trader-premium-tool-icon">{activeTool.icon}</span>
            <div>
              <span>{t('market_active_tool')} - {activeToolIndex}/{toolItems.length}</span>
              <h3>{activeTool.title}</h3>
              <p>{activeDescription}</p>
            </div>
            <div className="trader-premium-save" aria-label={t('market_save_account_currency_default')}>
              <span className="trader-premium-save-icon"><WalletCards size={16} /></span>
              <div>
                <strong>{t('market_save_account_currency_default')}</strong>
                <small>{t('market_account_currency_hint')}</small>
              </div>
              <button type="button" onClick={handleSaveDefaultCurrency}>
                <CheckCircle2 size={14} />
                {t('market_save_preference')}
              </button>
              {currencyMessage ? <small className="success">{currencyMessage}</small> : null}
              {currencyError ? <small className="error">{currencyError}</small> : null}
            </div>
          </div>

          <div className="trader-tool-switcher-shell">
            <button
              type="button"
              className="trader-switcher-arrow"
              aria-label={t('previous')}
              onClick={() => selectToolByOffset(-1)}
            >
              {isRtlLocale ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <div className="trader-tool-switcher" role="tablist" aria-label={t('market_trader_tools')}>
              {toolItems.map(item => {
                const isActive = subTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="trader-active-tool-panel"
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setSubTab(item.id)}
                  >
                    <span className="trader-switcher-icon">{item.icon}</span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="trader-switcher-arrow"
              aria-label={t('next')}
              onClick={() => selectToolByOffset(1)}
            >
              {isRtlLocale ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          <div className="trader-active-workspace" id="trader-active-tool-panel" role="tabpanel">
            {renderToolPanel(activeTool.id)}
          </div>
        </article>
      </div>

      <section className="trader-premium-disclaimer">
        <span><ShieldAlert size={18} /></span>
        <div>
          <strong>{t('market_investment_disclaimer_title')}</strong>
          <p>{t('market_investment_disclaimer_body')}</p>
        </div>
      </section>

      <style jsx global>{`
        .trader-premium-dashboard {
          --trader-bg: #f4f8fb;
          --trader-card: #ffffff;
          --trader-soft: #f7fbff;
          --trader-ink: #071a2f;
          --trader-muted: #52667a;
          --trader-line: rgba(32, 104, 145, .16);
          --trader-line-strong: rgba(32, 212, 207, .34);
          --trader-cyan: #0f8fb8;
          --trader-green: #047857;
          --trader-shadow: 0 18px 48px rgba(7, 28, 52, .09);
          width: 100%;
          max-width: 1400px;
          margin-inline: auto;
          display: grid;
          gap: clamp(14px, 1.5vw, 20px);
          min-width: 0;
          overflow: hidden;
          color: var(--trader-ink);
        }

        .trader-premium-dashboard,
        .trader-premium-dashboard * {
          box-sizing: border-box;
        }

        .trader-premium-dashboard .trader-premium-header {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          min-width: 0;
          padding: clamp(16px, 2vw, 22px);
          border: 1px solid var(--trader-line);
          border-radius: 26px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .96), rgba(239, 248, 255, .84)),
            var(--trader-card);
          box-shadow: var(--trader-shadow);
        }

        .trader-premium-dashboard .trader-premium-header-icon,
        .trader-premium-dashboard .trader-premium-tool-icon,
        .trader-premium-dashboard .trader-support-icon,
        .trader-premium-dashboard .trader-switcher-icon,
        .trader-premium-dashboard .tool-result-icon {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .trader-premium-dashboard .trader-premium-header-icon,
        .trader-premium-dashboard .trader-premium-tool-icon {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          color: #ffffff;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 14px 26px rgba(31, 149, 255, .18);
        }

        .trader-premium-dashboard .trader-premium-header span:not(.trader-premium-header-icon),
        .trader-premium-dashboard .trader-premium-main-head span:not(.trader-premium-tool-icon):not(.trader-premium-save-icon) {
          color: var(--trader-cyan);
          font-size: 12px;
          font-weight: 950;
          line-height: 1.35;
        }

        .trader-premium-dashboard .trader-premium-header h2,
        .trader-premium-dashboard .trader-premium-main-head h3 {
          margin: 3px 0 0;
          color: var(--trader-ink);
          font-size: clamp(22px, 2.6vw, 34px);
          font-weight: 950;
          line-height: 1.16;
          letter-spacing: 0;
        }

        .trader-premium-dashboard .trader-premium-header p,
        .trader-premium-dashboard .trader-premium-main-head p,
        .trader-premium-dashboard .trader-support-card p {
          margin: 6px 0 0;
          color: var(--trader-muted);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.75;
        }

        .trader-premium-dashboard .trader-premium-header-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          width: max-content;
          max-width: 100%;
          min-height: 38px;
          padding: 0 13px;
          border-radius: 999px;
          border: 1px solid rgba(32, 212, 207, .24);
          background: rgba(32, 212, 207, .10);
          color: #047a8f;
          font-size: 12px;
          font-weight: 950;
          line-height: 1.2;
          white-space: nowrap;
        }

        .trader-premium-dashboard .trader-premium-layout {
          direction: ltr;
          display: grid;
          grid-template-columns: minmax(230px, .55fr) minmax(0, 2.45fr);
          grid-template-areas: "support main";
          gap: 18px;
          align-items: start;
          min-width: 0;
        }

        .trader-premium-dashboard[dir="rtl"] .trader-premium-layout > * {
          direction: rtl;
        }

        .trader-premium-dashboard .trader-premium-layout.performance-layout {
          grid-template-columns: minmax(0, 1fr);
          grid-template-areas: "main";
        }

        .trader-premium-dashboard .trader-support-column {
          grid-area: support;
          display: grid;
          gap: 12px;
          align-content: start;
          min-width: 0;
        }

        .trader-premium-dashboard .trader-premium-main-card {
          grid-area: main;
          display: grid;
          gap: 14px;
          min-width: 0;
          overflow: hidden;
          padding: clamp(14px, 1.8vw, 20px);
          border: 1px solid rgba(32, 104, 145, .18);
          border-radius: 28px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .94), rgba(239, 248, 255, .76)),
            var(--trader-card);
          box-shadow: var(--trader-shadow);
        }

        .trader-premium-dashboard .trader-support-card {
          position: relative;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          min-width: 0;
          overflow: hidden;
          padding: 15px;
          border: 1px solid var(--trader-line);
          border-radius: 22px;
          background: rgba(255, 255, 255, .88);
          box-shadow: 0 12px 28px rgba(7, 28, 52, .06);
        }

        .trader-premium-dashboard .trader-support-card.highlight {
          border-color: var(--trader-line-strong);
          background:
            linear-gradient(135deg, rgba(31, 149, 255, .08), rgba(32, 212, 207, .12)),
            var(--trader-card);
          box-shadow: 0 16px 36px rgba(7, 28, 52, .08);
        }

        .trader-premium-dashboard .trader-support-icon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          color: var(--trader-cyan);
          background: rgba(32, 212, 207, .10);
          border: 1px solid rgba(32, 212, 207, .18);
        }

        .trader-premium-dashboard .trader-support-card > div {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .trader-premium-dashboard .trader-support-card h3 {
          margin: 0;
          color: var(--trader-ink);
          font-size: 15px;
          font-weight: 950;
          line-height: 1.35;
        }

        .trader-premium-dashboard .trader-guidance-note {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          gap: 10px;
          padding-top: 11px;
          border-top: 1px solid rgba(32, 104, 145, .12);
        }

        .trader-premium-dashboard .trader-guidance-note > span {
          width: 30px;
          height: 30px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          color: var(--trader-cyan);
          background: rgba(32, 212, 207, .10);
        }

        .trader-premium-dashboard .trader-guidance-note strong {
          display: block;
          color: var(--trader-ink);
          font-size: 12px;
          font-weight: 950;
          line-height: 1.35;
        }

        .trader-premium-dashboard .trader-guidance-note p {
          margin-top: 3px;
          font-size: 12px;
          line-height: 1.65;
        }

        .trader-premium-dashboard .trader-side-result-grid {
          display: grid;
          gap: 8px;
          margin-top: 0;
        }

        .trader-premium-dashboard .trader-side-stat {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 8px 10px;
          align-items: center;
          min-width: 0;
          padding: 10px;
          border: 1px solid rgba(32, 104, 145, .12);
          border-radius: 16px;
          background: rgba(255, 255, 255, .74);
        }

        .trader-premium-dashboard .trader-side-stat-icon {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          color: var(--trader-cyan);
          background: rgba(31, 149, 255, .08);
          border: 1px solid rgba(31, 149, 255, .12);
        }

        .trader-premium-dashboard .trader-side-stat span:not(.trader-side-stat-icon) {
          color: var(--trader-muted);
          font-size: 11px;
          font-weight: 950;
          line-height: 1.35;
        }

        .trader-premium-dashboard .trader-side-stat b {
          grid-column: 2;
          min-width: 0;
          color: var(--trader-ink);
          font-size: clamp(15px, 1.4vw, 19px);
          font-weight: 950;
          line-height: 1.18;
          overflow-wrap: anywhere;
          font-variant-numeric: tabular-nums;
        }

        .trader-premium-dashboard .trader-support-card.highlight .trader-side-stat:first-child {
          border-color: rgba(32, 212, 207, .28);
          background: linear-gradient(135deg, rgba(255, 255, 255, .92), rgba(232, 250, 249, .82));
        }

        .trader-premium-dashboard .trader-support-card.highlight .trader-side-stat:first-child b {
          color: #064f77;
          font-size: clamp(17px, 1.6vw, 22px);
        }

        .trader-premium-dashboard .trader-steps {
          margin: 0;
          padding: 11px 0 0;
          border-top: 1px solid rgba(32, 104, 145, .12);
          list-style: none;
          counter-reset: traderStep;
          display: grid;
          gap: 8px;
        }

        .trader-premium-dashboard .trader-steps li {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr);
          align-items: center;
          gap: 9px;
          color: var(--trader-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.55;
        }

        .trader-premium-dashboard .trader-steps li::before {
          counter-increment: traderStep;
          content: counter(traderStep);
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: #0f8fb8;
          font-size: 11px;
          font-weight: 950;
        }

        .trader-premium-dashboard .trader-premium-main-head {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) minmax(230px, 300px);
          align-items: center;
          gap: 12px;
          min-width: 0;
          padding: 12px;
          border: 1px solid rgba(32, 104, 145, .14);
          border-radius: 22px;
          background: rgba(247, 251, 255, .82);
        }

        .trader-premium-dashboard .trader-premium-main-head > div:not(.trader-premium-save) {
          min-width: 0;
        }

        .trader-premium-dashboard .trader-premium-main-head h3 {
          font-size: clamp(19px, 2vw, 26px);
        }

        .trader-premium-dashboard .trader-premium-save {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          align-items: center;
          gap: 8px;
          min-width: 0;
          padding: 10px;
          border: 1px solid rgba(32, 212, 207, .20);
          border-radius: 18px;
          background: rgba(255, 255, 255, .78);
        }

        .trader-premium-dashboard .trader-premium-save-icon {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: var(--trader-cyan);
          background: rgba(32, 212, 207, .10);
        }

        .trader-premium-dashboard .trader-premium-save strong {
          display: block;
          color: var(--trader-ink);
          font-size: 12px;
          font-weight: 950;
          line-height: 1.3;
        }

        .trader-premium-dashboard .trader-premium-save small {
          display: block;
          color: var(--trader-muted);
          font-size: 10.5px;
          font-weight: 850;
          line-height: 1.35;
        }

        .trader-premium-dashboard .trader-premium-save button {
          grid-column: 1 / -1;
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid rgba(32, 212, 207, .28);
          border-radius: 999px;
          background: rgba(32, 212, 207, .12);
          color: #047a8f;
          padding: 0 12px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease, box-shadow .18s ease;
        }

        .trader-premium-dashboard .trader-premium-save button:hover,
        .trader-premium-dashboard .trader-premium-save button:focus-visible {
          outline: none;
          background: rgba(32, 212, 207, .18);
          border-color: rgba(32, 212, 207, .46);
          box-shadow: 0 0 0 3px rgba(32, 212, 207, .14);
        }

        .trader-premium-dashboard .trader-premium-save .success {
          grid-column: 1 / -1;
          color: #047857;
        }

        .trader-premium-dashboard .trader-premium-save .error {
          grid-column: 1 / -1;
          color: #b91c1c;
        }

        .trader-premium-dashboard .trader-tool-switcher-shell {
          direction: ltr;
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr) 36px;
          align-items: center;
          gap: 8px;
          min-width: 0;
          padding: 7px;
          border: 1px solid rgba(32, 104, 145, .14);
          border-radius: 20px;
          background: #edf7ff;
        }

        .trader-premium-dashboard .trader-switcher-arrow {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(32, 104, 145, .16);
          border-radius: 13px;
          background: #ffffff;
          color: var(--trader-cyan);
          cursor: pointer;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .trader-premium-dashboard .trader-switcher-arrow:hover,
        .trader-premium-dashboard .trader-switcher-arrow:focus-visible {
          outline: none;
          border-color: var(--trader-line-strong);
          background: #f7fdff;
          box-shadow: 0 0 0 3px rgba(32, 212, 207, .14);
        }

        .trader-premium-dashboard .trader-tool-switcher {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 6px;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .trader-premium-dashboard .trader-tool-switcher::-webkit-scrollbar {
          display: none;
        }

        .trader-premium-dashboard .trader-tool-switcher > button {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          min-width: 0;
          min-height: 58px;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(32, 104, 145, .13);
          border-radius: 15px;
          background: rgba(255, 255, 255, .82);
          color: var(--trader-muted);
          padding: 9px 10px;
          font: 900 12px Tajawal, Arial, sans-serif;
          text-align: start;
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease, box-shadow .18s ease, color .18s ease;
        }

        .trader-premium-dashboard[dir="rtl"] .trader-tool-switcher > button {
          direction: rtl;
        }

        .trader-premium-dashboard .trader-tool-switcher > button:hover,
        .trader-premium-dashboard .trader-tool-switcher > button:focus-visible {
          outline: none;
          color: var(--trader-ink);
          border-color: rgba(32, 212, 207, .32);
          background: #f8fdff;
          box-shadow: 0 0 0 3px rgba(32, 212, 207, .12);
        }

        .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] {
          color: #ffffff;
          border-color: transparent;
          background: linear-gradient(135deg, #0b5f8e, #0f8fb8 58%, #20d4cf);
          box-shadow: 0 13px 28px rgba(15, 143, 184, .25);
        }

        .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"]::after {
          content: "";
          position: absolute;
          inset-inline: 12px;
          bottom: 7px;
          height: 3px;
          border-radius: 999px;
          background: rgba(255, 255, 255, .76);
        }

        .trader-premium-dashboard .trader-switcher-icon {
          width: 32px;
          height: 32px;
          border-radius: 12px;
          color: var(--trader-cyan);
          background: rgba(32, 212, 207, .10);
          border: 1px solid rgba(32, 212, 207, .16);
        }

        .trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"] .trader-switcher-icon {
          color: #ffffff;
          background: rgba(255, 255, 255, .18);
          border-color: rgba(255, 255, 255, .22);
        }

        .trader-premium-dashboard .trader-tool-switcher strong,
        .trader-premium-dashboard .trader-tool-switcher small {
          display: block;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.3;
        }

        .trader-premium-dashboard .trader-tool-switcher strong {
          color: inherit;
          font-size: 12px;
          font-weight: 950;
        }

        .trader-premium-dashboard .trader-tool-switcher small {
          margin-top: 2px;
          font-size: 10.5px;
          font-weight: 850;
          opacity: .78;
        }

        .trader-premium-dashboard .trader-active-workspace {
          min-width: 0;
        }

        .trader-premium-dashboard .trader-premium-panel-grid {
          direction: ltr;
          display: grid;
          grid-template-columns: minmax(420px, 1.12fr) minmax(315px, .88fr);
          grid-template-areas: "result settings";
          gap: 18px;
          align-items: start;
          min-width: 0;
        }

        .trader-premium-dashboard[dir="rtl"] .trader-premium-panel-grid > * {
          direction: rtl;
        }

        .trader-premium-dashboard .trader-premium-result-stack {
          grid-area: result;
        }

        .trader-premium-dashboard .trader-tool-input-card {
          grid-area: settings;
        }

        .trader-premium-dashboard .trader-tool-card {
          display: grid;
          gap: 14px;
          min-width: 0;
          overflow: hidden;
          padding: 15px;
          border: 1px solid rgba(32, 104, 145, .16);
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(255, 255, 255, .94), rgba(247, 251, 255, .84));
          box-shadow: 0 14px 34px rgba(7, 28, 52, .07);
        }

        .trader-premium-dashboard .trader-tool-card-head {
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr) auto;
          gap: 11px;
          align-items: start;
          min-width: 0;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(32, 104, 145, .12);
        }

        .trader-premium-dashboard .trader-tool-card-head > span {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #0b5f8e, #20d4cf);
          box-shadow: 0 10px 22px rgba(31, 149, 255, .18);
        }

        .trader-premium-dashboard .trader-tool-card-head h3 {
          margin: 0;
          color: var(--trader-ink);
          font-size: 16px;
          font-weight: 950;
          line-height: 1.35;
        }

        .trader-premium-dashboard .trader-tool-card-head p {
          margin: 4px 0 0;
          color: var(--trader-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.65;
        }

        .trader-premium-dashboard .tool-reset {
          min-height: 34px;
          border: 1px solid rgba(32, 212, 207, .26);
          border-radius: 999px;
          background: rgba(32, 212, 207, .10);
          color: #047a8f;
          padding: 0 12px;
          font: 950 11px Tajawal, Arial, sans-serif;
          cursor: pointer;
          white-space: nowrap;
        }

        .trader-premium-dashboard .tool-reset:hover,
        .trader-premium-dashboard .tool-reset:focus-visible {
          outline: none;
          border-color: rgba(32, 212, 207, .46);
          box-shadow: 0 0 0 3px rgba(32, 212, 207, .14);
        }

        .trader-premium-dashboard .trader-field-groups {
          display: grid;
          gap: 12px;
        }

        .trader-premium-dashboard .trader-field-group {
          display: grid;
          gap: 12px;
          min-width: 0;
          padding: 12px;
          border: 1px solid rgba(32, 104, 145, .15);
          border-radius: 20px;
          background: linear-gradient(180deg, #f8fcff, #eef7ff);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .72);
        }

        .trader-premium-dashboard .trader-field-group-title {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .trader-premium-dashboard .trader-field-group-title span {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: var(--trader-cyan);
          background: rgba(32, 212, 207, .10);
        }

        .trader-premium-dashboard .trader-field-group-title h4 {
          margin: 0;
          color: var(--trader-ink);
          font-size: 13px;
          font-weight: 950;
          line-height: 1.35;
        }

        .trader-premium-dashboard .trader-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 11px;
          min-width: 0;
        }

        .trader-premium-dashboard .trader-form-grid > .tool-input:only-child,
        .trader-premium-dashboard .trader-form-grid > .tool-segmented {
          grid-column: 1 / -1;
        }

        .trader-premium-dashboard .tool-input {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 7px;
          align-items: start;
          min-width: 0;
        }

        .trader-premium-dashboard .tool-input > span {
          color: #20354d;
          font-size: 12px;
          font-weight: 950;
          line-height: 1.45;
          text-align: start;
        }

        .trader-premium-dashboard .tool-input small {
          color: var(--trader-muted);
          font-size: 11px;
          font-weight: 850;
          line-height: 1.55;
        }

        .trader-premium-dashboard .tool-input-shell {
          width: 100%;
          min-height: 52px;
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          padding: 0 9px;
          border: 1px solid rgba(32, 104, 145, .25);
          border-radius: 16px;
          background: linear-gradient(180deg, #ffffff, #f9fcff);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .70);
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .trader-premium-dashboard .tool-input-shell:focus-within {
          border-color: rgba(32, 212, 207, .60);
          box-shadow: 0 0 0 3px rgba(32, 212, 207, .15);
        }

        .trader-premium-dashboard .tool-input-shell em {
          flex: 0 0 auto;
          min-width: 42px;
          max-width: 86px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: center;
          border: 1px solid rgba(32, 212, 207, .24);
          border-radius: 12px;
          background: rgba(32, 212, 207, .10);
          color: #047a8f;
          padding: 7px 8px;
          font-style: normal;
          font-size: 11px;
          font-weight: 950;
          line-height: 1.2;
        }

        .trader-premium-dashboard .tool-input .tool-input-shell input,
        .trader-premium-dashboard .tool-input .tool-input-shell select {
          width: 100%;
          min-width: 0;
          height: 50px !important;
          border: 0 !important;
          background: transparent !important;
          color: var(--trader-ink);
          padding: 0 !important;
          outline: 0;
          box-shadow: none !important;
          font: 950 15px Tajawal, Arial, sans-serif;
        }

        .trader-premium-dashboard .tool-input .tool-input-shell input[dir="ltr"] {
          text-align: left;
          direction: ltr;
          unicode-bidi: isolate;
        }

        .trader-premium-dashboard .tool-input-shell.select select {
          cursor: pointer;
        }

        .trader-premium-dashboard .tool-segmented-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5px;
          min-width: 0;
          padding: 5px;
          border: 1px solid rgba(32, 104, 145, .14);
          border-radius: 16px;
          background: #edf7ff;
        }

        .trader-premium-dashboard .tool-segmented-row button {
          min-height: 40px;
          border: 1px solid transparent;
          border-radius: 12px;
          background: transparent;
          color: var(--trader-muted);
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .trader-premium-dashboard .tool-segmented-row button:hover,
        .trader-premium-dashboard .tool-segmented-row button:focus-visible {
          outline: none;
          color: var(--trader-ink);
          background: rgba(255, 255, 255, .72);
        }

        .trader-premium-dashboard .tool-segmented-row button[aria-pressed="true"] {
          color: #ffffff;
          background: linear-gradient(135deg, #0b5f8e, #20d4cf);
          box-shadow: 0 9px 18px rgba(15, 143, 184, .20);
        }

        .trader-premium-dashboard .tool-advanced {
          grid-column: 1 / -1;
          min-width: 0;
          padding: 10px;
          border: 1px solid rgba(32, 104, 145, .13);
          border-radius: 18px;
          background: rgba(237, 247, 255, .72);
        }

        .trader-premium-dashboard .tool-advanced summary {
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: var(--trader-ink);
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          list-style: none;
        }

        .trader-premium-dashboard .tool-advanced summary::-webkit-details-marker {
          display: none;
        }

        .trader-premium-dashboard .tool-advanced summary::after {
          content: "+";
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: #047a8f;
          background: rgba(32, 212, 207, .12);
        }

        .trader-premium-dashboard .tool-advanced[open] summary {
          margin-bottom: 10px;
        }

        .trader-premium-dashboard .tool-advanced[open] summary::after {
          content: "-";
        }

        .trader-premium-dashboard .trader-result-stack {
          display: grid;
          gap: 12px;
          align-content: start;
          min-width: 0;
        }

        .trader-premium-dashboard .trader-highlight-result {
          position: relative;
          isolation: isolate;
          min-height: 208px;
          display: grid;
          align-content: space-between;
          gap: 16px;
          overflow: hidden;
          padding: clamp(18px, 2.3vw, 26px);
          border: 1px solid rgba(159, 246, 240, .22);
          border-radius: 28px;
          background:
            radial-gradient(circle at 88% 12%, rgba(32, 212, 207, .28), transparent 32%),
            linear-gradient(135deg, #061a2f 0%, #0b3d5f 54%, #0f8fb8 126%);
          box-shadow: 0 26px 60px rgba(7, 28, 52, .24);
          color: #ffffff;
        }

        .trader-premium-dashboard .trader-highlight-result::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, .08) 1px, transparent 1px),
            linear-gradient(180deg, rgba(255, 255, 255, .06) 1px, transparent 1px);
          background-size: 44px 44px;
          opacity: .28;
        }

        .trader-premium-dashboard .trader-highlight-result span {
          color: #9ff6f0;
          font-size: 12px;
          font-weight: 950;
          line-height: 1.35;
        }

        .trader-premium-dashboard .trader-highlight-result strong {
          color: #ffffff;
          font-size: clamp(36px, 5vw, 58px);
          font-weight: 950;
          line-height: .96;
          letter-spacing: 0;
          font-variant-numeric: tabular-nums;
          overflow-wrap: anywhere;
          text-align: left;
          direction: ltr;
          unicode-bidi: isolate;
        }

        .trader-premium-dashboard .trader-highlight-result p {
          margin: 0;
          color: #d8e8f4;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.75;
        }

        .trader-premium-dashboard .trader-highlight-result b {
          color: #ffffff;
          font-weight: 950;
        }

        .trader-premium-dashboard .tool-results {
          display: grid;
          gap: 12px;
          min-width: 0;
          padding: 14px;
          border: 1px solid var(--trader-line);
          border-radius: 24px;
          background: rgba(255, 255, 255, .88);
          box-shadow: 0 12px 30px rgba(7, 28, 52, .06);
        }

        .trader-premium-dashboard .tool-results-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(32, 104, 145, .12);
        }

        .trader-premium-dashboard .tool-results-title {
          color: var(--trader-ink);
          font-size: 14px;
          font-weight: 950;
          line-height: 1.35;
        }

        .trader-premium-dashboard .tool-results-head small {
          color: var(--trader-muted);
          font-size: 11px;
          font-weight: 850;
          line-height: 1.45;
        }

        .trader-premium-dashboard .tool-result-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          min-width: 0;
        }

        .trader-premium-dashboard .tool-result-card {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          align-content: start;
          gap: 8px 10px;
          min-width: 0;
          min-height: 110px;
          padding: 13px;
          border: 1px solid rgba(32, 104, 145, .16);
          border-radius: 18px;
          background: linear-gradient(180deg, #ffffff, #f4faff);
          box-shadow: 0 10px 24px rgba(7, 28, 52, .045);
        }

        .trader-premium-dashboard .tool-result-icon {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          color: var(--trader-cyan);
          background: rgba(32, 212, 207, .10);
        }

        .trader-premium-dashboard .tool-result-card span:not(.tool-result-icon) {
          color: var(--trader-muted);
          font-size: 11px;
          font-weight: 950;
          line-height: 1.4;
          text-align: start;
        }

        .trader-premium-dashboard .tool-result-card b {
          grid-column: 1 / -1;
          min-width: 0;
          color: #08213c;
          font-size: clamp(18px, 1.9vw, 26px);
          font-weight: 950;
          line-height: 1.15;
          font-variant-numeric: tabular-nums;
          overflow-wrap: anywhere;
          text-align: left;
          direction: ltr;
          unicode-bidi: isolate;
        }

        .trader-premium-dashboard .tool-formula-card {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          min-width: 0;
          padding: 14px;
          border: 1px solid rgba(32, 104, 145, .14);
          border-radius: 22px;
          background: rgba(247, 251, 255, .84);
        }

        .trader-premium-dashboard .tool-formula-card > span {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: var(--trader-cyan);
          background: rgba(32, 212, 207, .10);
        }

        .trader-premium-dashboard .tool-formula-card strong {
          color: var(--trader-ink);
          font-size: 13px;
          font-weight: 950;
          line-height: 1.4;
        }

        .trader-premium-dashboard .tool-formula-card p {
          margin: 4px 0 0;
          color: var(--trader-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.65;
        }

        .trader-premium-dashboard .tool-formula-card b {
          display: block;
          width: max-content;
          max-width: 100%;
          margin-top: 8px;
          padding: 7px 9px;
          border: 1px solid rgba(32, 212, 207, .22);
          border-radius: 12px;
          background: rgba(32, 212, 207, .10);
          color: #047a8f;
          font-size: 11px;
          font-weight: 950;
          line-height: 1.45;
          white-space: normal;
          overflow-wrap: anywhere;
          text-align: left;
        }

        .trader-premium-dashboard .tool-warning {
          margin: 0;
          padding: 11px 12px;
          border: 1px solid rgba(180, 83, 9, .22);
          border-radius: 16px;
          background: #fff7df;
          color: #8a4b0a;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.7;
        }

        .trader-premium-dashboard .trader-premium-disclaimer {
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          min-width: 0;
          padding: 15px 16px;
          border: 1px solid var(--trader-line);
          border-radius: 24px;
          background: rgba(255, 255, 255, .82);
          box-shadow: 0 12px 30px rgba(7, 28, 52, .06);
        }

        .trader-premium-dashboard .trader-premium-disclaimer > span {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: var(--trader-cyan);
          background: rgba(31, 149, 255, .08);
          border: 1px solid rgba(31, 149, 255, .12);
        }

        .trader-premium-dashboard .trader-premium-disclaimer strong {
          display: block;
          color: var(--trader-ink);
          font-size: 13px;
          font-weight: 950;
          line-height: 1.4;
          margin-bottom: 4px;
        }

        .trader-premium-dashboard .trader-premium-disclaimer p {
          margin: 0;
          color: var(--trader-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.75;
        }

        .dark .trader-premium-dashboard {
          --trader-bg: #061a2f;
          --trader-card: #0d2238;
          --trader-soft: #08182a;
          --trader-ink: #f8fcff;
          --trader-muted: #a9bdd0;
          --trader-line: #1f3d56;
          --trader-line-strong: rgba(47, 214, 192, .34);
          --trader-cyan: #2fd6c0;
          --trader-green: #2fd6c0;
          --trader-shadow: 0 18px 46px rgba(0, 0, 0, .28);
        }

        .dark .trader-premium-dashboard .trader-premium-header,
        .dark .trader-premium-dashboard .trader-premium-main-card,
        .dark .trader-premium-dashboard .trader-support-card,
        .dark .trader-premium-dashboard .trader-tool-card,
        .dark .trader-premium-dashboard .tool-results,
        .dark .trader-premium-dashboard .trader-premium-disclaimer {
          background:
            linear-gradient(135deg, rgba(31, 149, 255, .08), rgba(32, 212, 207, .06)),
            var(--trader-card);
          border-color: var(--trader-line);
          box-shadow: var(--trader-shadow);
        }

        .dark .trader-premium-dashboard .trader-premium-main-head,
        .dark .trader-premium-dashboard .trader-tool-switcher-shell,
        .dark .trader-premium-dashboard .tool-segmented-row,
        .dark .trader-premium-dashboard .trader-field-group,
        .dark .trader-premium-dashboard .tool-advanced,
        .dark .trader-premium-dashboard .tool-formula-card {
          background: #08182a;
          border-color: var(--trader-line);
        }

        .dark .trader-premium-dashboard .trader-premium-save,
        .dark .trader-premium-dashboard .trader-side-stat,
        .dark .trader-premium-dashboard .tool-input-shell,
        .dark .trader-premium-dashboard .tool-result-card,
        .dark .trader-premium-dashboard .trader-tool-switcher > button,
        .dark .trader-premium-dashboard .trader-switcher-arrow {
          background: #071527;
          border-color: var(--trader-line);
          color: var(--trader-ink);
        }

        .dark .trader-premium-dashboard .tool-input > span,
        .dark .trader-premium-dashboard .tool-input .tool-input-shell input,
        .dark .trader-premium-dashboard .tool-input .tool-input-shell select {
          color: var(--trader-ink);
        }

        .dark .trader-premium-dashboard .trader-support-card.highlight .trader-side-stat:first-child {
          background: #071527;
          border-color: rgba(47, 214, 192, .30);
        }

        .dark .trader-premium-dashboard .trader-support-card.highlight .trader-side-stat:first-child b,
        .dark .trader-premium-dashboard .tool-result-card b {
          color: var(--trader-ink);
        }

        .dark .trader-premium-dashboard .tool-warning {
          background: rgba(245, 158, 11, .12);
          border-color: rgba(245, 158, 11, .26);
          color: #facc15;
        }

        @media (max-width: 1280px) {
          .trader-premium-dashboard .trader-tool-switcher {
            display: flex;
          }

          .trader-premium-dashboard .trader-tool-switcher > button {
            flex: 0 0 min(220px, 42vw);
          }

          .trader-premium-dashboard .trader-tool-switcher small {
            display: none;
          }
        }

        @media (max-width: 1180px) {
          .trader-premium-dashboard .trader-premium-layout {
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas:
              "main"
              "support";
          }

          .trader-premium-dashboard .trader-support-column {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .trader-premium-dashboard .trader-premium-main-head {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .trader-premium-dashboard .trader-premium-save {
            grid-column: 1 / -1;
            grid-template-columns: 34px minmax(0, 1fr) auto;
          }

          .trader-premium-dashboard .trader-premium-save button {
            grid-column: auto;
            min-width: 150px;
          }
        }

        @media (max-width: 980px) {
          .trader-premium-dashboard .trader-premium-panel-grid {
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas:
              "result"
              "settings";
          }
        }

        @media (max-width: 720px) {
          .trader-premium-dashboard {
            gap: 14px;
          }

          .trader-premium-dashboard .trader-premium-header,
          .trader-premium-dashboard .trader-premium-main-card,
          .trader-premium-dashboard .trader-premium-disclaimer {
            border-radius: 22px;
          }

          .trader-premium-dashboard .trader-premium-header {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .trader-premium-dashboard .trader-premium-header-badge {
            grid-column: 1 / -1;
            justify-self: start;
          }

          .trader-premium-dashboard .trader-support-column,
          .trader-premium-dashboard .trader-form-grid,
          .trader-premium-dashboard .tool-result-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .trader-premium-dashboard .trader-premium-save {
            grid-template-columns: 32px minmax(0, 1fr);
          }

          .trader-premium-dashboard .trader-premium-save button {
            grid-column: 1 / -1;
            width: 100%;
          }

          .trader-premium-dashboard .trader-tool-switcher-shell {
            grid-template-columns: 32px minmax(0, 1fr) 32px;
            gap: 5px;
            padding: 5px;
            border-radius: 18px;
          }

          .trader-premium-dashboard .trader-switcher-arrow {
            width: 32px;
            height: 32px;
            border-radius: 11px;
          }

          .trader-premium-dashboard .trader-tool-switcher > button {
            flex-basis: min(190px, 72vw);
            min-height: 50px;
            padding: 8px;
          }

          .trader-premium-dashboard .trader-switcher-icon {
            width: 28px;
            height: 28px;
            border-radius: 10px;
          }

          .trader-premium-dashboard .trader-tool-card-head {
            grid-template-columns: 38px minmax(0, 1fr);
          }

          .trader-premium-dashboard .tool-reset {
            grid-column: 1 / -1;
            justify-self: start;
          }

          .trader-premium-dashboard .trader-highlight-result {
            min-height: 168px;
            border-radius: 24px;
          }

          .trader-premium-dashboard .trader-highlight-result strong {
            font-size: clamp(32px, 11vw, 46px);
          }
        }

        @media (max-width: 480px) {
          .trader-premium-dashboard .trader-premium-header,
          .trader-premium-dashboard .trader-premium-main-card,
          .trader-premium-dashboard .trader-support-card,
          .trader-premium-dashboard .trader-tool-card,
          .trader-premium-dashboard .tool-results,
          .trader-premium-dashboard .trader-premium-disclaimer {
            padding: 13px;
          }

          .trader-premium-dashboard .trader-premium-header-icon,
          .trader-premium-dashboard .trader-premium-tool-icon {
            width: 38px;
            height: 38px;
            border-radius: 14px;
          }

          .trader-premium-dashboard .tool-input-shell {
            min-height: 50px;
          }

          .trader-premium-dashboard .tool-input-shell em {
            min-width: 36px;
            padding-inline: 6px;
          }
        }
      `}</style>
    </section>
  );
}

export function TraderSupportCard({
  icon,
  title,
  children,
  highlight = false,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <article className={`trader-support-card${highlight ? ' highlight' : ''}`}>
      <span className="trader-support-icon">{icon}</span>
      <div>
        <h3>{title}</h3>
        {children}
      </div>
    </article>
  );
}

export function TraderSideStat({ icon, label, value, valueDir = 'ltr' }: { icon: ReactNode; label: string; value: string; valueDir?: 'ltr' | 'auto' }) {
  return (
    <div className="trader-side-stat">
      <span className="trader-side-stat-icon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
      <b dir={valueDir}>{value}</b>
    </div>
  );
}

export function TraderFieldGroup({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="trader-field-group">
      <div className="trader-field-group-title">
        <span>{icon}</span>
        <h4>{title}</h4>
      </div>
      <div className="trader-form-grid">
        {children}
      </div>
    </section>
  );
}

export function ToolInput({
  label,
  value,
  inputDir = 'ltr',
  inputMode = 'decimal',
  prefix,
  suffix,
  helper,
  onChange,
}: {
  label: string;
  value: string;
  inputDir?: 'ltr' | 'rtl';
  inputMode?: 'decimal' | 'text';
  prefix?: string;
  suffix?: string;
  helper?: string;
  onChange: (value: string) => void;
}) {
  const normalizeInput = (nextValue: string) => inputMode === 'decimal'
    ? normalizeDigits(nextValue)
    : nextValue;

  return (
    <label className="tool-input">
      <span>{label}</span>
      <div className="tool-input-shell">
        {prefix ? <em dir="ltr">{prefix}</em> : null}
        <input value={value} inputMode={inputMode} dir={inputDir} onChange={event => onChange(normalizeInput(event.target.value))} />
        {suffix ? <em dir={suffix === '%' ? 'ltr' : undefined}>{suffix}</em> : null}
      </div>
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

export function ToolSelect({
  label,
  value,
  options,
  helper,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  helper?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="tool-input">
      <span>{label}</span>
      <div className="tool-input-shell select">
        <select value={value} onChange={event => onChange(event.target.value)}>
          {options.map(([optionValue, optionLabel]) => (
            <option value={optionValue} key={optionValue}>{optionLabel}</option>
          ))}
        </select>
      </div>
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

export function ToolSegmented({
  label,
  value,
  options,
  helper,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  helper?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="tool-input tool-segmented">
      <span>{label}</span>
      <div className="tool-segmented-row" role="group" aria-label={label}>
        {options.map(([optionValue, optionLabel]) => (
          <button
            type="button"
            key={optionValue}
            aria-pressed={value === optionValue}
            onClick={() => onChange(optionValue)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}

export function ResultGrid({ rows, title, subtitle }: { rows: Array<[string, string, ('ltr' | 'rtl' | 'auto')?, ReactNode?]>; title?: string; subtitle?: string }) {
  return (
    <section className="tool-results" aria-label={title}>
      {(title || subtitle) && (
        <div className="tool-results-head">
          {title && <strong className="tool-results-title">{title}</strong>}
          {subtitle && <small>{subtitle}</small>}
        </div>
      )}
      <div className="tool-result-grid">
        {rows.map(([label, value, valueDir, icon]) => (
          <div className="tool-result-card" key={label}>
            <span className="tool-result-icon" aria-hidden="true">{icon ?? <Calculator size={16} />}</span>
            <span>{label}</span>
            <b dir={valueDir ?? 'ltr'}>{value}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FormulaCard({ title, body, example }: { title: string; body: string; example: string }) {
  return (
    <article className="tool-formula-card">
      <span><Calculator size={16} /></span>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
        <b dir="ltr">{example}</b>
      </div>
    </article>
  );
}

export function PerformanceTable({ t, locale, performance }: { t: (key: string) => string; locale: string; performance: ApiListState<MarketPerformanceItem> }) {
  if (performance.loading) return <MarketSectionLoading label={t('market_loading_performance')} />;
  if (performance.items.length === 0) {
    return <EmptyToolState title={t('market_performance_unavailable_title')} body={performance.message || t('market_performance_unavailable_body')} />;
  }
  const sorted = [...performance.items].sort((a, b) => Number(b.change_1d ?? -Infinity) - Number(a.change_1d ?? -Infinity));
  const displayPrice = (item: MarketPerformanceItem) => Number.isFinite(Number(item.price))
    ? money(Number(item.price), item.currency ?? null, { locale, exchange: item.exchange, symbol: item.symbol })
    : t('market_unavailable');
  const displayPercent = (value: number | null | undefined) => Number.isFinite(Number(value)) ? percent(Number(value)) : t('market_unavailable');
  const trendLabel = (value?: string | null) => t(`market_trend_${normalizePerformanceTrend(value)}`);

  return (
    <section className="performance-table-section" aria-label={t('market_asset_performance')}>
      <div className="trader-table-wrap performance-table-wrap">
        <table className="trader-table performance-table">
          <thead>
            <tr>
              <th>{t('market_symbol')}</th>
              <th>{t('market_symbol_name')}</th>
              <th>{t('market_current_price')}</th>
              <th>{t('market_daily_change')}</th>
              <th>{t('market_weekly_change')}</th>
              <th>{t('market_monthly_change')}</th>
              <th>{t('market_trend')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(item => (
              <tr key={`${item.symbol}-${item.asset_type}`}>
                <td data-label={t('market_symbol')}>
                  <AssetIdentity
                    variant="badge"
                    className="performance-symbol"
                    symbol={item.symbol}
                    name={item.name}
                    assetType={item.asset_type}
                    exchange={item.exchange ?? undefined}
                    size="xs"
                    showName={false}
                  />
                </td>
                <td data-label={t('market_symbol_name')}>{item.name}</td>
                <td data-label={t('market_current_price')}><span className="performance-value" dir="ltr">{displayPrice(item)}</span></td>
                <td data-label={t('market_daily_change')}><span className={`performance-value ${Number(item.change_1d) >= 0 ? 'up' : 'down'}`} dir="ltr">{displayPercent(item.change_1d)}</span></td>
                <td data-label={t('market_weekly_change')}><span className={`performance-value ${Number(item.change_1w) >= 0 ? 'up' : 'down'}`} dir="ltr">{displayPercent(item.change_1w)}</span></td>
                <td data-label={t('market_monthly_change')}><span className={`performance-value ${Number(item.change_1m) >= 0 ? 'up' : 'down'}`} dir="ltr">{displayPercent(item.change_1m)}</span></td>
                <td data-label={t('market_trend')}><span className={`performance-trend ${normalizePerformanceTrend(item.trend)}`}>{trendLabel(item.trend)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type EconomicCalendarFilter = 'today' | 'week' | 'high' | 'USD' | 'EUR' | 'GBP' | 'JPY';
type EconomicCalendarEvent = {
  id: string;
  name: string;
  currency: string;
  country: string;
  impact: string;
  previous: string;
  forecast: string;
  actual: string;
  eventTime: Date | null;
  eventTimeLabel: string;
};

