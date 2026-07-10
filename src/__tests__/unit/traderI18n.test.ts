import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const traderRoot = path.join(process.cwd(), 'src', 'trader-app', 'public');
const appSource = fs.readFileSync(path.join(traderRoot, 'app.js'), 'utf8');
const detailSource = fs.readFileSync(path.join(traderRoot, 'detail.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(traderRoot, 'index.html'), 'utf8');

function parseJavaScript(source: string, filename: string) {
  return ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
}

function literalText(node: ts.Node | undefined) {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;
}

function variableInitializer(sourceFile: ts.SourceFile, name: string) {
  let initializer: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return initializer;
}

function objectInitializer(sourceFile: ts.SourceFile, name: string) {
  let initializer = variableInitializer(sourceFile, name);
  if (initializer && ts.isCallExpression(initializer)) initializer = initializer.arguments[0];
  return initializer && ts.isObjectLiteralExpression(initializer) ? initializer : undefined;
}

function objectKeys(sourceFile: ts.SourceFile, names: string[]) {
  const keys = new Set<string>();
  for (const name of names) {
    for (const property of objectInitializer(sourceFile, name)?.properties ?? []) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key = literalText(property.name);
      if (key) keys.add(key);
    }
  }
  return keys;
}

describe('trading terminal language isolation', () => {
  it('supports Arabic, English, and French in the shared terminal selector', () => {
    expect(appSource).toContain('const SUPPORTED_LANGUAGES = ["ar", "en", "fr"]');
    expect(indexSource).toContain('data-language="ar"');
    expect(indexSource).toContain('data-language="en"');
    expect(indexSource).toContain('data-language="fr"');
  });

  it('contains localized high-visibility dashboard and empty-state copy', () => {
    const required = [
      ['آخر الأخبار', 'Latest news', 'Dernières actualités'],
      ['حالة التحليل الذكي', 'AI analysis status', 'État de l’analyse IA'],
      ['حالة النظام', 'System status', 'État du système'],
      ['مزود البيانات متصل', 'Data provider connected', 'Fournisseur de données connecté'],
      ['يتم عرض بيانات السوق المباشرة بشكل طبيعي.', 'Live market data is displaying normally.', 'Les données de marché en direct s’affichent normalement.'],
      ['إعادة المحاولة', 'Retry', 'Réessayer'],
      ['صفحة الأخبار', 'News page', 'Page d’actualités'],
      ['فتح الماسح', 'Open scanner', 'Ouvrir le scanner'],
      ['تعذر تحميل البيانات حالياً', 'Unable to load data', 'Impossible de charger les données'],
    ];

    for (const translations of required) {
      for (const translation of translations) expect(appSource).toContain(translation);
    }
  });

  it('does not normalize French to Arabic or treat French as English', () => {
    expect(appSource).toContain('document.body.classList.toggle("language-fr", lang === "fr")');
    expect(appSource).toContain('if (value.startsWith("fr")) return "fr"');
    expect(appSource).not.toContain('const SUPPORTED_LANGUAGES = ["ar", "en"]');
  });

  it('keeps every static terminal fallback covered in French', () => {
    const sourceFile = parseJavaScript(appSource, 'app.js');
    const frenchKeys = objectKeys(sourceFile, ['TERMINAL_FRENCH_TEXT', 'TERMINAL_FRENCH_EXTRA']);
    const missing: string[] = [];
    const dynamicWithoutFrench: number[] = [];

    const textPairs = variableInitializer(sourceFile, 'TERMINAL_TEXT_PAIRS');
    if (textPairs && ts.isArrayLiteralExpression(textPairs)) {
      for (const row of textPairs.elements) {
        if (!ts.isArrayLiteralExpression(row) || row.elements.length >= 3) continue;
        const english = literalText(row.elements[0]);
        if (english && !frenchKeys.has(english)) missing.push(english);
      }
    }

    for (const property of objectInitializer(sourceFile, 'TERMINAL_I18N')?.properties ?? []) {
      if (!ts.isPropertyAssignment(property) || !ts.isObjectLiteralExpression(property.initializer)) continue;
      const values = new Map<string | null, string | null>();
      for (const entry of property.initializer.properties) {
        if (ts.isPropertyAssignment(entry)) values.set(literalText(entry.name), literalText(entry.initializer));
      }
      const english = values.get('en');
      if (english && !values.get('fr') && !frenchKeys.has(english)) missing.push(english);
    }

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === 'textPair' && node.arguments.length < 3) {
        const english = literalText(node.arguments[1]);
        if (english && !frenchKeys.has(english)) missing.push(english);
        if (node.arguments[1] && ts.isTemplateExpression(node.arguments[1])) {
          dynamicWithoutFrench.push(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    expect(missing).toEqual([]);
    expect(dynamicWithoutFrench).toEqual([]);
  });

  it('covers detail-page source dictionaries in French', () => {
    const sourceFile = parseJavaScript(detailSource, 'detail.js');
    const frenchKeys = objectKeys(sourceFile, ['DETAIL_FRENCH_TEXT', 'DETAIL_FRENCH_EXTRA_TEXT']);
    const missing: string[] = [];
    const dynamicWithoutFrench: number[] = [];

    for (const name of ['DETAIL_TEXT_TRANSLATIONS', 'DETAIL_EXTRA_TEXT_TRANSLATIONS', 'DETAIL_REGION_TRANSLATIONS']) {
      for (const property of objectInitializer(sourceFile, name)?.properties ?? []) {
        if (!ts.isPropertyAssignment(property)) continue;
        const english = literalText(property.initializer);
        if (english && !frenchKeys.has(english)) missing.push(english);
      }
    }

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === 'detailText' && node.arguments.length < 3 && node.arguments[1] && ts.isTemplateExpression(node.arguments[1])) {
        dynamicWithoutFrench.push(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    expect(missing).toEqual([]);
    expect(dynamicWithoutFrench).toEqual([]);
  });
});
