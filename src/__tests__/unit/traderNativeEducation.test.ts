import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TRADER_EDUCATION_COPY,
  TRADER_LESSON_CATEGORIES,
} from '@/app/thesfm-trader-own/education/_content';

const root = process.cwd();
const layoutSource = readFileSync(resolve(root, 'src/app/thesfm-trader-own/layout.tsx'), 'utf8');
const routeStageSource = readFileSync(resolve(root, 'src/app/thesfm-trader-own/TraderRouteStage.tsx'), 'utf8');
const pageSource = readFileSync(resolve(root, 'src/app/thesfm-trader-own/education/page.tsx'), 'utf8');

describe('native Trader education canary', () => {
  it('keeps rollback server-controlled and preserves the protected URL', () => {
    expect(layoutSource).toContain("process.env.TRADER_NATIVE_EDUCATION_ENABLED === 'true'");
    expect(routeStageSource).toContain("const NATIVE_EDUCATION_PATH = '/thesfm-trader-own/education'");
    expect(routeStageSource).toContain('renderNativeEducation ? <>{children}</> : <TraderShellPage />');
  });

  it('ships the same complete lesson set in Arabic, English, and French', () => {
    const lessons = TRADER_LESSON_CATEGORIES.flatMap(category => category.lessons);
    expect(TRADER_LESSON_CATEGORIES).toHaveLength(4);
    expect(lessons).toHaveLength(11);
    for (const value of [
      ...Object.values(TRADER_EDUCATION_COPY),
      ...TRADER_LESSON_CATEGORIES.flatMap(category => [
        category.title,
        ...category.lessons.flatMap(lesson => [lesson.title, lesson.body]),
      ]),
    ]) {
      expect(value.ar.trim()).not.toBe('');
      expect(value.en.trim()).not.toBe('');
      expect(value.fr.trim()).not.toBe('');
    }
  });

  it('uses native semantic controls without embedding another frame', () => {
    expect(pageSource).toContain('<details');
    expect(pageSource).toContain('<summary>');
    expect(pageSource).toContain('role="note"');
    expect(pageSource).not.toMatch(/<iframe\b|dangerouslySetInnerHTML/);
  });
});
