'use client';

import Link from 'next/link';
import type { KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, FolderKanban, Plus, Search } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export type ProjectSelectorProject = Record<string, unknown> & { id: string };

type ProjectSelectorProps = {
  projects: ProjectSelectorProject[];
  selectedProjectId: string;
  onChange: (projectId: string) => void;
  readinessScore?: number | null;
  getReadinessScore?: (project: ProjectSelectorProject) => number | null | undefined;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
  addProjectHref?: string;
  openProjectHref?: (projectId: string) => string;
};

const COPY = {
  ar: {
    selectedProject: 'المشروع المحدد',
    changeProject: 'تغيير المشروع',
    openProject: 'فتح المشروع',
    chooseProjectFirst: 'اختر مشروعًا أولًا',
    addProject: 'إضافة مشروع جديد',
    emptyTitle: 'لا توجد مشاريع بعد',
    emptyDescription: 'أضف مشروعك الأول لبدء إعداد التقارير ومتابعة الأداء.',
    availablePlural: (count: number) => `لديك ${count} مشاريع متاحة`,
    availableOne: 'مشروع واحد متاح',
    availableNone: 'لا توجد مشاريع بعد',
    availableProjects: 'مشاريع متاحة',
    insufficientData: 'بيانات غير كافية',
    unselected: 'غير محدد',
    searchPlaceholder: 'ابحث عن مشروع...',
    projectType: 'نوع المشروع',
    projectStatus: 'حالة المشروع',
    readinessScore: 'جاهزية المشروع',
    lastUpdated: 'آخر تحديث',
    selected: 'محدد',
    allProjects: 'كل المشاريع',
  },
  en: {
    selectedProject: 'Selected Project',
    changeProject: 'Change Project',
    openProject: 'Open Project',
    chooseProjectFirst: 'Choose a project first',
    addProject: 'Add New Project',
    emptyTitle: 'No projects yet',
    emptyDescription: 'Add your first project to start preparing reports and tracking performance.',
    availablePlural: (count: number) => `You have ${count} available projects`,
    availableOne: 'One project available',
    availableNone: 'No projects yet',
    availableProjects: 'Available Projects',
    insufficientData: 'Insufficient data',
    unselected: 'Not selected',
    searchPlaceholder: 'Search projects...',
    projectType: 'Project type',
    projectStatus: 'Project status',
    readinessScore: 'Project readiness',
    lastUpdated: 'Last updated',
    selected: 'Selected',
    allProjects: 'All projects',
  },
  fr: {
    selectedProject: 'Projet sélectionné',
    changeProject: 'Changer de projet',
    openProject: 'Ouvrir le projet',
    chooseProjectFirst: 'Choisissez d’abord un projet',
    addProject: 'Ajouter un nouveau projet',
    emptyTitle: 'Aucun projet pour le moment',
    emptyDescription: 'Ajoutez votre premier projet pour préparer les rapports et suivre la performance.',
    availablePlural: (count: number) => `Vous avez ${count} projets disponibles`,
    availableOne: 'Un projet disponible',
    availableNone: 'Aucun projet pour le moment',
    availableProjects: 'Projets disponibles',
    insufficientData: 'Données insuffisantes',
    unselected: 'Non sélectionné',
    searchPlaceholder: 'Rechercher un projet...',
    projectType: 'Type de projet',
    projectStatus: 'Statut du projet',
    readinessScore: 'Préparation du projet',
    lastUpdated: 'Dernière mise à jour',
    selected: 'Sélectionné',
    allProjects: 'Tous les projets',
  },
} as const;

type ProjectSelectorCopy = (typeof COPY)[keyof typeof COPY];

