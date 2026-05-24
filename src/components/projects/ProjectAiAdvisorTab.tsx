'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, FileText, Loader2, MessageSquareText, Send, Sparkles, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Lang = 'ar' | 'en' | 'fr';
type AdvisorMode = 'summary' | 'risks' | 'actions' | 'plan90' | 'report' | 'chat';
type AdvisorStatus = 'strong' | 'needs_review' | 'high_risk' | 'incomplete';
type RiskLevel = 'low' | 'medium' | 'high';
type Priority = 'low' | 'medium' | 'high';
type PlanPeriod = 'days_1_30' | 'days_31_60' | 'days_61_90';
type TabTarget = 'overview' | 'feasibility' | 'financial' | 'tasks' | 'documents' | 'kpis';

type AdvisorResponse = {
  success: true;
  source: 'ai' | 'rules';
  message?: string;
  summary: {
    status: AdvisorStatus;
    headline: string;
    explanation: string;
  };
  risks: Array<{
    level: RiskLevel;
    title: string;
    reason: string;
    suggestedAction: string;
  }>;
  nextActions: Array<{
    priority: Priority;
    title: string;
    description: string;
    estimatedImpact: string;
  }>;
  plan90: Array<{
    period: PlanPeriod;
    actions: string[];
  }>;
  missingData: Array<{
    field: string;
    whyItMatters: string;
    tab?: TabTarget;
  }>;
  disclaimer: string;
  chatAnswer?: {
    answer: string;
    assumptions: string[];
    suggestedActions: string[];
    disclaimer: string;
  };
};

type Props = {
  projectId: string;
  lang: Lang;
  onNavigateTab: (tab: TabTarget) => void;
};

