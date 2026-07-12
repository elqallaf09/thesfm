import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const modalDirectory = join(projectRoot, 'src/app/charity-projects');
const modalFiles = [
  '_ProjectModal.tsx',
  '_DocumentModal.tsx',
  '_ContributorModal.tsx',
  '_BeneficiaryModal.tsx',
  '_ReminderModal.tsx',
];
const modalSources = modalFiles.map(file => readFileSync(join(modalDirectory, file), 'utf8'));
const accessibleDialog = readFileSync(join(modalDirectory, '_AccessibleDialog.tsx'), 'utf8');

describe('charity modal accessibility regression guard', () => {
  it('routes every custom modal through the shared accessible dialog behavior', () => {
    modalSources.forEach(source => {
      expect(source).toContain("import { AccessibleDialog } from './_AccessibleDialog'");
      expect(source).toContain('<AccessibleDialog');
      expect(source).not.toContain('role="dialog"');
    });

    expect(modalSources.join('').match(/<AccessibleDialog/g)).toHaveLength(6);
  });

  it('keeps the dialog named, modal, and programmatically focusable', () => {
    expect(accessibleDialog).toContain('role="dialog"');
    expect(accessibleDialog).toContain('aria-modal="true"');
    expect(accessibleDialog).toContain('aria-labelledby={labelledBy}');
    expect(accessibleDialog).toContain('tabIndex={-1}');
  });

  it('manages the complete keyboard focus lifecycle', () => {
    expect(accessibleDialog).toContain('document.activeElement instanceof HTMLElement');
    expect(accessibleDialog).toContain('focusableElements(dialog)[0] ?? dialog');
    expect(accessibleDialog).toContain("event.key === 'Escape'");
    expect(accessibleDialog).toContain("event.key !== 'Tab'");
    expect(accessibleDialog).toContain('event.shiftKey');
    expect(accessibleDialog).toContain('previousFocus?.isConnected');
    expect(accessibleDialog).toContain('previousFocus.focus()');
    expect(accessibleDialog).toContain('sibling.inert = true');
    expect(accessibleDialog).toContain("sibling.setAttribute('aria-hidden', 'true')");
    expect(accessibleDialog).toContain('element.inert = inert');
  });
});
