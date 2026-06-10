'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Edit3, FileText, Loader2, Presentation, Save, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Lang = 'ar' | 'en' | 'fr';
type SlideStatus = 'complete' | 'needs_data' | 'not_ready';
type TabTarget = 'overview' | 'feasibility' | 'financial' | 'tasks' | 'kpis';

type PitchSlide = {
  id: string;
  title: string;
  status: SlideStatus;
  content: {
    headline: string;
    bullets: string[];
    metrics: Array<{ label: string; value: string }>;
    notes: string;
  };
  missingData: Array<{ label: string; tab: TabTarget }>;
  suggestions: string[];
};

type PitchDeck = {
  projectName: string;
  language: Lang;
  completionPercent: number;
  readinessLabel: string;
  slides: PitchSlide[];
  generatedAt: string;
};

type Props = {
  projectId: string;
  lang: Lang;
  onNavigateTab: (tab: TabTarget) => void;
};

const TEXT = {
  ar: {
    pitchDeck: 'العرض الاستثماري',
    description: 'أنشئ عرضا استثماريا منظما من بيانات مشروعك الحقيقية فقط.',
    generate: 'إنشاء العرض الاستثماري',
    improveSlide: 'تحسين الشريحة',
    editSlide: 'تعديل الشريحة',
    saveChanges: 'حفظ التعديلات',
    cancel: 'إلغاء',
    printPdf: 'تصدير PDF',
    exportPowerPoint: 'تصدير PowerPoint احترافي',
    preparingSlides: 'جاري تجهيز الشرائح...',
    designingLayout: 'جاري تصميم العرض...',
    generatingNotes: 'جاري إنشاء الملاحظات...',
    exportingPowerPoint: 'جاري تصدير PowerPoint...',
    exportSuccess: 'تم تصدير العرض بنجاح.',
    exportFailed: 'تعذر تصدير العرض. حاول مرة أخرى.',
    slides: 'الشرائح',
    slidePreview: 'معاينة الشريحة',
    missingData: 'البيانات الناقصة',
    suggestedImprovements: 'تحسينات مقترحة',
    readiness: 'جاهزية العرض الاستثماري',
    sourceAi: 'مصدر المحتوى: الذكاء الاصطناعي',
    sourceRules: 'مصدر المحتوى: قواعد تحليلية',
    complete: 'مكتملة',
    needs_data: 'تحتاج بيانات',
    not_ready: 'غير جاهزة',
    headline: 'العنوان الرئيسي',
    bullets: 'النقاط',
    notes: 'الملاحظات',
    metrics: 'المؤشرات',
    noMetrics: 'لا توجد مؤشرات كافية لهذه الشريحة.',
    noMissing: 'لا توجد بيانات ناقصة لهذه الشريحة.',
    noSuggestions: 'لا توجد تحسينات إضافية حالياً.',
    openTab: 'فتح التبويب',
    loading: 'جاري إنشاء العرض...',
    improving: 'جاري تحسين الشريحة...',
    saving: 'جاري الحفظ...',
    saved: 'تم حفظ التعديلات.',
    error: 'تعذر إنشاء العرض حالياً.',
    empty: 'اضغط إنشاء العرض الاستثماري لبدء المعاينة.',
    disclaimer: 'هذا العرض تم إنشاؤه لأغراض التخطيط والعرض الأولي فقط. يجب مراجعة الأرقام والمعلومات قبل مشاركته مع المستثمرين أو الجهات الرسمية.',
    overview: 'نظرة عامة',
    feasibility: 'دراسة الجدوى',
    financial: 'النموذج المالي',
    tasks: 'المهام',
    kpis: 'المؤشرات',
  },
  en: {
    pitchDeck: 'Pitch Deck',
    description: 'Generate a structured investor deck using only your real project data.',
    generate: 'Generate Pitch Deck',
    improveSlide: 'Improve Slide',
    editSlide: 'Edit Slide',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    printPdf: 'Export PDF',
    exportPowerPoint: 'Export Professional PowerPoint',
    preparingSlides: 'Preparing slides...',
    designingLayout: 'Designing layout...',
    generatingNotes: 'Generating notes...',
    exportingPowerPoint: 'Exporting PowerPoint...',
    exportSuccess: 'PowerPoint exported successfully.',
    exportFailed: 'Could not export the deck. Please try again.',
    slides: 'Slides',
    slidePreview: 'Slide Preview',
    missingData: 'Missing Data',
    suggestedImprovements: 'Suggested Improvements',
    readiness: 'Pitch Deck Readiness',
    sourceAi: 'Content source: AI',
    sourceRules: 'Content source: Rules',
    complete: 'Complete',
    needs_data: 'Needs data',
    not_ready: 'Not ready',
    headline: 'Headline',
    bullets: 'Bullets',
    notes: 'Notes',
    metrics: 'Metrics',
    noMetrics: 'Not enough metrics for this slide.',
    noMissing: 'No missing data for this slide.',
    noSuggestions: 'No additional improvements right now.',
    openTab: 'Open tab',
    loading: 'Generating deck...',
    improving: 'Improving slide...',
    saving: 'Saving...',
    saved: 'Changes saved.',
    error: 'Could not generate the deck right now.',
    empty: 'Click Generate Pitch Deck to start the preview.',
    disclaimer: 'This pitch deck is generated for planning and preliminary presentation purposes only. Review all numbers and information before sharing with investors or official entities.',
    overview: 'Overview',
    feasibility: 'Feasibility',
    financial: 'Financial Model',
    tasks: 'Tasks',
    kpis: 'KPIs',
  },
  fr: {
    pitchDeck: 'Pitch Deck',
    description: 'Générez un pitch deck structuré avec les données réelles de votre projet uniquement.',
    generate: 'Générer le pitch deck',
    improveSlide: 'Améliorer la diapositive',
    editSlide: 'Modifier la diapositive',
    saveChanges: 'Enregistrer les modifications',
    cancel: 'Annuler',
    printPdf: 'Exporter PDF',
    exportPowerPoint: 'Exporter PowerPoint professionnel',
    preparingSlides: 'Préparation des diapositives...',
    designingLayout: 'Conception de la mise en page...',
    generatingNotes: 'Génération des notes...',
    exportingPowerPoint: 'Export PowerPoint en cours...',
    exportSuccess: 'PowerPoint exporté avec succès.',
    exportFailed: 'Impossible d’exporter le deck. Réessayez.',
    slides: 'Diapositives',
    slidePreview: 'Aperçu de la diapositive',
    missingData: 'Données manquantes',
    suggestedImprovements: 'Améliorations suggérées',
    readiness: 'Préparation du pitch deck',
    sourceAi: 'Source du contenu : IA',
    sourceRules: 'Source du contenu : Règles',
    complete: 'Complète',
    needs_data: 'Données nécessaires',
    not_ready: 'Non prête',
    headline: 'Titre principal',
    bullets: 'Points clés',
    notes: 'Notes',
    metrics: 'Indicateurs',
    noMetrics: 'Pas assez d’indicateurs pour cette diapositive.',
    noMissing: 'Aucune donnée manquante pour cette diapositive.',
    noSuggestions: 'Aucune amélioration supplémentaire pour le moment.',
    openTab: 'Ouvrir l’onglet',
    loading: 'Génération du pitch deck...',
    improving: 'Amélioration de la diapositive...',
    saving: 'Enregistrement...',
    saved: 'Modifications enregistrées.',
    error: 'Impossible de générer le pitch deck pour le moment.',
    empty: 'Cliquez sur Générer le pitch deck pour démarrer l’aperçu.',
    disclaimer: 'Ce pitch deck est généré à des fins de planification et de présentation préliminaire uniquement. Vérifiez tous les chiffres et informations avant de le partager avec des investisseurs ou des organismes officiels.',
    overview: 'Vue d’ensemble',
    feasibility: 'Faisabilité',
    financial: 'Modèle financier',
    tasks: 'Tâches',
    kpis: 'KPI',
  },
} as const;

