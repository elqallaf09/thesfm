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
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
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
            {copy.addProject}
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
                {copy.openProject}
              </Link>
            ) : (
              <button className="project-selector-action disabled" type="button" disabled aria-disabled="true">
                {copy.chooseProjectFirst}
              </button>
            )}
            <Link className="project-selector-action secondary" href={addProjectHref} aria-label={copy.addProject}>
              <Plus size={16} aria-hidden="true" />
              {copy.addProject}
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
          gap: 10px;
          min-width: 0;
          width: 100%;
          z-index: 30;
        }
        .project-selector-empty-card {
          width: 100%;
          min-width: 0;
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: 24px;
          background:
            radial-gradient(circle at 12% 0%, rgba(167, 243, 240, .24), transparent 30%),
            linear-gradient(135deg, #FFFFFF, var(--sfm-light-card));
          color: var(--sfm-primary-dark);
          padding: 18px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          text-align: start;
          font-family: Tajawal, Arial, sans-serif;
          box-shadow: 0 16px 42px rgba(3, 18, 37, .08);
        }
        .project-selector-empty-copy {
          min-width: 0;
          display: grid;
          gap: 6px;
        }
        .project-selector-empty-copy strong {
          color: var(--sfm-primary-dark);
          font-size: clamp(18px, 2vw, 23px);
          line-height: 1.25;
          font-weight: 950;
        }
        .project-selector-empty-copy small {
          color: var(--sfm-muted-readable, #475569);
          font-size: 13px;
          line-height: 1.65;
          font-weight: 850;
        }
        .project-selector-card {
          width: 100%;
          min-width: 0;
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: 22px;
          background:
            radial-gradient(circle at 12% 0%, rgba(167, 243, 240, .22), transparent 28%),
            linear-gradient(135deg, #FFFFFF, var(--sfm-light-card));
          color: var(--sfm-primary-dark);
          padding: 15px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 13px;
          align-items: center;
          text-align: start;
          font-family: Tajawal, Arial, sans-serif;
          cursor: pointer;
          box-shadow: 0 16px 40px rgba(3, 18, 37, .08);
          transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease, background .18s ease;
        }
        .project-selector-card:hover,
        .project-selector-card:focus-visible {
          border-color: rgba(24, 212, 212, .48);
          box-shadow: 0 18px 48px rgba(29, 140, 255, .16), 0 0 0 3px rgba(24, 212, 212, .12);
          transform: translateY(-1px);
          outline: none;
        }
        .project-selector-card:active {
          transform: translateY(0) scale(.995);
        }
        .project-selector-card:disabled {
          cursor: not-allowed;
          opacity: .78;
          transform: none;
          box-shadow: 0 10px 28px rgba(3, 18, 37, .06);
        }
        .project-selector-icon {
          width: 48px;
          height: 48px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, rgba(29, 140, 255, .15), rgba(24, 212, 212, .16));
          color: var(--sfm-primary);
          border: 1px solid rgba(29, 140, 255, .14);
        }
        .project-selector-main {
          min-width: 0;
          display: grid;
          gap: 7px;
        }
        .project-selector-kicker {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
        }
        .project-selector-kicker span {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }
        .project-selector-kicker b {
          flex: 0 0 auto;
          border-radius: 999px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary-hover);
          border: 1px solid rgba(29, 140, 255, .14);
          padding: 5px 8px;
          font-size: 11px;
          line-height: 1;
          font-weight: 950;
        }
        .project-selector-main strong {
          color: var(--sfm-primary-dark);
          font-size: clamp(17px, 2vw, 22px);
          line-height: 1.25;
          font-weight: 950;
          overflow-wrap: anywhere;
        }
        .project-selector-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          min-width: 0;
        }
        .project-selector-meta em {
          font-style: normal;
          border-radius: 999px;
          background: #FFFFFF;
          color: var(--sfm-muted-readable, #475569);
          border: 1px solid rgba(29, 140, 255, .12);
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 900;
          line-height: 1;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .project-selector-main small {
          color: var(--sfm-muted-readable, #475569);
          font-size: 12px;
          line-height: 1.55;
          font-weight: 850;
        }
        .project-selector-change {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 999px;
          color: #FFFFFF;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          padding: 9px 11px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
          box-shadow: 0 12px 28px rgba(29, 140, 255, .22);
        }
        .project-selector-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          min-width: 0;
        }
        .project-selector-action {
          min-height: 42px;
          border: 1px solid transparent;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 15px;
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
          line-height: 1.2;
          white-space: nowrap;
          cursor: pointer;
          font-family: Tajawal, Arial, sans-serif;
          transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease, color .18s ease;
        }
        .project-selector-action.primary {
          border-color: transparent;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 14px 30px rgba(29, 140, 255, .20);
        }
        .project-selector-action.add-primary {
          min-height: 48px;
          border-radius: 18px;
          padding: 0 20px;
          border-color: rgba(24, 212, 212, .22);
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 14px 32px rgba(29, 140, 255, .22);
        }
        .project-selector-action.disabled {
          border: 1px solid rgba(29, 140, 255, .18);
          background: #F1F5F9;
          color: #64748B;
          box-shadow: none;
          cursor: not-allowed;
          opacity: 1;
        }
        .project-selector-action.secondary {
          border: 1px solid rgba(24, 212, 212, .40);
          background: rgba(236, 254, 255, .72);
          color: #0E7490;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .38);
        }
        .project-selector-action svg {
          flex: 0 0 auto;
        }
        .project-selector-action:not(.disabled):hover {
          transform: translateY(-1px);
        }
        .project-selector-action.primary:not(.disabled):hover,
        .project-selector-action.add-primary:hover {
          box-shadow: 0 16px 36px rgba(29, 140, 255, .26);
          filter: saturate(1.06);
        }
        .project-selector-action.secondary:hover {
          background: rgba(207, 250, 254, .92);
          border-color: rgba(24, 212, 212, .58);
          color: #155E75;
          box-shadow: 0 12px 28px rgba(14, 116, 144, .12);
        }
        .project-selector-action:not(.disabled):active {
          transform: translateY(0) scale(.985);
        }
        .project-selector-action:focus-visible {
          outline: none;
          border-color: rgba(24, 212, 212, .38);
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .18);
        }
        :global(.dark) .project-selector-empty-card {
          border-color: rgba(103, 232, 249, .18);
          background:
            radial-gradient(circle at 12% 0%, rgba(34, 211, 238, .16), transparent 30%),
            linear-gradient(135deg, rgba(15, 29, 49, .96), rgba(19, 36, 58, .88));
          color: #E8EEF6;
          box-shadow: 0 18px 48px rgba(0, 0, 0, .28);
        }
        :global(.dark) .project-selector-empty-copy strong {
          color: #E8EEF6;
        }
        :global(.dark) .project-selector-empty-copy small {
          color: #B8C7D9;
        }
        :global(.dark) .project-selector-action.disabled {
          border-color: rgba(255, 255, 255, .14);
          background: rgba(255, 255, 255, .06);
          color: rgba(232, 238, 246, .72);
        }
        :global(.dark) .project-selector-action.secondary {
          border-color: rgba(103, 232, 249, .38);
          background: rgba(6, 182, 212, .10);
          color: #CFFAFE;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .04);
        }
        :global(.dark) .project-selector-action.add-primary {
          border-color: rgba(103, 232, 249, .46);
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #ECFEFF;
          box-shadow: 0 14px 30px rgba(6, 182, 212, .12);
        }
        :global(.dark) .project-selector-action.secondary:hover {
          border-color: rgba(103, 232, 249, .56);
          background: rgba(34, 211, 238, .15);
          color: #ECFEFF;
          box-shadow: 0 12px 28px rgba(6, 182, 212, .14);
        }
        :global(.dark) .project-selector-action.add-primary:hover {
          border-color: rgba(103, 232, 249, .62);
          box-shadow: 0 16px 36px rgba(6, 182, 212, .18);
        }
        .project-selector-popover {
          position: absolute;
          z-index: 80;
          inset-inline: 0;
          top: calc(100% + 10px);
          border-radius: 22px;
          border: 1px solid rgba(29, 140, 255, .18);
          background: rgba(255, 255, 255, .98);
          box-shadow: 0 24px 70px rgba(3, 18, 37, .22);
          padding: 10px;
          display: grid;
          gap: 9px;
          max-height: min(460px, 70dvh);
          overflow: auto;
        }
        .project-selector-search {
          position: relative;
          min-width: 0;
          display: block;
        }
        .project-selector-search svg {
          position: absolute;
          inset-inline-start: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--sfm-primary);
        }
        .project-selector-search input {
          width: 100%;
          min-width: 0;
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: 14px;
          min-height: 42px;
          background: var(--sfm-light-card);
          color: var(--sfm-primary-dark);
          padding: 0 12px;
          padding-inline-start: 38px;
          font: 900 13px Tajawal, Arial, sans-serif;
          outline: none;
        }
        .project-selector-search input:focus {
          border-color: var(--sfm-accent);
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .14);
        }
        .project-selector-list {
          display: grid;
          gap: 8px;
        }
        .project-selector-list button {
          width: 100%;
          min-width: 0;
          border: 1px solid rgba(29, 140, 255, .12);
          border-radius: 16px;
          background: var(--sfm-light-card);
          color: var(--sfm-primary-dark);
          padding: 11px 12px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          text-align: start;
          font-family: Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        .project-selector-list button:hover,
        .project-selector-list button:focus-visible,
        .project-selector-list button.active,
        .project-selector-list button.selected {
          outline: none;
          background: rgba(29, 140, 255, .08);
          border-color: rgba(24, 212, 212, .36);
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .10);
        }
        .project-selector-list button:active {
          transform: scale(.995);
        }
        .option-copy {
          min-width: 0;
          display: grid;
          gap: 5px;
        }
        .option-copy strong {
          color: var(--sfm-primary-dark);
          font-size: 14px;
          font-weight: 950;
          overflow-wrap: anywhere;
        }
        .option-copy small {
          color: var(--sfm-muted-readable, #475569);
          font-size: 12px;
          font-weight: 850;
          overflow-wrap: anywhere;
        }
        .option-badges {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
          color: var(--sfm-primary);
        }
        .option-badges em {
          font-style: normal;
          border-radius: 999px;
          background: #FFFFFF;
          border: 1px solid rgba(29, 140, 255, .14);
          color: var(--sfm-primary-hover);
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }
        .project-selector-empty {
          margin: 0;
          border: 1px dashed rgba(29, 140, 255, .22);
          border-radius: 16px;
          background: var(--sfm-light-card);
          color: var(--sfm-muted-readable, #475569);
          padding: 16px;
          text-align: center;
          font-weight: 900;
        }
        .sfm-project-selector.compact .project-selector-card {
          padding: 12px;
          grid-template-columns: auto minmax(0, 1fr);
        }
        .sfm-project-selector.compact .project-selector-change {
          grid-column: 1 / -1;
          width: max-content;
        }
        @media (max-width: 720px) {
          .project-selector-empty-card {
            grid-template-columns: auto minmax(0, 1fr);
            border-radius: 22px;
            padding: 15px;
          }
          .project-selector-empty-card .project-selector-action {
            grid-column: 1 / -1;
            width: 100%;
          }
          .project-selector-card {
            grid-template-columns: auto minmax(0, 1fr);
            border-radius: 20px;
          }
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
            min-height: 44px;
            white-space: normal;
          }
          .project-selector-popover {
            position: fixed;
            inset-inline: 12px;
            top: auto;
            bottom: calc(12px + env(safe-area-inset-bottom));
            max-height: min(76dvh, 620px);
            border-radius: 24px 24px 18px 18px;
          }
          .project-selector-list button {
            grid-template-columns: 1fr;
          }
          .option-badges {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
