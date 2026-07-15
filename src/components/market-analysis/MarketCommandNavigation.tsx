'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { MarketTab } from './types';
import {
  MARKET_COMMAND_GROUPS,
  MARKET_COMMAND_TAB_LABEL_KEYS,
  marketCommandGroupConfig,
  marketCommandContentId,
  marketCommandGroupForTab,
  marketCommandGroupTriggerId,
  type MarketCommandGroupId,
} from './marketCommandCenter';
import styles from './MarketCommandNavigation.module.css';

export type MarketCommandNavigationLabelKeys = Readonly<{
  primaryNavigation: string;
  secondaryNavigation: string;
  groups?: Partial<Record<MarketCommandGroupId, string>>;
  tabs?: Partial<Record<MarketTab, string>>;
}>;

export type MarketCommandNavigationProps = Readonly<{
  activeTab: MarketTab;
  onTabChange: (tab: MarketTab) => void;
  translate: (key: string) => string;
  labelKeys: MarketCommandNavigationLabelKeys;
  dir?: 'ltr' | 'rtl';
  idBase?: string;
  className?: string;
}>;

function isRtlNavigation(target: HTMLElement, explicitDirection?: 'ltr' | 'rtl') {
  if (explicitDirection) return explicitDirection === 'rtl';
  const localDirection = target.closest<HTMLElement>('[dir]')?.dir;
  if (localDirection) return localDirection === 'rtl';
  return typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
}

export function MarketCommandNavigation({
  activeTab,
  onTabChange,
  translate,
  labelKeys,
  dir,
  idBase,
  className = '',
}: MarketCommandNavigationProps) {
  const generatedId = useId();
  const resolvedIdBase = useMemo(
    () => idBase ?? `market-command-${generatedId}`,
    [generatedId, idBase],
  );
  const resolvedActiveGroup = marketCommandGroupForTab(activeTab);
  const activeGroupConfig = marketCommandGroupConfig(resolvedActiveGroup);
  const [focusedGroup, setFocusedGroup] = useState<MarketCommandGroupId>(resolvedActiveGroup);
  const groupRefs = useRef(new Map<MarketCommandGroupId, HTMLButtonElement>());

  useEffect(() => {
    setFocusedGroup(resolvedActiveGroup);
  }, [resolvedActiveGroup]);

  const selectGroup = (groupId: MarketCommandGroupId) => {
    const group = MARKET_COMMAND_GROUPS.find(item => item.id === groupId) ?? MARKET_COMMAND_GROUPS[0];
    onTabChange(group.defaultTab);
  };

  const focusAndSelectGroup = (groupId: MarketCommandGroupId) => {
    setFocusedGroup(groupId);
    groupRefs.current.get(groupId)?.focus();
    selectGroup(groupId);
  };

  const handleGroupKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    groupId: MarketCommandGroupId,
  ) => {
    const currentIndex = MARKET_COMMAND_GROUPS.findIndex(group => group.id === groupId);
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = MARKET_COMMAND_GROUPS.length - 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const rtl = isRtlNavigation(event.currentTarget, dir);
      const movesForward = event.key === 'ArrowRight' ? !rtl : rtl;
      nextIndex = (currentIndex + (movesForward ? 1 : -1) + MARKET_COMMAND_GROUPS.length)
        % MARKET_COMMAND_GROUPS.length;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    focusAndSelectGroup(MARKET_COMMAND_GROUPS[nextIndex].id);
  };

  const primaryAriaLabel = translate(labelKeys.primaryNavigation);
  const secondaryAriaLabel = translate(labelKeys.secondaryNavigation);
  const rootClassName = className ? `${styles.root} ${className}` : styles.root;

  return (
    <nav
      className={rootClassName}
      aria-label={primaryAriaLabel}
      dir={dir}
      data-command-group={resolvedActiveGroup}
      data-active-tab={activeTab}
    >
      <div className={styles.primaryViewport}>
        <div
          className={styles.primaryList}
          role="tablist"
          aria-label={primaryAriaLabel}
          aria-orientation="horizontal"
        >
          {MARKET_COMMAND_GROUPS.map(group => {
            const selected = group.id === resolvedActiveGroup;
            const labelKey = labelKeys.groups?.[group.id] ?? group.labelKey;

            return (
              <button
                key={group.id}
                ref={element => {
                  if (element) groupRefs.current.set(group.id, element);
                  else groupRefs.current.delete(group.id);
                }}
                type="button"
                role="tab"
                id={marketCommandGroupTriggerId(resolvedIdBase, group.id)}
                className={styles.primaryTab}
                aria-selected={selected}
                aria-controls={marketCommandContentId(resolvedIdBase)}
                tabIndex={focusedGroup === group.id ? 0 : -1}
                onClick={() => selectGroup(group.id)}
                onFocus={() => setFocusedGroup(group.id)}
                onKeyDown={event => handleGroupKeyDown(event, group.id)}
              >
                <span>{translate(labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeGroupConfig.tabs.length > 1 ? (
        <section className={styles.groupPanel} aria-label={secondaryAriaLabel}>
          <div
            className={styles.secondaryList}
            role="group"
            aria-label={secondaryAriaLabel}
          >
            {activeGroupConfig.tabs.map(tab => {
              const pressed = tab === activeTab;
              const labelKey = labelKeys.tabs?.[tab] ?? MARKET_COMMAND_TAB_LABEL_KEYS[tab];

              return (
                <button
                  key={tab}
                  type="button"
                  className={styles.secondaryButton}
                  aria-pressed={pressed}
                  onClick={() => onTabChange(tab)}
                >
                  <span>{translate(labelKey)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </nav>
  );
}