export function ProjectPitchDeckTab({ projectId, lang, onNavigateTab }: Props) {
  const t = TEXT[lang] ?? TEXT.en;
  const [deck, setDeck] = useState<PitchDeck | null>(null);
  const [source, setSource] = useState<'ai' | 'rules'>('rules');
  const [selectedSlideId, setSelectedSlideId] = useState('');
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStep, setExportStep] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState('');
  const [bullets, setBullets] = useState('');
  const [notes, setNotes] = useState('');

  const selectedSlide = useMemo(() => {
    if (!deck) return null;
    return deck.slides.find(slide => slide.id === selectedSlideId) ?? deck.slides[0] ?? null;
  }, [deck, selectedSlideId]);

  const sourceLabel = source === 'ai' ? t.sourceAi : t.sourceRules;

  const callDeckApi = useCallback(async (mode: 'generate' | 'improve_slide' | 'report_missing_data', slideId?: string) => {
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data.session?.access_token;
    if (!token) throw new Error('Unauthorized');
    const response = await fetch(`/api/projects/${projectId}/pitch-deck`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mode, slideId, language: lang }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) throw new Error(data?.error || 'Pitch deck failed');
    return data as { source: 'ai' | 'rules'; message?: string; deck: PitchDeck };
  }, [lang, projectId]);

  const generateDeck = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await callDeckApi('generate');
      setDeck(result.deck);
      setSource(result.source);
      setSelectedSlideId(result.deck.slides[0]?.id ?? '');
      setMessage(result.message ?? '');
    } catch {
      setMessage(t.error);
    } finally {
      setLoading(false);
    }
  }, [callDeckApi, t.error]);

  useEffect(() => {
    void generateDeck();
  }, [generateDeck]);

  const beginEdit = () => {
    if (!selectedSlide) return;
    setHeadline(selectedSlide.content.headline);
    setBullets(selectedSlide.content.bullets.join('\n'));
    setNotes(selectedSlide.content.notes);
    setEditing(true);
  };

  const updatedDeckWithSlide = () => {
    if (!deck || !selectedSlide) return null;
    return {
      ...deck,
      slides: deck.slides.map(slide => slide.id === selectedSlide.id ? {
        ...slide,
        content: {
          ...slide.content,
          headline,
          bullets: bullets.split('\n').map(item => item.trim()).filter(Boolean),
          notes,
        },
      } : slide),
    };
  };

  const saveEdits = async () => {
    const nextDeck = updatedDeckWithSlide();
    if (!nextDeck) return;
    setSaving(true);
    setMessage('');
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data.session;
      const userId = session?.user.id;
      if (!userId) throw new Error('Unauthorized');
      const { error } = await supabase.from('project_pitch_decks').upsert({
        user_id: userId,
        project_id: projectId,
        language: lang,
        deck_data: nextDeck,
        readiness_score: nextDeck.completionPercent,
        source,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,project_id,language' });
      if (error) throw error;
      setDeck(nextDeck);
      setEditing(false);
      setMessage(t.saved);
    } catch {
      setMessage(t.error);
    } finally {
      setSaving(false);
    }
  };

  const improveSlide = async () => {
    if (!selectedSlide) return;
    setImproving(true);
    setMessage('');
    try {
      const result = await callDeckApi('improve_slide', selectedSlide.id);
      setDeck(result.deck);
      setSource(result.source);
      setSelectedSlideId(selectedSlide.id);
      setEditing(false);
      setMessage(result.message ?? '');
    } catch {
      setMessage(t.error);
    } finally {
      setImproving(false);
    }
  };

  const printDeck = () => {
    window.print();
  };

  const filenameFromDisposition = (disposition: string | null) => {
    if (!disposition) return `project-pitch-deck-${projectId}.pptx`;
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1].replace(/"/g, ''));
    const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (plainMatch?.[1]) return decodeURIComponent(plainMatch[1].replace(/"/g, ''));
    return `project-pitch-deck-${projectId}.pptx`;
  };

  const exportPowerPoint = async () => {
    if (!deck) return;
    setExporting(true);
    setMessage('');
    try {
      setExportStep(t.preparingSlides);
      if (editing) {
        await saveEdits();
      }

      setExportStep(t.designingLayout);
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      if (!token) throw new Error('Unauthorized');

      setExportStep(t.generatingNotes);
      const response = await fetch(`/api/projects/${projectId}/pitch-deck/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ language: lang }),
      });
      if (!response.ok) throw new Error('PowerPoint export failed');

      setExportStep(t.exportingPowerPoint);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filenameFromDisposition(response.headers.get('content-disposition'));
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage(t.exportSuccess);
    } catch {
      setMessage(t.exportFailed);
    } finally {
      setExporting(false);
      setExportStep('');
    }
  };

  return (
    <section className="project-pitch-deck" dir={lang === 'ar' ? 'rtl' : 'ltr'} aria-label={t.pitchDeck}>
      <article className="pitch-hero">
        <div>
          <span>{t.pitchDeck}</span>
          <h2>{t.readiness}</h2>
          <p>{deck ? deck.readinessLabel : t.description}</p>
        </div>
        <div className="readiness-ring" style={{ '--score-angle': `${(deck?.completionPercent ?? 0) * 3.6}deg` } as React.CSSProperties}>
          <strong>{deck?.completionPercent ?? 0}</strong>
          <span>/100</span>
        </div>
        <div className="pitch-source">
          <span>{sourceLabel}</span>
        </div>
      </article>

      <div className="pitch-actions">
        <button type="button" onClick={generateDeck} disabled={loading} aria-label={t.generate}>
          {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
          {loading ? t.loading : t.generate}
        </button>
        <button type="button" onClick={improveSlide} disabled={improving || !selectedSlide} aria-label={t.improveSlide}>
          {improving ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
          {improving ? t.improving : t.improveSlide}
        </button>
        <button type="button" onClick={printDeck} disabled={!deck} aria-label={t.printPdf}>
          <Download size={16} />
          {t.printPdf}
        </button>
        <button type="button" onClick={exportPowerPoint} disabled={!deck || exporting} aria-label={t.exportPowerPoint}>
          {exporting ? <Loader2 size={16} className="spin" /> : <Presentation size={16} />}
          {exporting ? exportStep || t.exportingPowerPoint : t.exportPowerPoint}
        </button>
      </div>

      {message ? <div className="pitch-message" role="status">{message}</div> : null}

      {!deck || !selectedSlide ? (
        <article className="pitch-empty">
          <Presentation size={34} />
          <p>{loading ? t.loading : t.empty}</p>
        </article>
      ) : (
        <div className="pitch-layout">
          <aside className="slide-list" aria-label={t.slides}>
            <h3>{t.slides}</h3>
            {deck.slides.map((slide, index) => (
              <button
                type="button"
                key={slide.id}
                className={slide.id === selectedSlide.id ? 'active' : ''}
                onClick={() => {
                  setSelectedSlideId(slide.id);
                  setEditing(false);
                }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{slide.title}</strong>
                <small className={slide.status}>{t[slide.status]}</small>
              </button>
            ))}
          </aside>

          <main className="slide-stage" aria-label={t.slidePreview}>
            <div className="stage-heading">
              <h3>{t.slidePreview}</h3>
              <button type="button" onClick={beginEdit} aria-label={t.editSlide}>
                <Edit3 size={16} />
                {t.editSlide}
              </button>
            </div>

            <article className="pitch-slide-preview">
              <header>
                <span>{selectedSlide.title}</span>
                <small>{selectedSlide.status === 'complete' ? t.complete : selectedSlide.status === 'needs_data' ? t.needs_data : t.not_ready}</small>
              </header>
              <section className="slide-body">
                <h2>{selectedSlide.content.headline}</h2>
                <div className="slide-content-grid">
                  <div>
                    <ul>
                      {selectedSlide.content.bullets.length ? selectedSlide.content.bullets.map((bullet, index) => <li key={`${bullet}-${index}`}>{bullet}</li>) : <li>{t.noMissing}</li>}
                    </ul>
                  </div>
                  <div className="metric-stack">
                    {selectedSlide.content.metrics.length ? selectedSlide.content.metrics.map(metric => (
                      <div className="slide-metric" key={`${metric.label}-${metric.value}`}>
                        <small>{metric.label}</small>
                        <strong>{metric.value}</strong>
                      </div>
                    )) : <p>{t.noMetrics}</p>}
                  </div>
                </div>
              </section>
              <footer>THE SFM · {deck.projectName}</footer>
            </article>

            {editing ? (
              <article className="edit-panel">
                <label htmlFor="pitch-headline">{t.headline}</label>
                <input id="pitch-headline" value={headline} onChange={event => setHeadline(event.target.value)} />
                <label htmlFor="pitch-bullets">{t.bullets}</label>
                <textarea id="pitch-bullets" rows={5} value={bullets} onChange={event => setBullets(event.target.value)} />
                <label htmlFor="pitch-notes">{t.notes}</label>
                <textarea id="pitch-notes" rows={3} value={notes} onChange={event => setNotes(event.target.value)} />
                <div className="edit-actions">
                  <button type="button" onClick={() => setEditing(false)}>{t.cancel}</button>
                  <button type="button" className="primary" onClick={saveEdits} disabled={saving}>
                    {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    {saving ? t.saving : t.saveChanges}
                  </button>
                </div>
              </article>
            ) : null}
          </main>

          <aside className="slide-insights">
            <InsightCard title={t.missingData} empty={t.noMissing}>
              {selectedSlide.missingData.map(item => (
                <div className="insight-item" key={`${item.label}-${item.tab}`}>
                  <span>{item.label}</span>
                  <button type="button" onClick={() => onNavigateTab(item.tab)} aria-label={`${t.openTab}: ${t[item.tab]}`}>
                    {t[item.tab]}
                  </button>
                </div>
              ))}
            </InsightCard>
            <InsightCard title={t.suggestedImprovements} empty={t.noSuggestions}>
              {selectedSlide.suggestions.map(item => <p className="suggestion" key={item}>{item}</p>)}
            </InsightCard>
            <InsightCard title={t.notes} empty={t.noSuggestions}>
              <p className="suggestion">{selectedSlide.content.notes}</p>
            </InsightCard>
          </aside>
        </div>
      )}

      {deck ? (
        <div className="print-deck">
          {deck.slides.map((slide, index) => (
            <section className="print-slide" key={`print-${slide.id}`}>
              <header><span>{String(index + 1).padStart(2, '0')}</span><strong>{slide.title}</strong></header>
              <h2>{slide.content.headline}</h2>
              <ul>{slide.content.bullets.map((bullet, itemIndex) => <li key={`${slide.id}-${itemIndex}`}>{bullet}</li>)}</ul>
              <div className="print-metrics">{slide.content.metrics.map(metric => <div key={`${metric.label}-${metric.value}`}><small>{metric.label}</small><b>{metric.value}</b></div>)}</div>
              {slide.missingData.length ? <p className="print-missing">{slide.missingData.map(item => item.label).join(' · ')}</p> : null}
              <footer>THE SFM · {deck.projectName}</footer>
            </section>
          ))}
          <section className="print-slide">
            <header><strong>THE SFM</strong></header>
            <h2>{t.disclaimer}</h2>
          </section>
        </div>
      ) : null}

      <article className="pitch-disclaimer">
        <FileText size={18} />
        <p>{t.disclaimer}</p>
      </article>

      <style jsx>{`
        .project-pitch-deck{display:grid;gap:16px;min-width:0}.pitch-hero,.pitch-empty,.pitch-disclaimer,.slide-list,.slide-stage,.slide-insights,.edit-panel{background:var(--sfm-card);border:1px solid rgba(29,140,255,.16);border-radius:20px;box-shadow:0 14px 34px rgba(3,18,37,.07);min-width:0}.pitch-hero{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:18px;align-items:center;padding:20px;background:radial-gradient(circle at 12% 10%,rgba(167,243,240,.28),transparent 30%),linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 140%);color:var(--sfm-card)}.pitch-hero span,.pitch-source span{color:var(--sfm-soft-cyan);font-weight:950;font-size:12px}.pitch-hero h2{margin:6px 0;color:var(--sfm-card);font-size:28px}.pitch-hero p{margin:0;color:rgba(234,246,255,.78);line-height:1.7}.readiness-ring{width:104px;height:104px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--sfm-soft-cyan) var(--score-angle,0deg),rgba(234,246,255,.16) 0);box-shadow:inset 0 0 0 11px rgba(3,18,37,.92)}.readiness-ring strong{font-size:28px;color:var(--sfm-card)}.readiness-ring span{margin-top:-20px}.pitch-source{border:1px solid rgba(167,243,240,.2);background:rgba(234,246,255,.08);border-radius:999px;padding:9px 12px}.pitch-actions{display:flex;gap:10px;flex-wrap:wrap}.pitch-actions button,.stage-heading button,.edit-actions button,.insight-item button{min-height:42px;border-radius:13px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-midnight);padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:950;cursor:pointer}.pitch-actions button:first-child,.edit-actions .primary{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;border:0}.pitch-actions button.disabled{background:var(--sfm-light-card);color:var(--sfm-muted);cursor:not-allowed}.pitch-actions button.disabled span{border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:3px 7px;font-size:11px}.pitch-actions button:disabled{opacity:.7;cursor:not-allowed}.pitch-message{border:1px solid rgba(29,140,255,.2);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:15px;padding:12px;font-weight:900}.pitch-empty{min-height:260px;display:grid;place-items:center;text-align:center;color:var(--sfm-muted);padding:22px}.pitch-empty svg{color:var(--sfm-primary)}.pitch-layout{display:grid;grid-template-columns:minmax(220px,.55fr) minmax(0,1.5fr) minmax(270px,.75fr);gap:16px;align-items:start}.slide-list,.slide-stage,.slide-insights,.edit-panel{padding:16px}.slide-list{display:grid;gap:9px;position:sticky;top:14px}.slide-list h3,.stage-heading h3{margin:0;color:var(--sfm-midnight)}.slide-list button{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:10px;text-align:start;display:grid;gap:4px;font-family:inherit;cursor:pointer}.slide-list button.active{background:var(--sfm-midnight);color:var(--sfm-soft-cyan)}.slide-list button span{font-size:11px;color:var(--sfm-primary);font-weight:950}.slide-list button strong{font-size:14px}.slide-list button small{width:max-content;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:950}.slide-list button small.complete{background:#ECFDF5;color:#047857}.slide-list button small.needs_data{background:#FFF7ED;color:#B45309}.slide-list button small.not_ready{background:#FEF2F2;color:#B91C1C}.slide-stage{display:grid;gap:14px}.stage-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.pitch-slide-preview{aspect-ratio:16/9;border-radius:22px;overflow:hidden;background:var(--sfm-background);border:1px solid rgba(3,18,37,.16);box-shadow:0 18px 36px rgba(3,18,37,.1);display:grid;grid-template-rows:auto minmax(0,1fr) auto;min-width:0}.pitch-slide-preview header{background:linear-gradient(135deg,var(--sfm-primary-dark),var(--sfm-midnight));color:var(--sfm-card);padding:18px 22px;display:flex;justify-content:space-between;align-items:center;gap:12px}.pitch-slide-preview header span{color:var(--sfm-soft-cyan);font-weight:950}.pitch-slide-preview header small{border-radius:999px;background:rgba(234,246,255,.12);padding:5px 9px}.slide-body{padding:24px;min-width:0}.slide-body h2{margin:0 0 18px;color:var(--sfm-primary-dark);font-size:clamp(24px,3vw,38px);line-height:1.15}.slide-content-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(190px,.65fr);gap:18px;align-items:start}.slide-body ul{margin:0;padding-inline-start:22px;color:var(--sfm-midnight);line-height:1.8;font-weight:900}.metric-stack{display:grid;gap:10px}.slide-metric{border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);border-radius:16px;padding:12px}.slide-metric small{display:block;color:var(--sfm-muted);font-weight:900}.slide-metric strong{display:block;margin-top:6px;color:var(--sfm-primary-dark);font-size:18px}.metric-stack p{margin:0;color:var(--sfm-muted);line-height:1.6}.pitch-slide-preview footer{padding:10px 22px;background:var(--sfm-card);color:var(--sfm-muted);font-size:12px;font-weight:900}.edit-panel{display:grid;gap:9px}.edit-panel label{font-weight:900;color:var(--sfm-muted)}.edit-panel input,.edit-panel textarea{width:100%;min-width:0;border:1px solid rgba(29,140,255,.2);background:var(--sfm-card);color:var(--sfm-foreground);border-radius:13px;padding:11px 12px;font-family:inherit;font-weight:800;line-height:1.6;outline:none}.edit-panel input:focus,.edit-panel textarea:focus,.pitch-actions button:focus-visible,.stage-heading button:focus-visible,.edit-actions button:focus-visible,.slide-list button:focus-visible,.insight-item button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.16);border-color:var(--sfm-accent)}.edit-actions{display:flex;justify-content:flex-end;gap:10px}.slide-insights{display:grid;gap:14px;position:sticky;top:14px}.insight-card{display:grid;gap:9px}.insight-card h3{margin:0;color:var(--sfm-midnight);font-size:16px}.insight-item{display:grid;gap:8px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:10px}.insight-item span,.suggestion{color:var(--sfm-muted);line-height:1.6;font-weight:900}.insight-item button{min-height:34px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);width:max-content}.pitch-disclaimer{display:flex;gap:10px;align-items:flex-start;padding:14px;background:var(--sfm-light-card);color:var(--sfm-muted);font-weight:900;line-height:1.7}.pitch-disclaimer svg{color:var(--sfm-primary);flex:0 0 auto}.pitch-disclaimer p{margin:0}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.print-deck{display:none}@media(max-width:1180px){.pitch-layout{grid-template-columns:1fr}.slide-list,.slide-insights{position:static}.slide-list{grid-template-columns:repeat(2,minmax(0,1fr))}.slide-list h3{grid-column:1 / -1}}@media(max-width:760px){.pitch-hero{grid-template-columns:1fr}.readiness-ring{width:92px;height:92px}.pitch-actions{display:grid}.pitch-actions button{width:100%}.slide-list{display:flex;overflow-x:auto}.slide-list h3{display:none}.slide-list button{min-width:190px}.slide-content-grid{grid-template-columns:1fr}.pitch-slide-preview{aspect-ratio:auto;min-height:420px}.stage-heading,.edit-actions{display:grid}.stage-heading button,.edit-actions button{width:100%}.slide-body{padding:18px}.pitch-slide-preview header{padding:14px 16px}}@media print{body *{visibility:hidden!important}.project-pitch-deck,.project-pitch-deck *{visibility:hidden!important}.print-deck,.print-deck *{visibility:visible!important}.print-deck{display:block!important;position:absolute;inset:0;background:var(--sfm-background)}.print-slide{page-break-after:always;width:100vw;min-height:100vh;padding:42px;background:var(--sfm-background);color:var(--sfm-primary-dark);display:block}.print-slide header{background:var(--sfm-primary-dark);color:var(--sfm-soft-cyan);padding:18px 24px;border-radius:18px;display:flex;gap:18px;align-items:center}.print-slide h2{font-size:34px;line-height:1.2;margin:28px 0 18px}.print-slide li{font-size:20px;line-height:1.7;margin-bottom:8px}.print-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:22px}.print-metrics div{background:var(--sfm-card);border:1px solid rgba(29,140,255,.2);border-radius:16px;padding:14px}.print-metrics small{display:block;color:var(--sfm-muted)}.print-metrics b{display:block;color:var(--sfm-primary-dark);font-size:24px;margin-top:6px}.print-missing{background:#FFF7ED;border-radius:14px;padding:12px;color:#B45309}.print-slide footer{position:absolute;bottom:30px;color:var(--sfm-muted);font-weight:900}}
      `}</style>
    </section>
  );
}

function InsightCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="insight-card">
      <h3>{title}</h3>
      {hasChildren ? children : <p className="suggestion">{empty}</p>}
    </section>
  );
}
