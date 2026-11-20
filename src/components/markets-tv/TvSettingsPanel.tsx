'use client';

import { useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { Check, Languages, Monitor, Play, RotateCcw } from 'lucide-react';
import { TV_GROUPS, TV_STRIP_SPEEDS, DEFAULT_TV_STRIP_SPEED, type TvDisplayMode, type TvSettings } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import { TV_SCENE_ORDER, tvSceneText } from '@/lib/markets-tv/scene-display';
import { obsText } from '@/lib/markets-tv/obsidian';
import { welcomeText } from '@/lib/markets-tv/welcome';
import { tvRemoteCommand } from './tvRemoteKeys';
import './settings-panel.css';

const sections = [
  { id: 'appearance', label: 'settingsAppearance', icon: Languages },
  { id: 'display', label: 'settingsDisplay', icon: Monitor },
  { id: 'playback', label: 'settingsPlayback', icon: Play },
] as const;
type SettingsSection = typeof sections[number]['id'];
const languages = [
  { value: 'ar', label: 'العربية', dir: 'rtl' },
  { value: 'en', label: 'English', dir: 'ltr' },
  { value: 'fr', label: 'Français', dir: 'ltr' },
] as const;

function Setting({ label, wide = false, className = '', children }: {
  label: string; wide?: boolean; className?: string; children: ReactNode;
}) {
  return <div className={`tv-setting-row${wide ? ' tv-setting-wide' : ''} ${className}`}>
    <h3>{label}</h3>{children}
  </div>;
}

function Choice({ selected, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return <button type="button" aria-pressed={selected} {...props}>
    {children}<Check className="tv-setting-check" aria-hidden="true" />
  </button>;
}

export function TvSettingsPanel({ settings, change, stripsOnly = false, displayMode = 'viewing', changeDisplayMode, customize, channels, onReplay }: {
  settings: TvSettings; change: (value: TvSettings) => void; stripsOnly?: boolean;
  displayMode?: TvDisplayMode; changeDisplayMode?: (mode: TvDisplayMode) => void;
  customize: () => void; channels: () => void; onReplay?: () => void;
}) {
  const [section, setSection] = useState<SettingsSection>('appearance');
  const content = useRef<HTMLDivElement>(null);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language, key);
  const chooseSection = (next: SettingsSection) => {
    setSection(next);
    if (content.current) content.current.scrollTop = 0;
  };
  const navigateTabs = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing) return;
    const command = tvRemoteCommand(event.nativeEvent);
    const key = command?.kind === 'arrow' ? command.direction : event.key;
    const index = sections.findIndex(item => item.id === section);
    let next: number;
    if (key === 'Home') next = 0;
    else if (key === 'End') next = sections.length - 1;
    else if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const forward = key === (settings.language === 'ar' ? 'ArrowLeft' : 'ArrowRight');
      next = (index + (forward ? 1 : -1) + sections.length) % sections.length;
    } else return;
    event.preventDefault();
    chooseSection(sections[next].id);
    event.currentTarget.querySelector<HTMLButtonElement>(`#tv-settings-tab-${sections[next].id}`)?.focus();
  };
  const toggle = (key: 'autoRotate' | 'ticker' | 'sound' | 'autoHideControls') => change({ ...settings, [key]: !settings[key] });
  const switchControl = (key: 'autoRotate' | 'ticker' | 'sound' | 'autoHideControls') => <Setting key={key} label={t(key)}>
    <button type="button" className="tv-settings-switch" role="switch" aria-label={t(key)} aria-checked={Boolean(settings[key])} onClick={() => toggle(key)}>
      <span className="tv-settings-switch-track" aria-hidden="true"><span /></span>
      <span>{t(settings[key] ? 'enabled' : 'disabled')}</span>
    </button>
  </Setting>;

  return <div className="tv-settings tv-settings-panel">
    <div className="tv-settings-tabs" role="tablist" aria-label={t('settingsSections')} onKeyDown={navigateTabs}>
      {sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" id={`tv-settings-tab-${id}`}
        aria-selected={section === id} aria-controls={`tv-settings-panel-${id}`} tabIndex={section === id ? 0 : -1}
        data-tv-focus-key={`settings-tab-${id}`} onClick={() => chooseSection(id)}>
        <Icon aria-hidden="true" /><span>{t(label)}</span>
      </button>)}
    </div>
    <div ref={content} className="tv-settings-content">
      <div className="tv-settings-section" role="tabpanel" id="tv-settings-panel-appearance" aria-labelledby="tv-settings-tab-appearance" hidden={section !== 'appearance'}>
        <Setting label={t('language')} wide className="tv-language-setting">
          <div className="tv-language-options tv-segment" role="group" aria-label={t('language')}>
            {languages.map(language => <Choice key={language.value} selected={settings.language === language.value}
              data-tv-focus-key={`settings-language-${language.value}`} onClick={() => change({ ...settings, language: language.value })}>
              <bdi lang={language.value} dir={language.dir}>{language.label}</bdi>
            </Choice>)}
          </div>
        </Setting>
        <Setting label={t('theme')}>
          <div className="tv-segment" role="group" aria-label={t('theme')}>
            {(['dark', 'light'] as const).map(theme => <Choice key={theme} selected={settings.theme === theme} onClick={() => change({ ...settings, theme })}>
              {t(theme)}
            </Choice>)}
          </div>
        </Setting>
        <Setting label={obsText(settings.language, 'tweaks')}>
          <div className="tv-segment tv-accent-options" role="group" aria-label={obsText(settings.language, 'tweaks')}>
            {(['champagne', 'blue', 'green', 'purple'] as const).map(accent => <Choice key={accent} data-accent={accent}
              selected={(settings.accent || 'champagne') === accent} onClick={() => change({ ...settings, accent })}>
              {obsText(settings.language, accent)}
            </Choice>)}
          </div>
        </Setting>
      </div>
      <div className="tv-settings-section" role="tabpanel" id="tv-settings-panel-display" aria-labelledby="tv-settings-tab-display" hidden={section !== 'display'}>
        {changeDisplayMode && <Setting label={tvSceneText(settings.language, 'displayMode')} wide>
          <div className="tv-segment" role="group" aria-label={tvSceneText(settings.language, 'displayMode')}>
            {(['viewing', 'browse', 'strips'] as const).map(mode => <Choice key={mode} selected={displayMode === mode} onClick={() => changeDisplayMode(mode)}>
              {tvSceneText(settings.language, mode)}
            </Choice>)}
          </div>
        </Setting>}
        {displayMode === 'viewing' && <Setting label={tvSceneText(settings.language, 'chooseScene')} wide>
          <div className="tv-segment" role="group" aria-label={tvSceneText(settings.language, 'chooseScene')}>
            {TV_SCENE_ORDER.map(scene => <Choice key={scene} selected={(settings.scene || 'overview') === scene} onClick={() => change({ ...settings, scene })}>
              {tvSceneText(settings.language, scene)}
            </Choice>)}
          </div>
        </Setting>}
        <Setting label={displayMode === 'viewing' ? tvSceneText(settings.language, 'browseCustomization') : t('displayInstruments')}>
          <button type="button" onClick={customize}>{t('customizeMarkets')}</button>
        </Setting>
        <Setting label={t('channels')}>
          <button type="button" onClick={channels}>{t('channels')}</button>
        </Setting>
        {!stripsOnly && displayMode === 'browse' && <Setting label={t('layout')}>
          <div className="tv-segment" role="group" aria-label={t('layout')}>
            {(['balanced', 'quotes'] as const).map(layout => <Choice key={layout} selected={settings.layout === layout} onClick={() => change({ ...settings, layout })}>
              {t(layout)}
            </Choice>)}
          </div>
        </Setting>}
        {displayMode !== 'viewing' && <>
          <Setting label={t('stripDensity')}>
            <div className="tv-segment" role="group" aria-label={t('stripDensity')}>
              {(['comfortable', 'balanced', 'compact'] as const).map(density => <Choice key={density}
                selected={(settings.stripDensity || 'balanced') === density} onClick={() => change({ ...settings, stripDensity: density })}>
                {t(density === 'balanced' ? 'balancedDensity' : density)}
              </Choice>)}
            </div>
          </Setting>
          <Setting label={t('visibleMarkets')} wide>
            <div className="tv-group-options" role="group" aria-label={t('visibleMarkets')}>
              {TV_GROUPS.map(group => <Choice key={group} selected={settings.groups.includes(group)} onClick={() => {
                const groups = settings.groups.includes(group) ? settings.groups.filter(item => item !== group) : [...settings.groups, group];
                if (groups.length) change({ ...settings, groups });
              }}>{t(group)}</Choice>)}
            </div>
            <p className="tv-muted tv-setting-help">{t('pricedOnlyHelp')}</p>
          </Setting>
        </>}
      </div>
      <div className="tv-settings-section" role="tabpanel" id="tv-settings-panel-playback" aria-labelledby="tv-settings-tab-playback" hidden={section !== 'playback'}>
        {!stripsOnly && <>
          {switchControl('autoRotate')}
          <Setting label={`${t('rotationSeconds')} (${t('seconds')})`}>
            <div className="tv-segment" role="group" aria-label={t('rotationSeconds')}>
              {[20, 30, 60, 120].map(seconds => <Choice key={seconds} selected={settings.rotationSeconds === seconds} onClick={() => change({ ...settings, rotationSeconds: seconds })}>
                <bdi dir="ltr">{seconds}</bdi>
              </Choice>)}
            </div>
          </Setting>
          {switchControl('ticker')}
        </>}
        <Setting label={t('stripSpeed')}>
          <div className="tv-segment" role="group" aria-label={t('stripSpeed')}>
            {TV_STRIP_SPEEDS.map((speed, index) => <Choice key={speed} selected={(settings.stripSpeed || DEFAULT_TV_STRIP_SPEED) === speed}
              onClick={() => change({ ...settings, stripSpeed: speed })}>{t((['slow', 'normal', 'fast'] as const)[index])}</Choice>)}
          </div>
        </Setting>
        {!stripsOnly && switchControl('sound')}
        {displayMode !== 'browse' && switchControl('autoHideControls')}
        {onReplay && <Setting label={welcomeText(settings.language).replay}>
          <button type="button" data-tv-focus-key="replay-intro" onClick={onReplay}>
            <RotateCcw aria-hidden="true"/><span>{welcomeText(settings.language).replay}</span>
          </button>
        </Setting>}
        <details className="tv-settings-info tv-setting-wide">
          <summary>{t('settingsInfo')}</summary>
          <p tabIndex={0} className="tv-muted tv-setting-help">{t('refreshCadence')}</p>
          {!stripsOnly && <p tabIndex={0} className="tv-muted tv-setting-help">{t('alertScope')}</p>}
        </details>
      </div>
    </div>
    <p className="tv-settings-help tv-muted">{t('remoteHelp')}</p>
  </div>;
}
