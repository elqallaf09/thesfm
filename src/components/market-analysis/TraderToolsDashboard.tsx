'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, BarChart3, Calculator, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Gauge, Landmark, LineChart, Percent, PieChart, Plus, RefreshCw, ShieldAlert, Sparkles, TrendingUp, WalletCards } from 'lucide-react';
import { calculateLotSizeByRisk, calculatePips, calculatePositionSize, type TradeDirection, type TradingInstrumentType } from '@/lib/trading/calculators';
import type { MarketAssetType } from '@/lib/market/marketService';
import { currencyDisplaySymbol } from '@/lib/currencies';
import { supabase } from '@/integrations/supabase/client';
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
  userId,
  subTab,
  setSubTab,
  performance,
}: {
  t: (key: string) => string;
  locale: string;
  currency: string;
  userId?: string;
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
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [currencyMessage, setCurrencyMessage] = useState('');
  const [currencyError, setCurrencyError] = useState('');
  const [showIncomePrompt, setShowIncomePrompt] = useState(true);

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
  const lotValue = position.lotSize === null ? t('market_unavailable') : `${formatNumber(position.lotSize, 2)} ${t('market_lot_unit')}`;
  const riskPercentDisplay = `${formatNumber(parseNumber(positionInput.riskPercentage), 2)}%`;
  const stopLossDisplay = `${formatNumber(parseNumber(positionInput.stopLossDistance), 0)} ${pipUnit}`;

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
            <section className="trader-highlight-result">
              <span>{t('market_suitable_position_size')}</span>
              <strong dir="ltr">{lotValue}</strong>
              <p>
                {t('market_risk_result_explanation_start')}{' '}
                <b dir="ltr">{money(position.riskAmount, accountCurrency)}</b>{' '}
                {t('market_risk_result_explanation_middle')}{' '}
                <b dir="ltr">{riskPercentDisplay}</b>{' '}
                {t('market_risk_result_explanation_end')}{' '}
                <b dir="ltr">{stopLossDisplay}</b>.
              </p>
            </section>
            <ResultGrid title={t('market_calculation_results')} subtitle={t('market_live_calculation_note')} rows={[
              [t('market_risk_amount'), money(position.riskAmount, accountCurrency), 'ltr', <CircleDollarSign key="risk-amount" size={16} />],
              [t('market_suggested_position_size'), formatNumber(position.positionSize, 4), 'ltr', <TrendingUp key="position-size" size={16} />],
              [t('market_lot_size'), lotValue, 'ltr', <PieChart key="lot-size" size={16} />],
              [t('market_expected_loss'), money(position.estimatedLoss, accountCurrency), 'ltr', <ShieldAlert key="expected-loss" size={16} />],
            ]} />
            <FormulaCard
              title={t('market_calculation_method')}
              body={t('market_risk_formula')}
              example={`${accountCurrency} ${formatNumber(parseNumber(positionInput.accountBalance), 2)} × ${formatNumber(parseNumber(positionInput.riskPercentage), 2)}% = ${money(position.riskAmount, accountCurrency)}`}
            />
            {position.riskWarning && <p className="tool-warning">{t('market_risk_above_two_warning')}</p>}
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
            <div className="trader-form-grid trader-premium-form-grid">
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
              <ToolInput label={t('market_entry_price')} helper={t('market_entry_price_hint')} value={pipsInput.entryPrice} onChange={value => setPipsInput(prev => ({ ...prev, entryPrice: value }))} />
              <ToolInput label={t('market_exit_price')} helper={t('market_exit_price_hint')} value={pipsInput.exitPrice} onChange={value => setPipsInput(prev => ({ ...prev, exitPrice: value }))} />
              <ToolInput label={t('market_lot_size')} helper={t('market_lot_size_hint')} suffix={t('market_lot_unit')} value={pipsInput.lotSize} onChange={value => setPipsInput(prev => ({ ...prev, lotSize: value }))} />
              <ToolInput label={t('market_point_size')} helper={t('market_point_size_hint')} suffix={pipUnit} value={pipsInput.pointSize} onChange={value => setPipsInput(prev => ({ ...prev, pointSize: value }))} />
              <ToolInput label={t('market_point_value_per_lot')} helper={t('market_point_value_per_lot_hint')} prefix={accountCurrency} value={pipsInput.pipValue} onChange={value => setPipsInput(prev => ({ ...prev, pipValue: value }))} />
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
            </div>
            <p className="tool-warning">{t(pipCalculatorWarningKey(pipsInput.assetType))}</p>
          </article>
          <aside className="trader-result-stack trader-premium-result-stack">
            <section className="trader-highlight-result">
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
              example={`${selectedPipAsset.symbol} | (${formatNumber(pipsPriceDifference, 5)} ÷ ${formatNumber(pipsPointSize, 5)}) × ${accountCurrency} ${formatNumber(pipsPointValue, 2)} × ${formatNumber(parseNumber(pipsInput.lotSize), 2)} = ${money(pips.profitLoss, accountCurrency)}`}
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
            <div className="trader-form-grid trader-premium-form-grid">
              <ToolInput label={t('market_account_balance')} helper={t('market_account_balance_hint')} prefix={accountCurrency} value={lotInput.accountBalance} onChange={value => setLotInput(prev => ({ ...prev, accountBalance: value }))} />
              <ToolInput label={t('market_risk_percentage')} helper={t('market_risk_percentage_hint')} suffix="%" value={lotInput.riskPercentage} onChange={value => setLotInput(prev => ({ ...prev, riskPercentage: value }))} />
              <ToolInput label={t('market_stop_loss_pips')} helper={t('market_stop_loss_hint')} suffix={pipUnit} value={lotInput.stopLossPips} onChange={value => setLotInput(prev => ({ ...prev, stopLossPips: value }))} />
              <ToolInput label={t('market_pip_value')} helper={t('market_pip_value_hint')} prefix={accountCurrency} value={lotInput.pipValue} onChange={value => setLotInput(prev => ({ ...prev, pipValue: value }))} />
              <details className="tool-advanced">
                <summary>{t('market_advanced_settings')}</summary>
                <ToolInput label={t('market_pair_asset_type')} helper={t('market_asset_pair_hint')} value={lotInput.assetType} inputDir="ltr" inputMode="text" onChange={value => setLotInput(prev => ({ ...prev, assetType: value.toUpperCase() }))} />
              </details>
            </div>
          </article>
          <aside className="trader-result-stack trader-premium-result-stack">
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
              example={`${money((parseNumber(lotInput.accountBalance) * parseNumber(lotInput.riskPercentage)) / 100, accountCurrency)} ÷ (${formatNumber(parseNumber(lotInput.stopLossPips), 2)} ${pipUnit} × ${accountCurrency} ${formatNumber(parseNumber(lotInput.pipValue), 2)})`}
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
            <div className="trader-form-grid trader-premium-form-grid">
              <ToolInput label={t('market_trade_size')} helper={t('market_trade_size_hint')} value={marginInput.tradeSize} onChange={value => setMarginInput(prev => ({ ...prev, tradeSize: value }))} />
              <ToolInput label={t('market_current_price')} helper={t('market_margin_price_hint')} prefix={accountCurrency} value={marginInput.currentPrice} onChange={value => setMarginInput(prev => ({ ...prev, currentPrice: value }))} />
              <ToolInput label={t('market_leverage')} helper={t('market_leverage_hint')} prefix="1:" value={marginInput.leverage} onChange={value => setMarginInput(prev => ({ ...prev, leverage: value }))} />
            </div>
          </article>
          <aside className="trader-result-stack trader-premium-result-stack">
            <ResultGrid title={t('market_calculation_results')} subtitle={t('market_live_calculation_note')} rows={[
              [t('market_required_margin'), money(margin.required, accountCurrency), 'ltr', <Landmark key="required-margin" size={16} />],
              [t('market_trade_size'), formatNumber(margin.tradeSize, 2), 'ltr', <TrendingUp key="margin-trade-size" size={16} />],
              [t('market_leverage'), `1:${formatNumber(margin.leverage, 0)}`, 'ltr', <Gauge key="margin-leverage" size={16} />],
            ]} />
            <FormulaCard
              title={t('market_calculation_method')}
              body={t('market_margin_formula')}
              example={`(${formatNumber(margin.tradeSize, 2)} × ${formatNumber(parseNumber(marginInput.currentPrice), 4)}) ÷ ${formatNumber(margin.leverage, 0)} = ${money(margin.required, accountCurrency)}`}
            />
          </aside>
        </div>
      );
    }

    return <PerformanceTable t={t} locale={locale} performance={performance} />;
  };

  return (
    <section className="trader-premium-dashboard">
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
          <TraderSupportCard icon={<WalletCards size={18} />} title={t('market_tool_summary')}>
            <p>{t('market_tool_summary_body')}</p>
          </TraderSupportCard>

          <TraderSupportCard icon={<Sparkles size={18} />} title={t('market_quick_tip')}>
            <p>{t('market_quick_tip_body')}</p>
          </TraderSupportCard>

          <TraderSupportCard icon={<Calculator size={18} />} title={t('market_calculation_results')} highlight>
            <div className="trader-side-result-grid">
              <TraderSideStat icon={<BarChart3 size={16} />} label={t('market_lot_size')} value={lotValue} />
              <TraderSideStat icon={<WalletCards size={16} />} label={t('market_cash_risk')} value={money(position.riskAmount, accountCurrency)} />
              <TraderSideStat icon={<Percent size={16} />} label={t('market_risk_percentage')} value={riskPercentDisplay} />
            </div>
          </TraderSupportCard>

          <TraderSupportCard icon={<CheckCircle2 size={18} />} title={t('market_usage_steps')}>
            <ol className="trader-steps">
              <li>{t('market_usage_step_balance')}</li>
              <li>{t('market_usage_step_stop_loss')}</li>
              <li>{t('market_usage_step_result')}</li>
            </ol>
          </TraderSupportCard>

          {showIncomePrompt ? (
            <article className="trader-income-prompt-card" aria-label={t('market_income_prompt_title')}>
              <span className="trader-income-prompt-icon" aria-hidden="true">
                <WalletCards size={30} />
              </span>
              <div className="trader-income-prompt-copy">
                <h3>{t('market_income_prompt_title')}</h3>
                <p>{t('market_income_prompt_body')}</p>
              </div>
              <div className="trader-income-actions">
                <a className="trader-income-action primary" href="/income/add" aria-label={t('market_income_prompt_primary')}>
                  <Plus size={17} aria-hidden="true" />
                  <span>{t('market_income_prompt_primary')}</span>
                  {isRtlLocale ? <ChevronLeft size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
                </a>
                <button
                  type="button"
                  className="trader-income-action secondary"
                  onClick={() => setShowIncomePrompt(false)}
                  aria-label={t('market_income_prompt_secondary')}
                >
                  {t('market_income_prompt_secondary')}
                </button>
              </div>
            </article>
          ) : null}
        </aside>
        ) : null}

        <article className="trader-premium-main-card">
          <div className="trader-premium-main-head">
            <span className="trader-premium-tool-icon">{activeTool.icon}</span>
            <div>
              <span>{t('market_active_tool')} · {activeToolIndex}/{toolItems.length}</span>
              <h3>{activeTool.title}</h3>
              <p>{activeDescription}</p>
            </div>
            <div className="trader-premium-save" aria-label={t('market_save_account_currency_default')}>
              <span className="trader-premium-save-icon"><WalletCards size={16} /></span>
              <div>
                <strong>{t('market_save_account_currency_default')}</strong>
                <small>{t('market_account_currency_hint')}</small>
              </div>
              <button type="button" onClick={handleSaveDefaultCurrency} disabled={savingCurrency}>
                <CheckCircle2 size={14} />
                {savingCurrency ? t('market_saving') : t('market_save_preference')}
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
        .trader-support-column {
          gap: 18px;
        }

        .trader-support-card,
        .trader-income-prompt-card {
          position: relative;
          min-width: 0;
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(29, 140, 255, .14);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .94), rgba(239, 248, 255, .78)),
            var(--sfm-card);
          box-shadow: 0 16px 42px rgba(3, 18, 37, .08);
        }

        .trader-support-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: start;
          padding: 22px;
        }

        .trader-support-card > div {
          min-width: 0;
          display: grid;
          gap: 12px;
        }

        .trader-support-icon {
          width: 54px;
          height: 54px;
          border-radius: 22px;
          color: var(--sfm-primary-hover);
          background: linear-gradient(135deg, rgba(29, 140, 255, .10), rgba(47, 214, 192, .13));
          border: 1px solid rgba(29, 140, 255, .16);
          box-shadow: 0 12px 26px rgba(29, 140, 255, .10);
        }

        .trader-support-card h3 {
          color: var(--sfm-foreground);
          font-size: clamp(15px, 1.6vw, 18px);
          font-weight: 950;
          line-height: 1.35;
        }

        .trader-support-card p {
          max-width: 38rem;
          color: var(--sfm-muted);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.75;
        }

        .trader-support-card.highlight {
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .10)),
            var(--sfm-card);
          border-color: rgba(47, 214, 192, .24);
        }

        .trader-side-result-grid {
          display: grid;
          gap: 10px;
          margin-top: 0;
        }

        .trader-side-stat {
          min-width: 0;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          border-radius: 17px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: rgba(255, 255, 255, .78);
          padding: 12px;
        }

        .trader-side-stat-icon {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          color: var(--sfm-primary-hover);
          background: rgba(29, 140, 255, .08);
          border: 1px solid rgba(29, 140, 255, .10);
        }

        .trader-side-stat span:not(.trader-side-stat-icon) {
          color: var(--sfm-muted);
          font-size: 13px;
          font-weight: 900;
          line-height: 1.45;
        }

        .trader-side-stat b {
          min-width: 0;
          color: var(--sfm-foreground);
          font-size: clamp(15px, 1.8vw, 18px);
          font-weight: 950;
          line-height: 1.2;
          text-align: end;
          white-space: nowrap;
        }

        .trader-steps {
          position: relative;
          margin: 2px 0 0;
          padding: 0;
          list-style: none;
          counter-reset: traderStep;
          display: grid;
          gap: 12px;
        }

        .trader-steps li {
          position: relative;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          color: var(--sfm-muted);
          font-size: 14px;
          font-weight: 850;
          line-height: 1.75;
        }

        .trader-steps li::before {
          counter-increment: traderStep;
          content: counter(traderStep);
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          font-size: 13px;
          font-weight: 950;
          box-shadow: 0 10px 20px rgba(29, 140, 255, .18);
        }

        .trader-income-prompt-card {
          display: grid;
          justify-items: center;
          text-align: center;
          gap: 22px;
          padding: clamp(18px, 3vw, 28px) 18px;
        }

        .trader-income-prompt-icon {
          width: 96px;
          height: 96px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: var(--sfm-soft-cyan);
          background:
            radial-gradient(circle at 30% 25%, rgba(255, 255, 255, .96), rgba(234, 246, 255, .74)),
            rgba(47, 214, 192, .08);
          border: 1px solid rgba(47, 214, 192, .28);
          box-shadow: 0 18px 42px rgba(29, 140, 255, .12);
        }

        .trader-income-prompt-copy {
          display: grid;
          gap: 14px;
          max-width: 31rem;
        }

        .trader-income-prompt-copy h3 {
          margin: 0;
          color: var(--sfm-foreground);
          font-size: clamp(18px, 2.2vw, 24px);
          font-weight: 950;
          line-height: 1.4;
        }

        .trader-income-prompt-copy p {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 15px;
          font-weight: 800;
          line-height: 2;
        }

        .trader-income-actions {
          width: 100%;
          display: grid;
          gap: 14px;
        }

        .trader-income-action {
          min-height: 50px;
          width: 100%;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 18px;
          font: 950 15px Tajawal, Arial, sans-serif;
          text-decoration: none;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease, color .18s ease;
        }

        .trader-income-action:focus-visible {
          outline: 3px solid rgba(24, 212, 212, .34);
          outline-offset: 3px;
        }

        .trader-income-action.primary {
          border: 0;
          color: #fff;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 16px 32px rgba(29, 140, 255, .22);
        }

        .trader-income-action.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 20px 38px rgba(29, 140, 255, .28);
        }

        .trader-income-action.primary:active,
        .trader-income-action.secondary:active {
          transform: scale(.985);
        }

        .trader-income-action.secondary {
          border: 1px solid rgba(29, 140, 255, .32);
          color: var(--sfm-primary-hover);
          background: rgba(255, 255, 255, .70);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .60);
        }

        .trader-income-action.secondary:hover {
          color: var(--sfm-foreground);
          background: rgba(29, 140, 255, .08);
          border-color: rgba(47, 214, 192, .45);
        }

        .dark .trader-support-card,
        .dark .trader-income-prompt-card {
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .10), rgba(47, 214, 192, .07)),
            #0f1d31;
          border-color: #1d3050;
          box-shadow: 0 18px 46px rgba(0, 0, 0, .28);
        }

        .dark .trader-support-card.highlight {
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .14), rgba(47, 214, 192, .10)),
            #0f1d31;
          border-color: rgba(47, 214, 192, .30);
        }

        .dark .trader-support-icon,
        .dark .trader-side-stat-icon,
        .dark .trader-income-prompt-icon {
          color: #2FD6C0;
          background: rgba(47, 214, 192, .12);
          border-color: rgba(47, 214, 192, .24);
          box-shadow: none;
        }

        .dark .trader-side-stat {
          background: #0a1422;
          border-color: #1d3050;
        }

        .dark .trader-side-stat b {
          color: #f8fbff;
        }

        .dark .trader-income-action.secondary {
          color: #d8f7f3;
          background: rgba(10, 20, 34, .72);
          border-color: rgba(47, 214, 192, .26);
          box-shadow: none;
        }

        .dark .trader-income-action.secondary:hover {
          color: #fff;
          background: rgba(47, 214, 192, .12);
          border-color: rgba(47, 214, 192, .42);
        }

        @media (min-width: 1181px) {
          .trader-income-prompt-card {
            min-height: 420px;
            align-content: center;
          }
        }

        @media (max-width: 720px) {
          .trader-support-card {
            grid-template-columns: minmax(0, 1fr) auto;
            border-radius: 24px;
            padding: 18px;
          }

          .trader-side-stat {
            grid-template-columns: 38px minmax(0, 1fr);
          }

          .trader-side-stat b {
            grid-column: 2;
            text-align: start;
            white-space: normal;
          }

          .trader-income-prompt-card {
            border-radius: 24px;
            padding: 24px 18px;
          }

          .trader-income-prompt-icon {
            width: 78px;
            height: 78px;
          }

          .trader-income-action {
            min-height: 48px;
            font-size: 14px;
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

export function TraderSideStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="trader-side-stat">
      <span className="trader-side-stat-icon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
      <b dir="ltr">{value}</b>
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
  return (
    <label className="tool-input">
      <span>{label}</span>
      <div className="tool-input-shell">
        {prefix ? <em dir="ltr">{prefix}</em> : null}
        <input value={value} inputMode={inputMode} dir={inputDir} onChange={event => onChange(event.target.value)} />
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
                <td data-label={t('market_symbol')}><span className="performance-symbol" dir="ltr">{item.symbol}</span></td>
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