const TEXT = {
  ar: {
    aiAdvisor: 'مستشار AI',
    aiProjectStatus: 'حالة المشروع حسب الذكاء الاصطناعي',
    sourceAi: 'مصدر التحليل: الذكاء الاصطناعي',
    sourceRules: 'مصدر التحليل: قواعد تحليلية',
    riskWarnings: 'تنبيهات المخاطر',
    nextBestActions: 'أفضل الخطوات القادمة',
    plan90: 'خطة 90 يوم',
    missingData: 'البيانات الناقصة',
    askTitle: 'اسأل الذكاء الاصطناعي عن هذا المشروع',
    askLabel: 'اسأل عن هذا المشروع',
    askPlaceholder: 'مثال: هل رأس المال مناسب لهذا المشروع؟',
    askButton: 'إرسال السؤال',
    generateReport: 'إنشاء تقرير المشروع',
    reportPreview: 'معاينة تقرير المشروع',
    exportPdfSoon: 'تصدير PDF قريباً',
    refresh: 'تحديث التحليل',
    loading: 'جاري تحليل بيانات المشروع...',
    reportLoading: 'جاري إنشاء التقرير...',
    chatLoading: 'جاري تجهيز الإجابة...',
    error: 'تعذر تحميل تحليل المشروع حالياً.',
    noRisks: 'لا توجد تنبيهات مخاطر واضحة من البيانات المتاحة.',
    noActions: 'لا توجد إجراءات مقترحة إضافية حالياً.',
    noMissing: 'لا توجد بيانات ناقصة واضحة حالياً.',
    openTab: 'فتح التبويب',
    assumptions: 'الافتراضات',
    suggestedActions: 'إجراءات مقترحة',
    disclaimerTitle: 'تنبيه مهم',
    low: 'منخفض',
    medium: 'متوسط',
    high: 'مرتفع',
    strong: 'قوي',
    needs_review: 'يحتاج مراجعة',
    high_risk: 'عالي المخاطر',
    incomplete: 'غير مكتمل',
    days_1_30: 'أول 30 يوم',
    days_31_60: 'من 31 إلى 60 يوم',
    days_61_90: 'من 61 إلى 90 يوم',
    overview: 'نظرة عامة',
    feasibility: 'دراسة الجدوى',
    financial: 'النموذج المالي',
    tasks: 'المهام',
    documents: 'المستندات',
    kpis: 'المؤشرات',
  },
  en: {
    aiAdvisor: 'AI Advisor',
    aiProjectStatus: 'AI Project Status',
    sourceAi: 'Source: AI',
    sourceRules: 'Source: Rules',
    riskWarnings: 'Risk Warnings',
    nextBestActions: 'Next Best Actions',
    plan90: '90-Day Action Plan',
    missingData: 'Missing Data',
    askTitle: 'Ask AI about this project',
    askLabel: 'Ask about this project',
    askPlaceholder: 'Example: Is the capital suitable for this project?',
    askButton: 'Send Question',
    generateReport: 'Generate Project Report',
    reportPreview: 'Project Report Preview',
    exportPdfSoon: 'PDF export coming soon',
    refresh: 'Refresh analysis',
    loading: 'Analyzing project data...',
    reportLoading: 'Generating report...',
    chatLoading: 'Preparing answer...',
    error: 'Could not load project analysis right now.',
    noRisks: 'No clear risk warnings from the available data.',
    noActions: 'No additional recommended actions right now.',
    noMissing: 'No obvious missing data right now.',
    openTab: 'Open tab',
    assumptions: 'Assumptions',
    suggestedActions: 'Suggested actions',
    disclaimerTitle: 'Important note',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    strong: 'Strong',
    needs_review: 'Needs Review',
    high_risk: 'High Risk',
    incomplete: 'Incomplete',
    days_1_30: 'First 30 days',
    days_31_60: 'Days 31-60',
    days_61_90: 'Days 61-90',
    overview: 'Overview',
    feasibility: 'Feasibility',
    financial: 'Financial Model',
    tasks: 'Tasks',
    documents: 'Documents',
    kpis: 'KPIs',
  },
  fr: {
    aiAdvisor: 'Conseiller IA',
    aiProjectStatus: 'État du projet selon l’IA',
    sourceAi: 'Source : IA',
    sourceRules: 'Source : Règles',
    riskWarnings: 'Alertes de risque',
    nextBestActions: 'Meilleures actions suivantes',
    plan90: 'Plan sur 90 jours',
    missingData: 'Données manquantes',
    askTitle: 'Poser une question sur ce projet',
    askLabel: 'Poser une question sur ce projet',
    askPlaceholder: 'Exemple : Le capital est-il adapté à ce projet ?',
    askButton: 'Envoyer la question',
    generateReport: 'Générer le rapport du projet',
    reportPreview: 'Aperçu du rapport du projet',
    exportPdfSoon: 'Export PDF bientôt disponible',
    refresh: 'Actualiser l’analyse',
    loading: 'Analyse des données du projet...',
    reportLoading: 'Génération du rapport...',
    chatLoading: 'Préparation de la réponse...',
    error: 'Impossible de charger l’analyse du projet pour le moment.',
    noRisks: 'Aucune alerte de risque claire avec les données disponibles.',
    noActions: 'Aucune action recommandée supplémentaire pour le moment.',
    noMissing: 'Aucune donnée manquante évidente pour le moment.',
    openTab: 'Ouvrir l’onglet',
    assumptions: 'Hypothèses',
    suggestedActions: 'Actions suggérées',
    disclaimerTitle: 'Note importante',
    low: 'Faible',
    medium: 'Moyen',
    high: 'Élevé',
    strong: 'Solide',
    needs_review: 'À réviser',
    high_risk: 'Risque élevé',
    incomplete: 'Incomplet',
    days_1_30: '30 premiers jours',
    days_31_60: 'Jours 31-60',
    days_61_90: 'Jours 61-90',
    overview: 'Vue d’ensemble',
    feasibility: 'Faisabilité',
    financial: 'Modèle financier',
    tasks: 'Tâches',
    documents: 'Documents',
    kpis: 'KPI',
  },
} as const;