function textValue(project: ProjectSelectorProject | null | undefined, keys: string[], fallback = '') {
  if (!project) return fallback;
  for (const key of keys) {
    const value = project[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function dateValue(project: ProjectSelectorProject | null | undefined) {
  return textValue(project, ['updated_at', 'updatedAt', 'modified_at', 'modifiedAt', 'created_at', 'createdAt']);
}

function formatDate(value: string, lang: 'ar' | 'en' | 'fr') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function normalizeStatus(value: string, lang: 'ar' | 'en' | 'fr') {
  const normalized = value.trim().toLowerCase();
  const labels: Record<string, Record<'ar' | 'en' | 'fr', string>> = {
    active: { ar: 'نشط', en: 'Active', fr: 'Actif' },
    completed: { ar: 'مكتمل', en: 'Completed', fr: 'Terminé' },
    complete: { ar: 'مكتمل', en: 'Completed', fr: 'Terminé' },
    planning: { ar: 'تخطيط', en: 'Planning', fr: 'Planification' },
    pending: { ar: 'قيد الانتظار', en: 'Pending', fr: 'En attente' },
    paused: { ar: 'متوقف مؤقتاً', en: 'Paused', fr: 'En pause' },
    late: { ar: 'متأخر', en: 'Late', fr: 'En retard' },
    overdue: { ar: 'متأخر', en: 'Overdue', fr: 'En retard' },
  };
  return labels[normalized]?.[lang] ?? value;
}

function projectName(project: ProjectSelectorProject | null | undefined, fallback: string) {
  return textValue(project, ['name', 'project_name', 'title'], fallback);
}

function projectType(project: ProjectSelectorProject | null | undefined, fallback: string) {
  return textValue(project, ['category', 'type', 'project_type', 'business_type'], fallback);
}

function projectStatus(project: ProjectSelectorProject | null | undefined, fallback: string, lang: 'ar' | 'en' | 'fr') {
  const status = textValue(project, ['status', 'project_status', 'current_status'], '');
  return status ? normalizeStatus(status, lang) : fallback;
}

function countLabel(count: number, copy: ProjectSelectorCopy) {
  if (count === 0) return copy.availableNone;
  if (count === 1) return copy.availableOne;
  return copy.availablePlural(count);
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onChange,
  readinessScore = null,
  getReadinessScore,
  label,
  hint,
  disabled = false,
  className = '',
  compact = false,
  allowEmpty = false,
  emptyOptionLabel,
  addProjectHref = '/projects',
  openProjectHref = projectId => `/projects/${projectId}`,
}: ProjectSelectorProps) {
  const { lang, dir } = useLanguage();
  const locale = (lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar') as 'ar' | 'en' | 'fr';
  const copy = COPY[locale];
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredProjects = useMemo(() => {
    if (!normalizedSearch) return projects;
    return projects.filter(project => {
      const haystack = [
        projectName(project, ''),
        projectType(project, ''),
        textValue(project, ['status', 'project_status', 'current_status']),
      ].join(' ').toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, projects]);
  const optionIds = useMemo(
    () => [...(allowEmpty ? [''] : []), ...filteredProjects.map(project => project.id)],
    [allowEmpty, filteredProjects],
  );
  const selectedReadiness = selectedProject ? readinessScore ?? getReadinessScore?.(selectedProject) ?? null : null;
  const selectedUpdated = formatDate(dateValue(selectedProject), locale);
  const selectorLabel = label ?? copy.selectedProject;
  const emptyLabel = emptyOptionLabel ?? copy.allProjects;
  const hasProjects = projects.length > 0;
  const isDisabled = disabled || !hasProjects;

  useEffect(() => {
    function closeOnOutside(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, []);

  useEffect(() => {
    const nextIndex = Math.max(0, optionIds.findIndex(id => id === selectedProjectId));
    setActiveIndex(nextIndex === -1 ? 0 : nextIndex);
  }, [optionIds, selectedProjectId]);

  useEffect(() => {
    if (open && projects.length > 5) window.setTimeout(() => searchRef.current?.focus(), 80);
  }, [open, projects.length]);

  const selectProject = (projectId: string) => {
    onChange(projectId);
    setOpen(false);
    setSearch('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && !open) {
      event.preventDefault();
      if (!isDisabled || allowEmpty) setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex(index => Math.min(optionIds.length - 1, index + 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex(index => Math.max(0, index - 1));
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      const next = optionIds[activeIndex];
      if (typeof next === 'string') selectProject(next);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`sfm-project-selector ${compact ? 'compact' : ''} ${className}`}
      dir={dir}
      onKeyDown={handleKeyDown}
    >
      {!hasProjects ? (
        <section className="project-selector-empty-card" aria-label={copy.emptyTitle}>
          <span className="project-selector-icon" aria-hidden="true"><FolderKanban size={20} /></span>
          <span className="project-selector-empty-copy">
            <strong>{copy.emptyTitle}</strong>
            <small>{copy.emptyDescription}</small>
          </span>
          <Link className="project-selector-action add-primary" href={addProjectHref} aria-label={copy.addProject}>
            <Plus size={16} aria-hidden="true" />
            <span>{copy.addProject}</span>
          </Link>
        </section>
      ) : (
        <>
          <button
            type="button"
            className="project-selector-card"
            aria-label={selectorLabel}
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={isDisabled && !allowEmpty}
            onClick={() => setOpen(value => !value)}
          >
            <span className="project-selector-icon" aria-hidden="true"><FolderKanban size={20} /></span>
            <span className="project-selector-main">
              <span className="project-selector-kicker">
                <span>{selectorLabel}</span>
                <b>{countLabel(projects.length, copy)}</b>
              </span>
              <strong>{selectedProject ? projectName(selectedProject, copy.unselected) : allowEmpty ? emptyLabel : copy.unselected}</strong>
              <span className="project-selector-meta">
                <em>{selectedProject ? projectType(selectedProject, copy.insufficientData) : copy.insufficientData}</em>
                <em>{selectedProject ? projectStatus(selectedProject, copy.unselected, locale) : copy.unselected}</em>
                <em>{selectedReadiness !== null && selectedReadiness !== undefined ? `${Math.round(selectedReadiness)}%` : copy.insufficientData}</em>
                {selectedUpdated && <em>{selectedUpdated}</em>}
              </span>
              {hint && <small>{hint}</small>}
            </span>
            <span className="project-selector-change">
              {copy.changeProject}
              <ChevronDown size={17} aria-hidden="true" />
            </span>
          </button>

          <div className="project-selector-actions">
            {selectedProject ? (
              <Link className="project-selector-action primary" href={openProjectHref(selectedProject.id)} aria-label={copy.openProject}>
                <span>{copy.openProject}</span>
              </Link>
            ) : (
              <button className="project-selector-action disabled" type="button" disabled aria-disabled="true">
                <span>{copy.chooseProjectFirst}</span>
              </button>
            )}
            <Link className="project-selector-action secondary" href={addProjectHref} aria-label={copy.addProject}>
              <Plus size={16} aria-hidden="true" />
              <span>{copy.addProject}</span>
            </Link>
          </div>

          {open && (
            <div className="project-selector-popover" role="dialog" aria-label={copy.availableProjects}>
              {projects.length > 5 && (
                <label className="project-selector-search">
                  <Search size={15} aria-hidden="true" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder={copy.searchPlaceholder}
                    aria-label={copy.searchPlaceholder}
                  />
                </label>
              )}
              <div className="project-selector-list" role="listbox" aria-label={copy.availableProjects}>
                {allowEmpty && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={!selectedProjectId}
                    className={`${!selectedProjectId ? 'selected' : ''} ${activeIndex === 0 ? 'active' : ''}`}
                    onMouseEnter={() => setActiveIndex(0)}
                    onClick={() => selectProject('')}
                  >
                    <span className="option-copy">
                      <strong>{emptyLabel}</strong>
                      <small>{copy.unselected}</small>
                    </span>
                    {!selectedProjectId && <CheckCircle2 size={17} aria-label={copy.selected} />}
                  </button>
                )}
                {filteredProjects.map((project, index) => {
                  const offset = allowEmpty ? 1 : 0;
                  const isSelected = project.id === selectedProjectId;
                  const optionReadiness = isSelected ? selectedReadiness : getReadinessScore?.(project) ?? null;
                  return (
                    <button
                      type="button"
                      key={project.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`${isSelected ? 'selected' : ''} ${activeIndex === index + offset ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIndex(index + offset)}
                      onClick={() => selectProject(project.id)}
                    >
                      <span className="option-copy">
                        <strong>{projectName(project, project.id)}</strong>
                        <small>
                          {projectType(project, copy.insufficientData)}
                          {' · '}
                          {projectStatus(project, copy.unselected, locale)}
                        </small>
                      </span>
                      <span className="option-badges">
                        <em>{optionReadiness !== null && optionReadiness !== undefined ? `${Math.round(optionReadiness)}%` : copy.insufficientData}</em>
                        {isSelected && <CheckCircle2 size={17} aria-label={copy.selected} />}
                      </span>
                    </button>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <p className="project-selector-empty">{copy.availableNone}</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .sfm-project-selector {
          position: relative;
          display: grid;
          gap: 12px;
          width: 100%;
          min-width: 0;
          color: var(--foreground);
          font-family: var(--font-ui);
        }

        .project-selector-empty-card,
        .project-selector-card {
          width: 100%;
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface);
          box-shadow: var(--shadow-card);
          color: var(--foreground);
        }

        .project-selector-empty-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 16px;
        }

        .project-selector-empty-copy,
        .project-selector-main,
        .option-copy {
          display: grid;
          min-width: 0;
          gap: 4px;
        }

        .project-selector-empty-copy strong,
        .project-selector-main strong,
        .option-copy strong {
          color: var(--foreground);
          font-weight: 600;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .project-selector-empty-copy small,
        .project-selector-main small,
        .option-copy small {
          color: var(--foreground-muted);
          font-weight: 400;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .project-selector-card {
          appearance: none;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 15px 16px;
          text-align: start;
          font-family: inherit;
          cursor: pointer;
          transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
        }

        .project-selector-card:hover:not(:disabled) {
          border-color: var(--primary);
          background: var(--sidebar-hover);
        }

        .project-selector-card:focus-visible,
        .project-selector-action:focus-visible,
        .project-selector-search input:focus-visible,
        .project-selector-list button:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
          box-shadow: var(--focus-shadow);
        }

        .project-selector-card:active:not(:disabled) {
          background: var(--primary-soft);
        }

        .project-selector-card:disabled {
          cursor: not-allowed;
          opacity: .58;
        }

        .project-selector-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--primary-soft);
          color: var(--primary);
        }

        .project-selector-kicker,
        .project-selector-meta,
        .option-badges {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          min-width: 0;
        }

        .project-selector-kicker span {
          color: var(--foreground-muted);
          font-size: 11px;
          font-weight: 500;
        }

        .project-selector-kicker b,
        .project-selector-meta em,
        .option-badges em {
          border: 1px solid var(--border);
          border-radius: var(--radius-pill);
          background: var(--surface-muted);
          color: var(--foreground-secondary);
          padding: 4px 7px;
          font-size: 11px;
          font-style: normal;
          font-weight: 500;
          line-height: 1.2;
          white-space: nowrap;
        }

        .project-selector-main strong {
          font-size: 16px;
        }

        .project-selector-change {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--primary);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .project-selector-actions {
          display: flex;
          align-items: stretch;
          flex-wrap: wrap;
          gap: 9px;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface-muted);
        }

        .project-selector-action {
          min-height: 44px;
          min-width: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid var(--border);
          border-radius: var(--radius-control);
          padding: 0 14px;
          font-family: var(--font-ui);
          font-size: 13px;
          font-weight: 600;
          line-height: 1.35;
          text-align: center;
          text-decoration: none;
          cursor: pointer;
          transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease, color var(--duration-fast) ease;
        }

        .project-selector-action.primary,
        .project-selector-action.add-primary {
          border-color: var(--primary);
          background: var(--primary);
          color: var(--primary-foreground);
        }

        .project-selector-action.secondary {
          background: var(--surface);
          color: var(--foreground-secondary);
        }

        .project-selector-action.disabled {
          background: var(--surface-muted);
          color: var(--foreground-subtle);
          cursor: not-allowed;
          opacity: .68;
        }

        .project-selector-action:not(.disabled):hover {
          border-color: var(--primary-hover);
          background: var(--primary-hover);
          color: var(--primary-foreground);
        }

        .project-selector-action.secondary:not(.disabled):hover {
          background: var(--sidebar-hover);
          color: var(--primary-hover);
        }

        .project-selector-popover {
          position: absolute;
          z-index: 40;
          inset-inline: 0;
          top: calc(100% + 8px);
          display: grid;
          gap: 10px;
          width: 100%;
          max-height: min(440px, 70vh);
          padding: 12px;
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-card);
          background: var(--surface-elevated);
          box-shadow: var(--shadow-popover);
          overflow: hidden;
        }

        .project-selector-search {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding-inline: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-control);
          background: var(--surface);
          color: var(--foreground-muted);
        }

        .project-selector-search:focus-within {
          border-color: var(--focus-ring);
          box-shadow: var(--focus-shadow);
        }

        .project-selector-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--foreground);
          font-family: var(--font-ui);
          font-size: 14px;
          font-weight: 400;
        }

        .project-selector-search input::placeholder {
          color: var(--foreground-subtle);
        }

        .project-selector-list {
          display: grid;
          gap: 6px;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .project-selector-list button {
          width: 100%;
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 11px 12px;
          border: 1px solid transparent;
          border-radius: var(--radius-control);
          background: transparent;
          color: var(--foreground);
          text-align: start;
          font-family: var(--font-ui);
          cursor: pointer;
        }

        .project-selector-list button:hover,
        .project-selector-list button.active {
          border-color: var(--border);
          background: var(--sidebar-hover);
        }

        .project-selector-list button.selected {
          border-color: var(--primary);
          background: var(--primary-soft);
        }

        .project-selector-list button:active {
          background: var(--surface-muted);
        }

        .option-copy strong {
          font-size: 13px;
        }

        .option-copy small {
          font-size: 11px;
        }

        .option-badges {
          justify-content: flex-end;
        }

        .option-badges em:first-child {
          color: var(--success);
          background: var(--success-soft);
        }

        .project-selector-empty {
          margin: 0;
          padding: 18px 10px;
          color: var(--foreground-muted);
          text-align: center;
          font-size: 13px;
          line-height: 1.7;
        }

        .sfm-project-selector.compact .project-selector-card {
          padding-block: 11px;
        }

        .sfm-project-selector.compact .project-selector-change span {
          display: none;
        }

        @media (max-width: 720px) {
          .project-selector-empty-card,
          .project-selector-card {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .project-selector-empty-card .project-selector-action,
          .project-selector-change {
            grid-column: 1 / -1;
            width: 100%;
          }

          .project-selector-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .project-selector-action {
            width: 100%;
          }

          .project-selector-popover {
            position: fixed;
            inset-inline: 12px;
            top: auto;
            bottom: calc(12px + env(safe-area-inset-bottom));
            width: auto;
            max-height: min(72dvh, 560px);
          }

          .project-selector-list button {
            min-height: 52px;
          }

          .option-badges {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
