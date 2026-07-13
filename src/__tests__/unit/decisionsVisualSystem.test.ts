import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const decisionsPage = readFileSync(join(process.cwd(), 'src/app/decisions/page.tsx'), 'utf8');
const decisionStyles = decisionsPage.slice(
  decisionsPage.indexOf('<style jsx global>{`'),
  decisionsPage.indexOf('`}</style>', decisionsPage.indexOf('<style jsx global>{`')),
);
const rawDepthPattern = /(?:border-radius\s*:\s*|borderRadius\s*:\s*['"`]?)(?:(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem)?(?:\s+(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))*|[^;}\n]*,\s*(?:var\([^;}\n]*,\s*)?(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))|box-shadow\s*:\s*(?!\s*(?:var\(|none\b))[^;}\n]+|boxShadow\s*:\s*(?!\s*['"`]?(?:var\(|none\b))[^,}\n]+/i;

describe('financial decisions visual-system contract', () => {
  it('uses centralized flat surfaces, typography, and semantic state roles', () => {
    expect(decisionsPage).toContain('<DashboardPageShell ariaLabel={text.title}');
    expect(decisionsPage).toContain('className="decision-benefit-shell"');
    expect(decisionStyles).toContain('font-family:var(--font-ui)');
    expect(decisionStyles).toContain('font-family:var(--font-data)');
    expect(decisionStyles).toContain('background:var(--surface)');
    expect(decisionStyles).toContain('background:var(--success-soft)');
    expect(decisionStyles).toContain('background:var(--danger-soft)');
    expect(decisionStyles).toContain('border-color:var(--warning)');
    expect(decisionStyles).toContain('box-shadow:var(--focus-shadow)');
  });

  it('contains no route-local palette, decorative gradient, direct font, or raw depth', () => {
    expect(decisionStyles).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|(?:linear|radial|conic)-gradient\(|\.dark\b|var\(--sfm-/i,
    );
    expect(decisionStyles).not.toMatch(/\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto)\b/i);
    expect(decisionStyles).not.toMatch(rawDepthPattern);
    expect(decisionStyles).not.toMatch(/font(?:-weight|):\s*(?:[89]00|[7-9][5-9]0)/);
  });

  it('lets the shared dashboard shell own workspace width and keeps responsive behavior', () => {
    expect(decisionStyles).not.toMatch(/100vw|--sidebar|margin-inline-start|margin-(?:left|right)/i);
    expect(decisionStyles).toContain('@media(max-width:1180px)');
    expect(decisionStyles).toContain('@media(max-width:720px)');
    expect(decisionStyles).toContain('@media(prefers-reduced-motion:reduce)');
  });
});
