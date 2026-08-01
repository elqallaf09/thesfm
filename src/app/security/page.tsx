'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  EyeOff,
  FileText,
  HelpCircle,
  KeyRound,
  Laptop,
  Mail,
  QrCode,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { ActionRow } from '@/components/layout/ActionRow';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORT_EMAIL, SUPPORT_EMAIL_ARIA_LABEL, SUPPORT_EMAIL_MAILTO, SUPPORT_EMAIL_SUPPORT_MAILTO } from '@/lib/constants/contact';
import {
  TEXT,
  detectDeviceLabel,
  formatDate,
  qrImageSource,
  scoreLabel,
  type Lang,
  type SecurityProfile,
  type TotpEnrollment,
  type TotpFactor,
} from './_content';
import { ComingSoonRow, SecuritySection, SecurityStyles } from './_presentation';
import { SecurityModals } from './_modals';


export default function SecurityPage() {
  const { lang, dir } = useLanguage();
  const { user, session, signOut } = useAuth();
  const activeLang = ((lang as Lang) || 'ar') as Lang;
  const text = TEXT[activeLang];
  const [profile, setProfile] = useState<SecurityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [ipInfo, setIpInfo] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [totpFactors, setTotpFactors] = useState<TotpFactor[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollment | null>(null);
  const [disableTotpFactor, setDisableTotpFactor] = useState<TotpFactor | null>(null);

  const loadProfile = async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id,username,display_name,email,phone_number,security_question,security_question_2,security_question_3,email_2fa_enabled,email_2fa_enabled_at,updated_at,created_at')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) {
      console.error('[security] Failed to load profile security data', profileError);
      setError(text.loadError);
    } else {
      setProfile(data as SecurityProfile | null);
    }
    setLoading(false);
  };

  async function loadMfaFactors() {
    if (!user?.id) {
      setTotpFactors([]);
      return;
    }
    setMfaError('');
    const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      console.error('[security] Failed to load MFA factors', factorsError);
      setMfaError(text.mfaLoadError);
      return;
    }
    setTotpFactors(((data?.totp || []) as TotpFactor[]).filter(factor => factor.status !== 'unverified'));
  }

  useEffect(() => {
    setDeviceLabel(detectDeviceLabel(activeLang));
  }, [activeLang]);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then((d: { ip?: string; city?: string; country_name?: string }) => {
        const parts = [d.ip, d.city, d.country_name].filter(Boolean);
        setIpInfo(parts.length ? parts.join(' · ') : null);
      })
      .catch(() => { /* silently ignore */ });
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadMfaFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeLang]);

  const verifiedTotpFactor = useMemo(
    () => totpFactors.find(factor => factor.status === 'verified') || null,
    [totpFactors],
  );

  const security = useMemo(() => {
    const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
    const email2fa = Boolean(profile?.email_2fa_enabled);
    const totp2fa = Boolean(verifiedTotpFactor);
    const hasSecurityQuestions = Boolean(profile?.security_question && profile?.security_question_2);
    const hasProfileBasics = Boolean(profile?.display_name && profile?.email);
    const score =
      (emailVerified ? 25 : 0) +
      (totp2fa ? 25 : email2fa ? 18 : 0) +
      (hasSecurityQuestions ? 20 : 0) +
      (hasProfileBasics ? 15 : 0) +
      (session ? 15 : 0);
    return { score, emailVerified, email2fa, totp2fa, hasSecurityQuestions, hasProfileBasics };
  }, [profile, session, user, verifiedTotpFactor]);

  const activityItems = useMemo(() => {
    const items: Array<{ label: string; date: string | null | undefined; icon: LucideIcon }> = [];
    if (user?.last_sign_in_at) items.push({ label: text.newLogin, date: user.last_sign_in_at, icon: Activity });
    if (profile?.updated_at) items.push({ label: text.privacyUpdate, date: profile.updated_at, icon: ShieldCheck });
    if (profile?.email_2fa_enabled_at) items.push({ label: text.twoFactorEnabled, date: profile.email_2fa_enabled_at, icon: KeyRound });
    if (verifiedTotpFactor?.updated_at || verifiedTotpFactor?.created_at) items.push({ label: text.twoFactorEnabled, date: verifiedTotpFactor.updated_at || verifiedTotpFactor.created_at, icon: QrCode });
    return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 5);
  }, [profile, text, user, verifiedTotpFactor]);

  const protectionChecks = [
    { label: security.emailVerified ? text.emailVerified : text.emailNotVerified, done: security.emailVerified },
    { label: `${text.twoFactor}: ${security.totp2fa || security.email2fa ? text.enabled : text.disabled}`, done: security.totp2fa || security.email2fa },
    { label: `${text.passwordStrength}: ${security.hasSecurityQuestions ? text.strong : text.medium}`, done: security.hasSecurityQuestions },
    { label: `${text.lastLogin}: ${formatDate(user?.last_sign_in_at, text.unknown, activeLang)}`, done: Boolean(user?.last_sign_in_at) },
  ];

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  function downloadMyData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user?.id || null,
        email: user?.email || profile?.email || null,
        emailVerified: security.emailVerified,
        lastLogin: user?.last_sign_in_at || null,
      },
      profile,
      security: {
        score: security.score,
        email2faEnabled: security.email2fa,
        email2faEnabledAt: profile?.email_2fa_enabled_at || null,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `the-sfm-security-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(text.exportSuccess);
  }

  async function disableEmailTwoFactor() {
    if (!user?.id || !profile?.email_2fa_enabled) return;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ email_2fa_enabled: false, email_2fa_enabled_at: null, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (updateError) {
      console.error('[security] Failed to disable email 2FA', updateError);
      setError(text.loadError);
      return;
    }
    setProfile(prev => prev ? { ...prev, email_2fa_enabled: false, email_2fa_enabled_at: null, updated_at: new Date().toISOString() } : prev);
  }

  async function startTotpEnrollment() {
    setMfaLoading(true);
    setMfaError('');
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'THE SFM',
      });
      if (enrollError) throw enrollError;
      setTotpEnrollment({
        factorId: data.id,
        qr: qrImageSource(data.totp.qr_code),
        secret: (data.totp as { secret?: string; uri?: string }).secret || (data.totp as { secret?: string; uri?: string }).uri || '',
        code: '',
        loading: false,
        error: '',
      });
    } catch (enrollError) {
      console.error('[security] Failed to enroll TOTP MFA', enrollError);
      setMfaError(text.mfaEnrollError);
    } finally {
      setMfaLoading(false);
    }
  }

  async function verifyTotpEnrollment() {
    if (!totpEnrollment || totpEnrollment.code.length !== 6) {
      setTotpEnrollment(prev => prev ? { ...prev, error: text.mfaVerifyError } : prev);
      return;
    }
    setTotpEnrollment(prev => prev ? { ...prev, loading: true, error: '' } : prev);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: totpEnrollment.factorId });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId: totpEnrollment.factorId,
        challengeId: challenge.data.id,
        code: totpEnrollment.code,
      });
      if (verify.error) throw verify.error;
      setTotpEnrollment(null);
      await loadMfaFactors();
      showToast(text.mfaEnabledSuccess);
    } catch (verifyError) {
      console.error('[security] Failed to verify TOTP MFA', verifyError);
      setTotpEnrollment(prev => prev ? { ...prev, loading: false, error: text.mfaVerifyError } : prev);
    }
  }

  async function disableTotp() {
    if (!disableTotpFactor) return;
    setMfaLoading(true);
    setMfaError('');
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: disableTotpFactor.id });
      if (unenrollError) throw unenrollError;
      setDisableTotpFactor(null);
      await loadMfaFactors();
      showToast(text.mfaDisabledSuccess);
    } catch (unenrollError) {
      console.error('[security] Failed to unenroll TOTP MFA', unenrollError);
      setMfaError(text.mfaLoadError);
    } finally {
      setMfaLoading(false);
    }
  }

  function prepareDeleteRequest() {
    const body = encodeURIComponent([
      text.deleteRequestPrepared,
      '',
      `User ID: ${user?.id || 'unknown'}`,
      `Email: ${user?.email || profile?.email || 'unknown'}`,
      `Requested at: ${new Date().toISOString()}`,
    ].join('\n'));
    window.location.href = `${SUPPORT_EMAIL_MAILTO}?subject=${encodeURIComponent(text.deleteAccount)}&body=${body}`;
    setDeleteOpen(false);
    setDeletePhrase('');
  }

  return (
    <div className="security-shell" dir={dir}>
      <DashboardPageShell ariaLabel={text.title} contentClassName="security-content">
        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<ShieldCheck size={28} />}
          actions={(
            <ActionRow>
              <Link className="sfm-primary-link" href="/profile">{text.openProfile}</Link>
            </ActionRow>
          )}
        />

        {toast && <div className="security-toast">{toast}</div>}
        {loading && <AppCard className="security-state">{text.loading}</AppCard>}
        {error && (
          <AppCard className="security-state danger">
            <span>{error}</span>
            <button type="button" onClick={() => void loadProfile()}>{text.retry}</button>
          </AppCard>
        )}

        <section className="security-score-grid">
          <AppCard className="security-score-card">
            <div className="security-score-copy">
              <span className="security-kicker"><Shield size={16} />{text.scoreTitle}</span>
              <h2 style={{ color: security.score >= 50 ? 'var(--success)' : 'var(--danger)' }}>{security.score}%</h2>
              <p>{scoreLabel(security.score, text)}</p>
            </div>
            <div
              className="score-ring"
              style={{ '--ring-color': security.score >= 50 ? 'var(--success)' : 'var(--danger)' } as CSSProperties}
              role="img"
              aria-label={`${security.score}/100`}
            >
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle className="score-ring-track" cx="60" cy="60" r="52" pathLength="100" />
                <circle className="score-ring-value" cx="60" cy="60" r="52" pathLength="100" strokeDasharray={`${security.score} 100`} />
              </svg>
              <span className="score-ring-label">
                <strong style={{ color: security.score >= 50 ? 'var(--success)' : 'var(--danger)' }}>{security.score}</strong>
                <small>/100</small>
              </span>
            </div>
          </AppCard>

          <AppCard className="security-checks-card">
            <h2>{text.accountProtection}</h2>
            <p>{text.accountProtectionDesc}</p>
            <div className="check-list">
              {protectionChecks.map(item => (
                <div key={item.label} className={item.done ? 'check-row done' : 'check-row'}>
                  {item.done ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </AppCard>
        </section>

        <section className="security-main-grid">
          <SecuritySection title={text.twoFactor} icon={KeyRound}>
            {mfaError && <div className="message-inline danger">{mfaError}</div>}
            <div className="control-row">
              <div>
                <strong>{text.app2fa}</strong>
                <p>{text.app2faDesc}</p>
                <span className={verifiedTotpFactor ? 'status-pill on' : 'status-pill'}>{verifiedTotpFactor ? text.enabled : text.disabled}</span>
                {verifiedTotpFactor?.updated_at || verifiedTotpFactor?.created_at ? <small>{text.lastEnabled}: {formatDate(verifiedTotpFactor.updated_at || verifiedTotpFactor.created_at, text.unknown, activeLang)}</small> : null}
              </div>
              {verifiedTotpFactor ? (
                <button type="button" className="ghost-action danger" disabled={mfaLoading} onClick={() => setDisableTotpFactor(verifiedTotpFactor)}>{text.disable}</button>
              ) : (
                <button type="button" className="ghost-action" disabled={mfaLoading} onClick={() => void startTotpEnrollment()}>{mfaLoading ? text.enabling : text.enable}</button>
              )}
            </div>
            <div className="control-row">
              <div>
                <strong>{text.email2fa}</strong>
                <p>{text.email2faDesc}</p>
                <span className={security.email2fa ? 'status-pill on' : 'status-pill'}>{security.email2fa ? text.enabled : text.disabled}</span>
                {profile?.email_2fa_enabled_at && <small>{text.enabledAt}: {formatDate(profile.email_2fa_enabled_at, text.unknown, activeLang)}</small>}
              </div>
              {security.email2fa ? (
                <button type="button" className="ghost-action danger" onClick={() => void disableEmailTwoFactor()}>{text.disable}</button>
              ) : (
                <Link className="ghost-action" href="/profile">{text.enable}</Link>
              )}
            </div>
            <ComingSoonRow title={text.backupCodes} body={text.backupCodesDesc} label={text.soon} />
          </SecuritySection>

          <SecuritySection title={text.devices} icon={Laptop}>
            <div className="device-card">
              <Smartphone size={20} />
              <div>
                <strong>{text.currentDevice}</strong>
                <p>{deviceLabel || text.unknown}</p>
                <small>{text.lastLogin}: {formatDate(user?.last_sign_in_at, text.unknown, activeLang)}</small>
              </div>
            </div>
            <div className="muted-panel">
              <strong>{text.sessionsSoon}</strong>
              <p>{text.ipLocation}: {ipInfo ?? text.unknown}</p>
            </div>
            <button type="button" className="ghost-action full" onClick={() => void signOut()}>{text.signOutAll}</button>
          </SecuritySection>

          <SecuritySection title={text.activityLog} icon={Activity}>
            {activityItems.length ? (
              <div className="activity-list">
                {activityItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={`${item.label}-${item.date}`} className="activity-item">
                      <span><Icon size={16} /></span>
                      <div>
                        <strong>{item.label}</strong>
                        <p>{formatDate(item.date, text.unknown, activeLang)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-security"><Clock size={20} />{text.noActivity}</div>
            )}
          </SecuritySection>

          <SecuritySection title={text.dataUsage} icon={Database} wide>
            <p className="section-copy">{text.dataUsageIntro}</p>
            <div className="usage-grid">
              {[text.incomeAnalysis, text.expenseAnalysis, text.reports, text.smartRecommendations, text.goals, text.zakat].map(item => (
                <span key={item}><CheckCircle2 size={15} />{item}</span>
              ))}
            </div>
            <div className="no-sale"><EyeOff size={18} />{text.noDataSale}</div>
          </SecuritySection>

          <SecuritySection title={text.exportDelete} icon={FileText}>
            <p className="section-copy">{text.exportDeleteDesc}</p>
            <button type="button" className="solid-action" onClick={downloadMyData}><Download size={16} />{text.downloadData}</button>
            <div className="muted-panel">
              <strong>{text.deleteAnalytics}</strong>
              <p>{text.analyticsSoon}</p>
            </div>
            <button type="button" className="danger-action" onClick={() => setDeleteOpen(true)}><Trash2 size={16} />{text.deleteAccount}</button>
            <p className="danger-note">{text.deleteAccountNote}</p>
          </SecuritySection>

          <SecuritySection title={text.privacyFaq} icon={HelpCircle} wide>
            <div className="faq-list">
              {text.questions.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </SecuritySection>

          <SecuritySection title={text.contactPrivacy} icon={Mail} wide>
            <p className="section-copy">{text.supportDesc}</p>
            <a className="security-mail-link" href={SUPPORT_EMAIL_SUPPORT_MAILTO} aria-label={SUPPORT_EMAIL_ARIA_LABEL}>{SUPPORT_EMAIL}</a>
          </SecuritySection>
        </section>
      </DashboardPageShell>

      <SecurityModals
        text={text}
        deleteOpen={deleteOpen}
        deletePhrase={deletePhrase}
        totpEnrollment={totpEnrollment}
        disableTotpFactor={disableTotpFactor}
        mfaLoading={mfaLoading}
        onCloseDelete={() => setDeleteOpen(false)}
        onDeletePhraseChange={setDeletePhrase}
        onDeleteRequest={prepareDeleteRequest}
        onCloseEnrollment={() => setTotpEnrollment(null)}
        onEnrollmentChange={update => setTotpEnrollment(previous => previous ? update(previous) : previous)}
        onVerifyEnrollment={() => void verifyTotpEnrollment()}
        onCloseDisable={() => setDisableTotpFactor(null)}
        onDisableTotp={() => void disableTotp()}
      />

      <SecurityStyles />
    </div>
  );
}
