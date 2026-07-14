import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  WORKSPACE_PAGE_CONTAINER_VARIANTS,
  WorkspacePageContainer,
} from '@/components/layout/WorkspacePageContainer';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const componentSource = read('src/components/layout/WorkspacePageContainer.tsx');
const containerStyles = read('src/components/layout/WorkspacePageContainer.module.css');
const tokens = read('src/styles/tokens.css');

describe('WorkspacePageContainer', () => {
  it.each(WORKSPACE_PAGE_CONTAINER_VARIANTS)(
    'renders the %s layout variant as an explicit route-selected policy',
    variant => {
      const markup = renderToStaticMarkup(
        <WorkspacePageContainer variant={variant}>Content</WorkspacePageContainer>,
      );

      expect(markup).toContain('data-workspace-page-container="true"');
      expect(markup).toContain(`data-workspace-page-variant="${variant}"`);
      expect(markup).toContain('Content');
    },
  );

  it('defaults to standard and supports semantic landmarks and custom classes', () => {
    const markup = renderToStaticMarkup(
      <WorkspacePageContainer as="main" className="route-layout" aria-label="Workspace content" />,
    );

    expect(markup).toMatch(/^<main/);
    expect(markup).toContain('data-workspace-page-variant="standard"');
    expect(markup).toContain('route-layout');
    expect(markup).toContain('aria-label="Workspace content"');
  });

  it('defines centralized responsive width and spacing tokens', () => {
    expect(tokens).toContain('--workspace-page-max-full: none;');
    expect(tokens).toContain('--workspace-page-max-wide: 100rem;');
    expect(tokens).toContain('--workspace-page-max-standard: 80rem;');
    expect(tokens).toContain('--workspace-page-max-reading: 52rem;');
    expect(tokens).toMatch(/--workspace-page-padding-inline:\s*clamp\(/);
    expect(tokens).toMatch(/--workspace-page-padding-block:\s*clamp\(/);
    expect(tokens).toMatch(/--workspace-page-section-gap:\s*clamp\(/);
  });

  it('uses logical sizing and spacing without coupling pages to shell geometry', () => {
    expect(containerStyles).toContain('inline-size: 100%');
    expect(containerStyles).toContain('min-inline-size: 0');
    expect(containerStyles).toContain('margin-inline: auto');
    expect(containerStyles).toContain('padding-inline: var(--workspace-page-padding-inline)');
    expect(containerStyles).toContain('padding-block: var(--workspace-page-padding-block)');

    for (const variant of WORKSPACE_PAGE_CONTAINER_VARIANTS) {
      expect(containerStyles).toContain(`.${variant} {`);
      expect(containerStyles).toContain(
        `max-inline-size: var(--workspace-page-max-${variant})`,
      );
    }

    const implementation = `${componentSource}\n${containerStyles}`;
    expect(implementation).not.toMatch(/100vw|calc\(\s*100v[wi]|translateX|margin-(?:left|right)/i);
    expect(implementation).not.toMatch(/--sidebar-w|--sidebar-width|padding-(?:left|right)/i);
  });
});
