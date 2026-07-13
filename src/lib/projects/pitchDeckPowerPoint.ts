import pptxgen from 'pptxgenjs';

import {
  createStaticPresentationCardShadow,
  STATIC_PRESENTATION_VISUAL_TOKENS,
} from '@/styles/static-tokens';

export type PitchDeckLanguage = 'ar' | 'en' | 'fr';
export type PitchDeckSlideStatus = 'complete' | 'needs_data' | 'not_ready';

export type PitchDeckSlide = {
  id: string;
  title: string;
  status: PitchDeckSlideStatus;
  content: {
    headline: string;
    bullets: string[];
    metrics: Array<{ label: string; value: string }>;
    notes: string;
  };
  missingData: Array<{ label: string; tab?: string }>;
  suggestions: string[];
};

export type PitchDeckExportData = {
  projectName: string;
  language: PitchDeckLanguage;
  completionPercent: number;
  readinessLabel: string;
  slides: PitchDeckSlide[];
  generatedAt: string;
};

const NOTES_TEXT = {
  ar: {
    voice: 'نص التعليق الصوتي',
    animation: 'خطة الحركة المقترحة',
    missing: 'تنبيهات البيانات الناقصة',
    tips: 'نصائح للمقدم',
    disclaimer: 'هذا العرض تم إنشاؤه لأغراض التخطيط والعرض الأولي فقط. يجب مراجعة جميع الأرقام والمعلومات قبل مشاركته مع المستثمرين أو الجهات الرسمية.',
    noMissing: 'لا توجد بيانات ناقصة واضحة في هذه الشريحة.',
    animationPlan: 'يظهر العنوان أولا، ثم تظهر النقاط الرئيسية بالتتابع، وبعدها تظهر بطاقات المؤشرات أو التنبيه النهائي.',
    tip: 'لا تذكر أي رقم غير موجود في بيانات THE SFM، ووضح أن التحليل مبني على البيانات المتاحة فقط.',
    source: 'مصدر المحتوى',
    aiDesigned: 'AI-designed',
    rulesDesigned: 'Rule-based design',
  },
  en: {
    voice: 'Voice-over script',
    animation: 'Suggested animation plan',
    missing: 'Missing data warnings',
    tips: 'Presenter tips',
    disclaimer: 'This pitch deck is generated for planning and preliminary presentation purposes only. Review all numbers and information before sharing with investors or official entities.',
    noMissing: 'No obvious missing data on this slide.',
    animationPlan: 'Fade in the title first, then reveal key bullets one by one, followed by metric cards or the final recommendation.',
    tip: 'Do not mention numbers that are not recorded in THE SFM, and clarify that the analysis is based on available data only.',
    source: 'Content source',
    aiDesigned: 'AI-designed',
    rulesDesigned: 'Rule-based design',
  },
  fr: {
    voice: 'Script de narration',
    animation: 'Plan d’animation suggéré',
    missing: 'Alertes de données manquantes',
    tips: 'Conseils au présentateur',
    disclaimer: 'Ce pitch deck est généré à des fins de planification et de présentation préliminaire uniquement. Vérifiez tous les chiffres et informations avant de le partager.',
    noMissing: 'Aucune donnée manquante évidente sur cette diapositive.',
    animationPlan: 'Faire apparaître le titre en premier, puis les points clés un par un, puis les cartes d’indicateurs ou la recommandation finale.',
    tip: 'Ne mentionnez aucun chiffre absent de THE SFM et précisez que l’analyse repose sur les données disponibles uniquement.',
    source: 'Source du contenu',
    aiDesigned: 'AI-designed',
    rulesDesigned: 'Rule-based design',
  },
} as const;

const PPT_TEXT = {
  ar: {
    reviewTitle: 'مراجعة قبل المشاركة',
    reviewBody: 'راجع الأرقام، المستندات، والمخاطر قبل إرسال العرض لأي مستثمر أو جهة رسمية.',
    readiness: 'جاهزية العرض',
    source: 'مصدر المحتوى',
    nextSteps: 'الخطوات التالية',
    nextStepsBody: 'أكمل البيانات الناقصة، حدث النموذج المالي، ثم صدر نسخة نهائية للمشاركة.',
  },
  en: {
    reviewTitle: 'Review Before Sharing',
    reviewBody: 'Review numbers, documents, and risks before sending this deck to any investor or official party.',
    readiness: 'Deck readiness',
    source: 'Content source',
    nextSteps: 'Next steps',
    nextStepsBody: 'Fill missing data, refresh the financial model, then export a final copy for sharing.',
  },
  fr: {
    reviewTitle: 'Revue avant partage',
    reviewBody: 'Vérifiez les chiffres, documents et risques avant de partager ce deck avec un investisseur ou une entité officielle.',
    readiness: 'Préparation du deck',
    source: 'Source du contenu',
    nextSteps: 'Prochaines étapes',
    nextStepsBody: 'Complétez les données manquantes, mettez à jour le modèle financier, puis exportez une version finale.',
  },
} as const;