export function ProjectAiAdvisorTab({ projectId, lang, onNavigateTab }: Props) {
  const t = TEXT[lang] ?? TEXT.en;
  const [advisor, setAdvisor] = useState<AdvisorResponse | null>(null);
  const [report, setReport] = useState<AdvisorResponse | null>(null);
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<AdvisorResponse['chatAnswer'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');

  const isRtl = lang === 'ar';

  const callAdvisor = useCallback(async (mode: AdvisorMode, questionText?: string) => {
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data.session?.access_token;
    if (!token) throw new Error('Unauthorized');
    const response = await fetch(`/api/projects/${projectId}/ai-advisor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mode, question: questionText, lang }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) throw new Error(data?.error || 'Advisor failed');
    return data as AdvisorResponse;
  }, [lang, projectId]);

  const refreshAdvisor = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callAdvisor('summary');
      setAdvisor(data);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [callAdvisor, t.error]);

  useEffect(() => {
    void refreshAdvisor();
  }, [refreshAdvisor]);

  const generateReport = async () => {
    setReportLoading(true);
    setError('');
    try {
      const data = await callAdvisor('report');
      setReport(data);
    } catch {
      setError(t.error);
    } finally {
      setReportLoading(false);
    }
  };

  const askQuestion = async () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setChatLoading(true);
    setError('');
    try {
      const data = await callAdvisor('chat', trimmed);
      setChat(data.chatAnswer ?? {
        answer: data.summary.explanation,
        assumptions: data.missingData.map(item => item.field),
        suggestedActions: data.nextActions.map(item => item.title),
        disclaimer: data.disclaimer,
      });
    } catch {
      setError(t.error);
    } finally {
      setChatLoading(false);
    }
  };

  const display = advisor;
  const statusClass = display?.summary.status ?? 'incomplete';
  const sourceLabel = display?.source === 'ai' ? t.sourceAi : t.sourceRules;

  const reportSections = useMemo(() => {
    if (!report) return [];
    return [
      { title: t.aiProjectStatus, items: [report.summary.headline, report.summary.explanation] },
      { title: t.riskWarnings, items: report.risks.map(risk => `${risk.title}: ${risk.suggestedAction}`) },
      { title: t.nextBestActions, items: report.nextActions.map(action => action.description) },
      { title: t.missingData, items: report.missingData.map(item => `${item.field}: ${item.whyItMatters}`) },
    ];
  }, [report, t.aiProjectStatus, t.missingData, t.nextBestActions, t.riskWarnings]);

  return (
    <section className="project-ai-advisor" dir={isRtl ? 'rtl' : 'ltr'} aria-label={t.aiAdvisor}>
      <article className={`ai-status-card ${statusClass}`}>
        <div className="ai-status-icon">
          <Bot size={28} aria-hidden="true" />
        </div>
        <div className="ai-status-copy">
          <span>{t.aiProjectStatus}</span>
          <h2>{display ? display.summary.headline : t.loading}</h2>
          <p>{display ? display.summary.explanation : t.loading}</p>
          {display?.message ? <small>{display.message}</small> : null}
        </div>
        <div className="ai-source-stack">
          <span className="ai-source-badge">{sourceLabel}</span>
          <span className={`ai-status-badge ${statusClass}`}>{t[statusClass]}</span>
        </div>
      </article>

      <div className="ai-toolbar">
        <button type="button" onClick={refreshAdvisor} disabled={loading} aria-label={t.refresh}>
          {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
          {loading ? t.loading : t.refresh}
        </button>
        <button type="button" className="primary" onClick={generateReport} disabled={reportLoading} aria-label={t.generateReport}>
          {reportLoading ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
          {reportLoading ? t.reportLoading : t.generateReport}
        </button>
        <button type="button" disabled aria-disabled="true" className="disabled">
          <FileText size={16} />
          {t.exportPdfSoon}
        </button>
      </div>

      {error ? <div className="ai-error" role="alert">{error}</div> : null}
      <div className="ai-live-region" aria-live="polite">{loading ? t.loading : ''}</div>

      <div className="ai-main-grid">
        <article className="ai-card risk-card">
          <SectionTitle icon={<AlertTriangle size={20} />} title={t.riskWarnings} />
          {display?.risks.length ? (
            <div className="risk-list">
              {display.risks.map((risk, index) => (
                <div className={`risk-item ${risk.level}`} key={`${risk.title}-${index}`}>
                  <span>{t[risk.level]}</span>
                  <h3>{risk.title}</h3>
                  <p>{risk.reason}</p>
                  <strong>{risk.suggestedAction}</strong>
                </div>
              ))}
            </div>
          ) : <p className="ai-empty">{t.noRisks}</p>}
        </article>

        <article className="ai-card action-card">
          <SectionTitle icon={<Target size={20} />} title={t.nextBestActions} />
          {display?.nextActions.length ? (
            <div className="action-list">
              {display.nextActions.map((item, index) => (
                <div className={`action-item ${item.priority}`} key={`${item.title}-${index}`}>
                  <span>{t[item.priority]}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <small>{item.estimatedImpact}</small>
                </div>
              ))}
            </div>
          ) : <p className="ai-empty">{t.noActions}</p>}
        </article>

        <article className="ai-card plan-card">
          <SectionTitle icon={<CheckCircle2 size={20} />} title={t.plan90} />
          <div className="plan-list">
            {(display?.plan90 ?? []).map(period => (
              <div className="plan-period" key={period.period}>
                <h3>{t[period.period]}</h3>
                <ul>
                  {period.actions.map((item, index) => <li key={`${period.period}-${index}`}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </article>

        <article className="ai-card missing-card">
          <SectionTitle icon={<FileText size={20} />} title={t.missingData} />
          {display?.missingData.length ? (
            <div className="missing-list">
              {display.missingData.map((item, index) => (
                <div className="missing-item" key={`${item.field}-${index}`}>
                  <div>
                    <h3>{item.field}</h3>
                    <p>{item.whyItMatters}</p>
                  </div>
                  {item.tab ? (
                    <button type="button" onClick={() => onNavigateTab(item.tab!)} aria-label={`${t.openTab}: ${t[item.tab!]}`}>
                      {t[item.tab!]}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : <p className="ai-empty">{t.noMissing}</p>}
        </article>
      </div>

      <article className="ai-card ask-card">
        <SectionTitle icon={<MessageSquareText size={20} />} title={t.askTitle} />
        <label htmlFor="project-ai-question">{t.askLabel}</label>
        <div className="ask-row">
          <textarea
            id="project-ai-question"
            rows={3}
            value={question}
            onChange={event => setQuestion(event.target.value)}
            placeholder={t.askPlaceholder}
          />
          <button type="button" onClick={askQuestion} disabled={chatLoading || !question.trim()} aria-label={t.askButton}>
            {chatLoading ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
            {chatLoading ? t.chatLoading : t.askButton}
          </button>
        </div>
        {chat ? (
          <div className="chat-answer">
            <p>{chat.answer}</p>
            {chat.assumptions.length ? <ChipList title={t.assumptions} items={chat.assumptions} /> : null}
            {chat.suggestedActions.length ? <ChipList title={t.suggestedActions} items={chat.suggestedActions} /> : null}
            <small>{chat.disclaimer}</small>
          </div>
        ) : null}
      </article>

      {report ? (
        <article className="ai-card report-card">
          <SectionTitle icon={<FileText size={20} />} title={t.reportPreview} />
          <div className="report-grid">
            {reportSections.map(section => (
              <section className="report-section" key={section.title}>
                <h3>{section.title}</h3>
                {section.items.length ? (
                  <ul>
                    {section.items.map((item, index) => <li key={`${section.title}-${index}`}>{item}</li>)}
                  </ul>
                ) : <p>{t.noMissing}</p>}
              </section>
            ))}
          </div>
        </article>
      ) : null}

      <article className="ai-disclaimer">
        <strong>{t.disclaimerTitle}</strong>
        <p>{display?.disclaimer ?? TEXT[lang].error}</p>
      </article>

      <style jsx>{`
        .project-ai-advisor{display:grid;gap:16px;min-width:0}.ai-status-card,.ai-card,.ai-disclaimer{background:#FFFDF8;border:1px solid rgba(186,117,23,.16);border-radius:20px;box-shadow:0 14px 34px rgba(61,41,20,.07);min-width:0}.ai-status-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:center;padding:20px;background:radial-gradient(circle at 12% 10%,rgba(250,199,117,.28),transparent 30%),linear-gradient(135deg,#1A0F05,#2B1A0F 58%,#8A5514 140%);color:#FFFDF8}.ai-status-icon{width:58px;height:58px;border-radius:18px;background:rgba(255,253,248,.1);display:grid;place-items:center;color:#FAC775}.ai-status-copy span,.ai-source-badge{color:#FAC775;font-weight:950;font-size:12px}.ai-status-copy h2{margin:6px 0;color:#FFFDF8;font-size:26px;line-height:1.2}.ai-status-copy p{margin:0;color:rgba(255,253,248,.78);line-height:1.7}.ai-status-copy small{display:block;margin-top:8px;color:rgba(255,253,248,.68);line-height:1.6}.ai-source-stack{display:grid;gap:8px;justify-items:end}.ai-status-badge{border-radius:999px;padding:8px 12px;font-weight:950;font-size:12px}.ai-status-badge.strong{background:#EAF3DE;color:#27500A}.ai-status-badge.needs_review,.ai-status-badge.incomplete{background:#FFF4DE;color:#9A5E0D}.ai-status-badge.high_risk{background:#FCEBEB;color:#791F1F}.ai-toolbar{display:flex;flex-wrap:wrap;gap:10px}.ai-toolbar button,.missing-item button,.ask-row button{min-height:42px;border-radius:13px;border:1px solid rgba(186,117,23,.18);background:#FFFDF8;color:#3D2914;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:950;cursor:pointer}.ai-toolbar button.primary,.ask-row button{background:linear-gradient(135deg,#FAC775,#EF9F27);color:#251407;border:0}.ai-toolbar button.disabled{cursor:not-allowed;color:#7A6A55;background:#FFF8EA}.ai-toolbar button:focus-visible,.missing-item button:focus-visible,.ask-row button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(239,159,39,.16)}.ai-toolbar button:disabled,.ask-row button:disabled{opacity:.65;cursor:not-allowed}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.ai-error{border:1px solid rgba(179,38,30,.18);background:#FCEBEB;color:#791F1F;border-radius:14px;padding:12px;font-weight:900}.ai-live-region{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.ai-main-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.ai-card{padding:18px;display:grid;gap:14px}.section-title{display:flex;align-items:center;justify-content:space-between;gap:12px}.section-title h2{margin:0;color:#3D2914;font-size:19px}.section-title svg{color:#BA7517}.risk-list,.action-list,.plan-list,.missing-list,.report-grid{display:grid;gap:10px}.risk-item,.action-item,.plan-period,.missing-item,.report-section{border:1px solid rgba(186,117,23,.12);background:#FFF8EA;border-radius:15px;padding:12px;min-width:0}.risk-item span,.action-item span{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:950}.risk-item.low span,.action-item.low span{background:#EAF3DE;color:#27500A}.risk-item.medium span,.action-item.medium span{background:#FFF4DE;color:#9A5E0D}.risk-item.high span,.action-item.high span{background:#FCEBEB;color:#791F1F}.risk-item h3,.action-item h3,.plan-period h3,.missing-item h3,.report-section h3{margin:8px 0 6px;color:#2B1A0F;font-size:16px}.risk-item p,.action-item p,.missing-item p,.report-section p,.ai-empty{margin:0;color:#5B4332;line-height:1.7}.risk-item strong,.action-item small{display:block;margin-top:8px;color:#3D2914;line-height:1.6}.plan-period ul,.report-section ul{margin:0;padding-inline-start:20px;color:#5B4332;line-height:1.8}.missing-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}.missing-item button{background:#FAEEDA;color:#854F0B;min-height:36px}.ask-card label{font-weight:900;color:#5B4332}.ask-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:stretch}.ask-row textarea{width:100%;min-width:0;border:1px solid rgba(186,117,23,.2);background:#FFFDF8;color:#1A1A1A;border-radius:14px;padding:12px;font-family:inherit;font-weight:800;line-height:1.6;resize:vertical;outline:none}.ask-row textarea:focus{border-color:#EF9F27;box-shadow:0 0 0 3px rgba(239,159,39,.15)}.chat-answer{display:grid;gap:12px;border:1px solid rgba(186,117,23,.12);background:#FFF8EA;border-radius:15px;padding:14px}.chat-answer p{margin:0;color:#3D2914;line-height:1.7;font-weight:900}.chat-answer small,.ai-disclaimer p{color:#7A6A55;line-height:1.7}.chip-list h3{margin:0 0 8px;color:#3D2914;font-size:14px}.chip-list div{display:flex;flex-wrap:wrap;gap:7px}.chip-list span{border-radius:999px;background:#FAEEDA;color:#854F0B;padding:6px 10px;font-size:12px;font-weight:950}.report-card{grid-column:1 / -1}.report-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ai-disclaimer{padding:15px;border-color:rgba(186,117,23,.2);background:#FFF8EA}.ai-disclaimer strong{color:#3D2914}.ai-disclaimer p{margin:6px 0 0;font-weight:900}@media(max-width:980px){.ai-main-grid,.report-grid{grid-template-columns:1fr}.ai-status-card{grid-template-columns:1fr}.ai-source-stack{justify-items:start}.ask-row{grid-template-columns:1fr}.ask-row button{width:100%}}@media(max-width:640px){.ai-toolbar{display:grid}.ai-toolbar button{width:100%}.missing-item{grid-template-columns:1fr}.ai-status-copy h2{font-size:22px}.ai-card,.ai-status-card{padding:16px}}
      `}</style>
    </section>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {icon}
    </div>
  );
}

function ChipList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="chip-list">
      <h3>{title}</h3>
      <div>
        {items.map(item => <span key={item}>{item}</span>)}
      </div>
    </div>
  );
}
