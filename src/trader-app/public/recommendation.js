/* the-sfm trader — shared recommendation normalizer.
   All market cards, detail panels, and follow-trade actions must use this
   object instead of deriving Buy/Sell/Watch labels locally. */
(function (global) {
  "use strict";

  const STATUS = {
    BUY: "buy",
    SELL: "sell",
    WATCH: "watch",
    INSUFFICIENT: "insufficient_data"
  };

  const LABELS = {
    buy: { ar: "شراء", en: "Buy" },
    sell: { ar: "بيع", en: "Sell" },
    watch: { ar: "تحت المراقبة", en: "Watch" },
    insufficient_data: { ar: "بيانات غير كافية", en: "Insufficient data" }
  };

  const WATCH_REASONS = {
    finalWatch: "التوصية النهائية المشتركة ليست شراء أو بيع.",
    lateData: "جودة البيانات متأخرة أو جزئية، لذلك تم خفض الإشارة إلى المراقبة.",
    missingIndicators: "المؤشرات الفنية الأساسية غير مكتملة.",
    missingLevels: "مستويات الدعم والمقاومة غير مكتملة.",
    missingAtr: "ATR غير متاح، لذلك لا يمكن ضبط المخاطرة بثقة.",
    missingNews: "سياق الأخبار أو المعنويات غير متاح.",
    riskReward: "نسبة العائد إلى المخاطرة لا تجتاز بوابة الأمان.",
    highRisk: "المخاطرة مرتفعة، لذلك لا تُعرض إشارة شراء أو بيع."
  };

  const INSUFFICIENT_REASON = "البيانات غير كافية لإصدار إشارة شراء أو بيع آمنة.";
  const MIN_RISK_REWARD = 1.5;

  function finiteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function isValidPrice(value) {
    const parsed = finiteNumber(value);
    return parsed !== null && parsed > 0;
  }

  function firstValidPrice() {
    for (let index = 0; index < arguments.length; index += 1) {
      const value = finiteNumber(arguments[index]);
      if (value !== null && value > 0) return value;
    }
    return null;
  }

  function firstNumber() {
    for (let index = 0; index < arguments.length; index += 1) {
      const value = finiteNumber(arguments[index]);
      if (value !== null) return value;
    }
    return null;
  }

  function firstText() {
    for (let index = 0; index < arguments.length; index += 1) {
      const value = arguments[index];
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        const nested = firstText.apply(null, value);
        if (nested) return nested;
        continue;
      }
      if (typeof value === "object") continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return "";
  }

  function lower(value) {
    return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  }

  function normalizedDataQuality(value) {
    const raw = lower(value);
    if (!raw) return "unavailable";
    if (raw === "complete" || raw === "live") return raw;
    if (raw === "delayed" || raw === "late" || raw.includes("late") || raw.includes("متأخر")) return "late";
    if (raw === "cached" || raw.includes("cached") || raw.includes("مخزن")) return "cached";
    if (raw === "partial" || raw.includes("partial") || raw.includes("جزئي")) return "partial";
    if (raw === "unavailable" || raw.includes("unavailable") || raw.includes("غير متاح")) return "unavailable";
    return raw;
  }

  function dataQualityFrom(input, context) {
    const rec = input || {};
    const asset = (context && context.asset) || {};
    const detail = (context && context.detail) || {};
    const providerStatus = rec.providerStatus || asset.providerStatus || detail.providerStatus || {};
    const qualityObject = rec.dataQualityStatus || rec.data_quality_status || asset.dataQualityStatus || asset.data_quality_status || {};
    const status = normalizedDataQuality(
      qualityObject.status || rec.dataQuality || rec.data_quality || providerStatus.dataQuality || asset.dataQuality || asset.data_quality
    );
    return {
      status,
      labelAr: qualityObject.labelAr || qualityObject.label_ar || "",
      labelEn: qualityObject.labelEn || qualityObject.label_en || "",
      score: firstNumber(qualityObject.score)
    };
  }

  function parseRecommendationStatus(value) {
    if (value && typeof value === "object") {
      if (value.status) return parseRecommendationStatus(value.status);
      if (value.finalRecommendation) return parseRecommendationStatus(value.finalRecommendation);
    }

    const raw = lower(value);
    if (!raw) return "";
    if (raw.includes("insufficient") || raw.includes("unavailable") || raw.includes("بيانات غير كافية") || raw.includes("غير كاف") || raw.includes("غير متاح")) {
      return STATUS.INSUFFICIENT;
    }
    if (raw === "buy" || raw === "strong buy" || raw === "شراء" || raw === "شراء قوي") return STATUS.BUY;
    if (raw === "sell" || raw === "strong sell" || raw === "بيع" || raw === "بيع قوي") return STATUS.SELL;
    if (raw.includes("weak buy") || raw.includes("cautious buy") || raw.includes("شراء ضعيف") || raw.includes("شراء بحذر") || raw.includes("weak sell") || raw.includes("بيع ضعيف")) {
      return STATUS.WATCH;
    }
    if (raw.includes("wait") || raw.includes("hold") || raw.includes("watch") || raw.includes("انتظار") || raw.includes("مراقبة") || raw.includes("متابعة")) {
      return STATUS.WATCH;
    }
    if (raw.includes("sell") || raw.includes("short") || raw.includes("بيع")) return STATUS.SELL;
    if (raw.includes("buy") || raw.includes("long") || raw.includes("شراء")) return STATUS.BUY;
    return "";
  }

  function sourceStatus(input) {
    const rec = input || {};
    const normalized = rec.normalizedRecommendation || rec.finalRecommendationNormalized || rec.sharedRecommendation;
    const fromNormalized = parseRecommendationStatus(normalized);
    if (fromNormalized) return fromNormalized;

    const finalStatus = parseRecommendationStatus(
      rec.finalRecommendationStatus || rec.final_recommendation_status || rec.recommendationStatus || rec.recommendation_status || rec.finalRecommendation || rec.final_recommendation || rec.finalRecommendationAr || rec.final_recommendation_ar
    );
    if (finalStatus) return finalStatus;

    const actionStatus = parseRecommendationStatus(rec.action || rec.signal || rec.recommendation || rec.side || rec.type);
    return actionStatus || STATUS.WATCH;
  }

  function currentPriceFrom(input, context) {
    const rec = input || {};
    const asset = (context && context.asset) || {};
    return firstValidPrice(rec.currentPrice, rec.current_price, rec.price, rec.lastPrice, rec.regularMarketPrice, rec.close, asset.currentPrice, asset.current_price, asset.price, asset.lastPrice, asset.regularMarketPrice, asset.close);
  }

  function targetPriceFrom(input) {
    const rec = input || {};
    return firstValidPrice(rec.targetPrice, rec.target_price, rec.target, rec.target1, rec.expectedPrice, rec.expected_price, Array.isArray(rec.takeProfit) ? rec.takeProfit[0] : null);
  }

  function stopLossFrom(input) {
    const rec = input || {};
    return firstValidPrice(rec.stopLoss, rec.stop_loss, rec.stop);
  }

  function riskRewardFrom(currentPrice, targetPrice, stopLoss, input) {
    const rec = input || {};
    const explicit = firstNumber(rec.riskReward, rec.risk_reward, rec.riskRewardRatio, rec.risk_reward_ratio);
    if (explicit !== null) return explicit;
    if (currentPrice === null || targetPrice === null || stopLoss === null || currentPrice === stopLoss) return null;
    return Math.abs((targetPrice - currentPrice) / (currentPrice - stopLoss));
  }

  function technicalIndicators(input, context) {
    const rec = input || {};
    const asset = (context && context.asset) || {};
    const tech = (context && context.detail && context.detail.tech) || {};
    const summary = rec.technicalSummary || rec.technical_summary || asset.technicalSummary || asset.technical_summary || tech.technicalSummary || tech.technical_summary || {};
    const indicators = summary.indicators || {};
    return {
      rsi: firstNumber(indicators.rsi14, indicators.rsi, rec.rsi14, rec.rsi, asset.rsi14, asset.rsi, tech.rsi14, tech.rsi),
      ema20: firstNumber(indicators.ema20, rec.ema20, asset.ema20, tech.ema20),
      ema50: firstNumber(indicators.ema50, rec.ema50, asset.ema50, tech.ema50),
      ema200: firstNumber(indicators.ema200, rec.ema200, asset.ema200, tech.ema200),
      sma20: firstNumber(indicators.sma20, rec.sma20, asset.sma20, tech.sma20),
      sma50: firstNumber(indicators.sma50, rec.sma50, asset.sma50, tech.sma50),
      macd: firstNumber(indicators.macd, rec.macd, asset.macd, tech.macd),
      macdSignal: firstNumber(indicators.macdSignal, indicators.macd_signal, rec.macdSignal, rec.macd_signal, asset.macdSignal, asset.macd_signal, tech.macdSignal, tech.macd_signal),
      support: firstNumber(indicators.support, rec.support, rec.support1, asset.support, asset.support1, tech.support, tech.s1, tech.support1),
      resistance: firstNumber(indicators.resistance, rec.resistance, rec.resistance1, asset.resistance, asset.resistance1, tech.resistance, tech.r1, tech.resistance1),
      atr: firstNumber(indicators.atr, indicators.atr14, rec.atr, rec.atr14, asset.atr, asset.atr14, tech.atr, tech.atr14)
    };
  }

  function newsContext(input, context) {
    const rec = input || {};
    const asset = (context && context.asset) || {};
    const detail = (context && context.detail) || {};
    return rec.newsSentimentSummary || rec.news_sentiment_summary || asset.newsSentimentSummary || asset.news_sentiment_summary || detail.newsSentimentSummary || null;
  }

  function hasNewsContext(input, context) {
    const news = newsContext(input, context);
    if (!news || typeof news !== "object") return false;
    if (news.status && String(news.status).toLowerCase() !== "available") return false;
    const count = finiteNumber(news.articleCount ?? news.article_count);
    return count === null ? Boolean(news.summaryAr || news.summaryEn || news.summary) : count > 0;
  }

  function riskKey(value) {
    const raw = lower(value && typeof value === "object" ? value.level || value.label : value);
    if (raw.includes("high") || raw.includes("مرتفع") || raw.includes("عالي")) return "high";
    if (raw.includes("low") || raw.includes("منخفض")) return "low";
    return "medium";
  }

  function hasCoreIndicators(indicators) {
    return [indicators.rsi, indicators.ema20, indicators.ema50, indicators.ema200, indicators.sma20, indicators.sma50, indicators.macd, indicators.macdSignal]
      .some(value => value !== null);
  }

  function sourceReason(input) {
    const rec = input || {};
    return firstText(
      rec.reason,
      rec.explanationAr,
      rec.explanation && rec.explanation.ar,
      rec.explanation,
      rec.explanationEn,
      rec.summary,
      rec.reasons && rec.reasons[0],
      rec.warnings && rec.warnings[0]
    );
  }

  function normalizeRecommendation(input, context) {
    const rec = input || {};
    const statusFromSource = sourceStatus(rec);
    const currentPrice = currentPriceFrom(rec, context);
    const targetPrice = targetPriceFrom(rec);
    const stopLoss = stopLossFrom(rec);
    const riskReward = riskRewardFrom(currentPrice, targetPrice, stopLoss, rec);
    const dataQuality = dataQualityFrom(rec, context);
    const indicators = technicalIndicators(rec, context);
    const technicalUnavailable = rec.technicalAvailable === false || rec.technical_available === false || ((context && context.detail && context.detail.tech) || {}).available === false;
    const signalUnavailable = rec.signalAvailable === false || rec.signal_available === false;
    const missingPrice = !isValidPrice(currentPrice);
    const missingIndicators = technicalUnavailable || !hasCoreIndicators(indicators);
    const missingLevels = indicators.support === null || indicators.resistance === null;
    const missingAtr = indicators.atr === null;
    const missingNews = !hasNewsContext(rec, context);
    const riskLevel = riskKey(rec.riskLevel || rec.risk || ((context && context.asset) || {}).riskLevel || ((context && context.asset) || {}).risk);
    const riskRewardFailed = (statusFromSource === STATUS.BUY || statusFromSource === STATUS.SELL)
      && (targetPrice === null || stopLoss === null || riskReward === null || riskReward < MIN_RISK_REWARD);

    const safetyReasons = [];
    if (dataQuality.status === "late" || dataQuality.status === "partial" || dataQuality.status === "cached") safetyReasons.push(WATCH_REASONS.lateData);
    if (missingIndicators) safetyReasons.push(WATCH_REASONS.missingIndicators);
    if (missingLevels) safetyReasons.push(WATCH_REASONS.missingLevels);
    if (missingAtr) safetyReasons.push(WATCH_REASONS.missingAtr);
    if (missingNews) safetyReasons.push(WATCH_REASONS.missingNews);
    if (riskRewardFailed) safetyReasons.push(WATCH_REASONS.riskReward);
    if (riskLevel === "high" && (statusFromSource === STATUS.BUY || statusFromSource === STATUS.SELL)) safetyReasons.push(WATCH_REASONS.highRisk);

    let status = statusFromSource;
    if (status === STATUS.BUY || status === STATUS.SELL) {
      if (signalUnavailable || missingPrice || dataQuality.status === "unavailable") status = STATUS.INSUFFICIENT;
      else if (safetyReasons.length) status = STATUS.WATCH;
    } else if (status !== STATUS.INSUFFICIENT) {
      status = STATUS.WATCH;
    }

    if (statusFromSource === STATUS.INSUFFICIENT || signalUnavailable || missingPrice || dataQuality.status === "unavailable") {
      status = STATUS.INSUFFICIENT;
    }

    const label = LABELS[status] || LABELS.watch;
    const fallbackReason = status === STATUS.INSUFFICIENT
      ? INSUFFICIENT_REASON
      : safetyReasons[0] || WATCH_REASONS.finalWatch;
    const reason = sourceReason(rec) || fallbackReason;
    const canFollowTrade = (status === STATUS.BUY || status === STATUS.SELL)
      && isValidPrice(currentPrice)
      && isValidPrice(targetPrice)
      && isValidPrice(stopLoss)
      && !missingIndicators
      && riskReward !== null
      && riskReward >= MIN_RISK_REWARD;

    return {
      status,
      actionLabelAr: label.ar,
      actionLabelEn: label.en,
      confidence: firstNumber(rec.aiConfidence, rec.ai_confidence, rec.confidence, rec.score),
      reason: status === STATUS.WATCH && safetyReasons.length ? safetyReasons.join(" ") : reason,
      dataQuality,
      canFollowTrade,
      currentPrice,
      targetPrice,
      stopLoss,
      riskReward,
      riskLevel,
      safetyReasons,
      sourceStatus: statusFromSource
    };
  }

  function statusTone(status) {
    if (status === STATUS.BUY) return "ok";
    if (status === STATUS.SELL) return "warn";
    if (status === STATUS.INSUFFICIENT) return "muted";
    return "";
  }

  const api = {
    STATUS,
    LABELS,
    MIN_RISK_REWARD,
    normalizeRecommendation,
    parseRecommendationStatus,
    normalizedDataQuality,
    statusTone,
    isBuyStatus(status) { return status === STATUS.BUY; },
    isSellStatus(status) { return status === STATUS.SELL; },
    labelAr(status) { return (LABELS[status] || LABELS.watch).ar; },
    labelEn(status) { return (LABELS[status] || LABELS.watch).en; }
  };

  global.SFMRecommendation = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