const STATUS_COLOR: Record<PitchDeckSlideStatus, string> = {
  complete: STATIC_PRESENTATION_VISUAL_TOKENS.success,
  needs_data: STATIC_PRESENTATION_VISUAL_TOKENS.warning,
  not_ready: STATIC_PRESENTATION_VISUAL_TOKENS.danger,
};

function cleanText(value: unknown, fallback = '') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1)).trim()}…` : value;
}

function fontFaceForMetricValue(value: string) {
  const hasNumericData = /[0-9٠-٩۰-۹%٪]/u.test(value);
  const looksLikeTicker = /^[A-Z0-9]{1,6}(?:[.-][A-Z0-9]{1,5})?$/u.test(value.trim());
  return hasNumericData || looksLikeTicker
    ? STATIC_PRESENTATION_VISUAL_TOKENS.fontData
    : STATIC_PRESENTATION_VISUAL_TOKENS.fontUi;
}

function textOptions(lang: PitchDeckLanguage, extra: Record<string, unknown> = {}) {
  const rtl = lang === 'ar';
  return {
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground,
    rtlMode: rtl,
    align: rtl ? 'right' : 'left',
    valign: 'mid',
    fit: 'shrink',
    margin: 0.08,
    breakLine: false,
    ...extra,
  };
}

function addBrandFooter(
  slide: pptxgen.Slide,
  slideNo: number,
  total: number,
  deck: PitchDeckExportData,
  onDarkSurface = false,
) {
  const brandColor = onDarkSurface
    ? STATIC_PRESENTATION_VISUAL_TOKENS.primarySoft
    : STATIC_PRESENTATION_VISUAL_TOKENS.primary;
  const supportingColor = onDarkSurface
    ? STATIC_PRESENTATION_VISUAL_TOKENS.borderStrong
    : STATIC_PRESENTATION_VISUAL_TOKENS.foregroundMuted;
  slide.addShape('line', {
    x: 0.55,
    y: 7.04,
    w: 12.2,
    h: 0,
    line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.primary, transparency: 65, width: 1 },
  });
  slide.addText('THE SFM', {
    x: 0.58,
    y: 7.12,
    w: 2.2,
    h: 0.18,
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    fontSize: 7.5,
    bold: true,
    color: brandColor,
    margin: 0,
    breakLine: false,
  });
  slide.addText(`${slideNo}/${total}`, {
    x: 11.75,
    y: 7.12,
    w: 1,
    h: 0.18,
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontData,
    fontSize: 7.5,
    bold: true,
    color: supportingColor,
    align: 'right',
    margin: 0,
    breakLine: false,
  });
  slide.addText(truncate(deck.projectName, 42), {
    x: 4.25,
    y: 7.12,
    w: 4.8,
    h: 0.18,
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    fontSize: 7.5,
    color: supportingColor,
    align: 'center',
    margin: 0,
    breakLine: false,
  });
}

function addKicker(slide: pptxgen.Slide, slideData: PitchDeckSlide, lang: PitchDeckLanguage, index: number) {
  const rtl = lang === 'ar';
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.9,
    fill: { color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground },
    line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground },
  });
  slide.addShape('rect', {
    x: rtl ? 12.65 : 0.55,
    y: 0.27,
    w: 0.16,
    h: 0.16,
    rectRadius: 0.03,
    fill: { color: STATIC_PRESENTATION_VISUAL_TOKENS.accent },
    line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.accent },
  });
  slide.addText(`${String(index).padStart(2, '0')} · ${slideData.title}`, {
    x: rtl ? 6.45 : 0.78,
    y: 0.19,
    w: 5.95,
    h: 0.28,
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    fontSize: 9,
    bold: true,
    color: STATIC_PRESENTATION_VISUAL_TOKENS.primarySoft,
    charSpace: 0.6,
    rtlMode: rtl,
    align: rtl ? 'right' : 'left',
    margin: 0,
    breakLine: false,
  } as any);
  slide.addText(slideData.status.replace('_', ' ').toUpperCase(), {
    x: rtl ? 0.55 : 11.25,
    y: 0.2,
    w: 1.55,
    h: 0.24,
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    fontSize: 7.4,
    bold: true,
    color: STATIC_PRESENTATION_VISUAL_TOKENS.foregroundInverse,
    fill: { color: STATUS_COLOR[slideData.status], transparency: 0 },
    align: 'center',
    margin: 0,
    breakLine: false,
    fit: 'shrink',
  });
}

function addMetricCards(slide: pptxgen.Slide, metrics: PitchDeckSlide['content']['metrics'], lang: PitchDeckLanguage) {
  const displayMetrics = metrics.slice(0, 4);
  if (!displayMetrics.length) return;
  const rtl = lang === 'ar';
  const startX = rtl ? 0.75 : 9.15;
  const y = 2.0;
  displayMetrics.forEach((metric, index) => {
    const boxY = y + index * 0.86;
    slide.addShape('roundRect', {
      x: startX,
      y: boxY,
      w: 3.25,
      h: 0.68,
      rectRadius: 0.08,
      fill: { color: STATIC_PRESENTATION_VISUAL_TOKENS.surface },
      line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.primary, transparency: 45 },
      shadow: createStaticPresentationCardShadow(),
    });
    slide.addText(truncate(metric.label, 28), {
      x: startX + 0.18,
      y: boxY + 0.09,
      w: 2.9,
      h: 0.16,
      fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
      fontSize: 7.4,
      bold: true,
      color: STATIC_PRESENTATION_VISUAL_TOKENS.foregroundMuted,
      rtlMode: rtl,
      align: rtl ? 'right' : 'left',
      margin: 0,
      breakLine: false,
      fit: 'shrink',
    });
    slide.addText(truncate(metric.value, 24), {
      x: startX + 0.18,
      y: boxY + 0.32,
      w: 2.9,
      h: 0.22,
      fontFace: fontFaceForMetricValue(metric.value),
      fontSize: 13,
      bold: true,
      color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground,
      rtlMode: rtl,
      align: rtl ? 'right' : 'left',
      margin: 0,
      breakLine: false,
      fit: 'shrink',
    });
  });
}

function addBulletList(slide: pptxgen.Slide, bullets: string[], lang: PitchDeckLanguage, x: number, y: number, w: number, h: number) {
  const rtl = lang === 'ar';
  const safeBullets = bullets.slice(0, 5);
  if (!safeBullets.length) return;
  slide.addText(safeBullets.map(bullet => ({
    text: truncate(bullet, 140),
    options: {
      bullet: { indent: 12 },
      hanging: 4,
      breakLine: true,
    },
  })), {
    x,
    y,
    w,
    h,
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    fontSize: safeBullets.length > 3 ? 13 : 15,
    color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground,
    rtlMode: rtl,
    align: rtl ? 'right' : 'left',
    fit: 'shrink',
    margin: 0.05,
    breakLine: false,
    paraSpaceAfterPt: 8,
  } as any);
}

function addMissingBox(slide: pptxgen.Slide, slideData: PitchDeckSlide, lang: PitchDeckLanguage) {
  if (!slideData.missingData.length) return;
  const rtl = lang === 'ar';
  const missingText = slideData.missingData.map(item => item.label).join(' · ');
  slide.addShape('roundRect', {
    x: rtl ? 0.75 : 0.9,
    y: 6.02,
    w: 11.8,
    h: 0.45,
    rectRadius: 0.08,
    fill: { color: STATIC_PRESENTATION_VISUAL_TOKENS.warningSoft },
    line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.warning, transparency: 60 },
  });
  slide.addText(truncate(missingText, 160), {
    x: rtl ? 1.0 : 1.15,
    y: 6.15,
    w: 11.25,
    h: 0.18,
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    fontSize: 8,
    bold: true,
    color: STATIC_PRESENTATION_VISUAL_TOKENS.warning,
    rtlMode: rtl,
    align: rtl ? 'right' : 'left',
    margin: 0,
    breakLine: false,
    fit: 'shrink',
  });
}

function addFinancialVisual(slide: pptxgen.Slide, slideData: PitchDeckSlide, lang: PitchDeckLanguage) {
  if (slideData.id !== 'financial_plan' || slideData.content.metrics.length < 2) return;
  const rtl = lang === 'ar';
  const x = rtl ? 5.3 : 0.9;
  const y = 5.03;
  const metrics = slideData.content.metrics.slice(0, 4);
  metrics.forEach((metric, index) => {
    const barWidth = 0.75 + Math.min(2.25, metric.value.length * 0.08);
    const barX = rtl ? x + (3.15 - barWidth) : x;
    slide.addText(truncate(metric.label, 22), {
      x,
      y: y + index * 0.24,
      w: 3.1,
      h: 0.13,
      fontSize: 6.6,
      fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
      color: STATIC_PRESENTATION_VISUAL_TOKENS.foregroundMuted,
      rtlMode: rtl,
      align: rtl ? 'right' : 'left',
      margin: 0,
      breakLine: false,
      fit: 'shrink',
    });
    slide.addShape('rect', {
      x: barX,
      y: y + 0.13 + index * 0.24,
      w: barWidth,
      h: 0.05,
      fill: { color: index % 2 ? STATIC_PRESENTATION_VISUAL_TOKENS.primary : STATIC_PRESENTATION_VISUAL_TOKENS.accent },
      line: { color: index % 2 ? STATIC_PRESENTATION_VISUAL_TOKENS.primary : STATIC_PRESENTATION_VISUAL_TOKENS.accent },
    });
  });
}

function buildNotes(slideData: PitchDeckSlide, lang: PitchDeckLanguage, source: 'ai' | 'rules') {
  const t = NOTES_TEXT[lang] ?? NOTES_TEXT.en;
  const keyBullets = slideData.content.bullets.slice(0, 3).join(' ');
  const voice = truncate(`${slideData.content.headline}. ${keyBullets || slideData.content.notes}`, 520);
  const missing = slideData.missingData.length ? slideData.missingData.map(item => item.label).join(', ') : t.noMissing;
  return [
    `${t.voice}:`,
    voice,
    '',
    `${t.animation}:`,
    t.animationPlan,
    '',
    `${t.missing}:`,
    missing,
    '',
    `${t.tips}:`,
    t.tip,
    '',
    `${t.source}: ${source === 'ai' ? t.aiDesigned : t.rulesDesigned}`,
    t.disclaimer,
  ].join('\n');
}

function addCoverSlide(pptx: pptxgen, deck: PitchDeckExportData, source: 'ai' | 'rules', totalSlides: number) {
  const slide = pptx.addSlide();
  const rtl = deck.language === 'ar';
  const firstSlide = deck.slides[0];
  slide.background = { color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground };
  slide.addShape('rect', { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground }, line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground } });
  slide.addShape('rect', { x: rtl ? 0 : 9.5, y: 0, w: 3.833, h: 7.5, fill: { color: STATIC_PRESENTATION_VISUAL_TOKENS.foregroundSecondary, transparency: 8 }, line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.foregroundSecondary } });
  slide.addShape('line', { x: rtl ? 1.1 : 0.85, y: 1.15, w: 2.8, h: 0, line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.primary, width: 2 } });
  slide.addText('THE SFM', {
    x: rtl ? 9.6 : 0.82,
    y: 0.6,
    w: 2.8,
    h: 0.3,
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    fontSize: 12,
    bold: true,
    color: STATIC_PRESENTATION_VISUAL_TOKENS.primarySoft,
    rtlMode: rtl,
    align: rtl ? 'right' : 'left',
    margin: 0,
    breakLine: false,
  } as any);
  slide.addText(truncate(deck.projectName, 64), {
    x: rtl ? 3.3 : 0.82,
    y: 2.05,
    w: 8.7,
    h: 1.0,
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    fontSize: 35,
    bold: true,
    color: STATIC_PRESENTATION_VISUAL_TOKENS.foregroundInverse,
    rtlMode: rtl,
    align: rtl ? 'right' : 'left',
    margin: 0,
    breakLine: false,
    fit: 'shrink',
  });
  slide.addText(truncate(firstSlide?.content.headline || deck.readinessLabel, 120), {
    x: rtl ? 4.0 : 0.85,
    y: 3.15,
    w: 7.95,
    h: 0.52,
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    fontSize: 16,
    color: STATIC_PRESENTATION_VISUAL_TOKENS.primarySoft,
    rtlMode: rtl,
    align: rtl ? 'right' : 'left',
    margin: 0,
    fit: 'shrink',
  });
  slide.addText(`${deck.readinessLabel} · ${deck.completionPercent}/100`, {
    x: rtl ? 8.4 : 0.85,
    y: 4.05,
    w: 3.5,
    h: 0.35,
    fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    fontSize: 13,
    bold: true,
    color: STATIC_PRESENTATION_VISUAL_TOKENS.primarySoft,
    rtlMode: rtl,
    align: rtl ? 'right' : 'left',
    margin: 0,
    breakLine: false,
  } as any);
  (firstSlide?.content.metrics ?? []).slice(0, 3).forEach((metric, index) => {
    const x = rtl ? 8.7 - index * 2.62 : 0.85 + index * 2.62;
    slide.addShape('roundRect', { x, y: 5.25, w: 2.32, h: 0.82, rectRadius: 0.08, fill: { color: STATIC_PRESENTATION_VISUAL_TOKENS.surface, transparency: 4 }, line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.primary, transparency: 35 } });
    slide.addText(truncate(metric.label, 20), { x: x + 0.14, y: 5.38, w: 2.04, h: 0.16, fontSize: 6.8, color: STATIC_PRESENTATION_VISUAL_TOKENS.foregroundMuted, fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi, rtlMode: rtl, align: rtl ? 'right' : 'left', margin: 0, fit: 'shrink' });
    slide.addText(truncate(metric.value, 18), { x: x + 0.14, y: 5.65, w: 2.04, h: 0.24, fontSize: 12, bold: true, color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground, fontFace: fontFaceForMetricValue(metric.value), rtlMode: rtl, align: rtl ? 'right' : 'left', margin: 0, fit: 'shrink' });
  });
  addBrandFooter(slide, 1, totalSlides, deck, true);
  slide.addNotes(buildNotes(firstSlide ?? deck.slides[0], deck.language, source));
}

function addContentSlide(pptx: pptxgen, deck: PitchDeckExportData, slideData: PitchDeckSlide, index: number, source: 'ai' | 'rules', totalSlides: number) {
  const slide = pptx.addSlide();
  const rtl = deck.language === 'ar';
  slide.background = { color: STATIC_PRESENTATION_VISUAL_TOKENS.background };
  addKicker(slide, slideData, deck.language, index);
  slide.addText(truncate(slideData.content.headline || slideData.title, 120), {
    x: rtl ? 4.15 : 0.82,
    y: 1.28,
    w: 8.35,
    h: 0.78,
    ...textOptions(deck.language, {
      fontSize: 25,
      bold: true,
      color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground,
    }),
  } as any);
  const bulletX = rtl ? 4.2 : 0.9;
  addBulletList(slide, slideData.content.bullets, deck.language, bulletX, 2.35, 4.8, 2.9);
  addMetricCards(slide, slideData.content.metrics, deck.language);
  addFinancialVisual(slide, slideData, deck.language);
  if (slideData.suggestions.length) {
    slide.addShape('roundRect', {
      x: rtl ? 0.85 : 5.25,
      y: 5.08,
      w: 3.35,
      h: 0.7,
      rectRadius: 0.08,
      fill: { color: STATIC_PRESENTATION_VISUAL_TOKENS.surface },
      line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.primary, transparency: 55 },
    });
    slide.addText(truncate(slideData.suggestions[0], 95), {
      x: rtl ? 1.05 : 5.45,
      y: 5.25,
      w: 2.95,
      h: 0.34,
      ...textOptions(deck.language, {
        fontSize: 8.2,
        bold: true,
        color: STATIC_PRESENTATION_VISUAL_TOKENS.foregroundMuted,
      }),
    } as any);
  }
  addMissingBox(slide, slideData, deck.language);
  addBrandFooter(slide, index, totalSlides, deck);
  slide.addNotes(buildNotes(slideData, deck.language, source));
}

function addReviewSlide(pptx: pptxgen, deck: PitchDeckExportData, source: 'ai' | 'rules', index: number, totalSlides: number) {
  const slide = pptx.addSlide();
  const rtl = deck.language === 'ar';
  const t = PPT_TEXT[deck.language] ?? PPT_TEXT.en;
  const notes = NOTES_TEXT[deck.language] ?? NOTES_TEXT.en;

  slide.background = { color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground };
  slide.addShape('rect', { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground }, line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground } });
  slide.addShape('rect', { x: rtl ? 0 : 8.8, y: 0, w: 4.533, h: 7.5, fill: { color: STATIC_PRESENTATION_VISUAL_TOKENS.foregroundSecondary, transparency: 10 }, line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.foregroundSecondary } });
  slide.addText(t.reviewTitle, {
    x: rtl ? 3.6 : 0.82,
    y: 1.1,
    w: 8.9,
    h: 0.7,
    ...textOptions(deck.language, {
      fontSize: 30,
      bold: true,
      color: STATIC_PRESENTATION_VISUAL_TOKENS.foregroundInverse,
    }),
  } as any);
  slide.addText(t.reviewBody, {
    x: rtl ? 3.9 : 0.86,
    y: 2.05,
    w: 8.5,
    h: 0.72,
    ...textOptions(deck.language, {
      fontSize: 15,
      color: STATIC_PRESENTATION_VISUAL_TOKENS.primarySoft,
    }),
  } as any);

  const cards = [
    { label: t.readiness, value: `${deck.completionPercent}/100` },
    { label: t.source, value: source === 'ai' ? notes.aiDesigned : notes.rulesDesigned },
    { label: t.nextSteps, value: t.nextStepsBody },
  ];
  cards.forEach((card, cardIndex) => {
    const x = rtl ? 8.55 - cardIndex * 3.05 : 0.86 + cardIndex * 3.05;
    slide.addShape('roundRect', {
      x,
      y: 3.45,
      w: 2.75,
      h: 1.45,
      rectRadius: 0.08,
      fill: { color: STATIC_PRESENTATION_VISUAL_TOKENS.surface, transparency: 5 },
      line: { color: STATIC_PRESENTATION_VISUAL_TOKENS.primary, transparency: 35 },
    });
    slide.addText(card.label, {
      x: x + 0.16,
      y: 3.72,
      w: 2.42,
      h: 0.22,
      ...textOptions(deck.language, {
        fontSize: 8.8,
        bold: true,
        color: STATIC_PRESENTATION_VISUAL_TOKENS.primary,
      }),
    } as any);
    slide.addText(truncate(card.value, cardIndex === 2 ? 92 : 30), {
      x: x + 0.16,
      y: 4.08,
      w: 2.42,
      h: 0.42,
      ...textOptions(deck.language, {
        fontSize: cardIndex === 2 ? 9.2 : 15,
        fontFace: cardIndex === 0
          ? STATIC_PRESENTATION_VISUAL_TOKENS.fontData
          : STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
        bold: true,
        color: STATIC_PRESENTATION_VISUAL_TOKENS.foreground,
      }),
    } as any);
  });

  slide.addText(notes.disclaimer, {
    x: rtl ? 2.1 : 0.9,
    y: 5.62,
    w: 10.35,
    h: 0.45,
    ...textOptions(deck.language, {
      fontSize: 9.5,
      color: STATIC_PRESENTATION_VISUAL_TOKENS.borderStrong,
    }),
  } as any);

  addBrandFooter(slide, index, totalSlides, deck, true);
  slide.addNotes([t.reviewTitle, t.reviewBody, '', t.nextSteps, t.nextStepsBody, '', notes.disclaimer].join('\n'));
}

export async function buildPitchDeckPowerPoint(deck: PitchDeckExportData, source: 'ai' | 'rules') {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'THE SFM';
  pptx.company = 'THE SFM';
  pptx.subject = 'Project pitch deck';
  pptx.title = `${deck.projectName} Pitch Deck`;
  (pptx as any).lang = deck.language === 'ar' ? 'ar-KW-u-nu-latn' : deck.language === 'fr' ? 'fr-FR' : 'en-US';
  pptx.rtlMode = deck.language === 'ar';
  (pptx as any).theme = {
    headFontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    bodyFontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
    lang: (pptx as any).lang,
  };
  const contentSlides = deck.slides.slice(1, 12);
  const totalSlides = 1 + contentSlides.length + 1;
  addCoverSlide(pptx, deck, source, totalSlides);
  contentSlides.forEach((slideData, index) => addContentSlide(pptx, deck, slideData, index + 2, source, totalSlides));
  addReviewSlide(pptx, deck, source, contentSlides.length + 2, totalSlides);
  const output = await pptx.write({ outputType: 'nodebuffer', compression: true });
  if (Buffer.isBuffer(output)) return output;
  if (output instanceof Uint8Array) return Buffer.from(output);
  if (output instanceof ArrayBuffer) return Buffer.from(output);
  return Buffer.from(String(output));
}
