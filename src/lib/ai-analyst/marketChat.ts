import type { CanonicalAssetIdentity } from '@/domain/intelligence/contracts';

// Two strictly separate chat domains exist in this app, on two strictly
// separate endpoints:
//   - /api/projects-chat        -> 'projects' only (Projects page)
//   - /api/intelligence/chat    -> 'market' | 'finance' only (AI Analyst
//                                  Assistant tab, Market Analysis/
//                                  Investments Center handoffs)
// A live-confirmed bug showed a market-symbol question (e.g. "AAPL") answered
// by a hardcoded "planning assistant for THE SFM projects" prompt, describing
// a verified financial instrument as a software/business project. The fix is
// this explicit, fail-closed domain contract: each endpoint only ever accepts
// requests for its own domain(s) and rejects everything else before doing
// any AI call, rather than silently reusing the wrong system prompt.
export type MarketChatDomain = 'market' | 'finance';
export type ProjectsChatDomain = 'projects';
export type ChatDomain = MarketChatDomain | ProjectsChatDomain;

export const MARKET_CHAT_DOMAINS: readonly MarketChatDomain[] = ['market', 'finance'];

export class ChatDomainMismatchError extends Error {
  constructor(public readonly receivedDomain: unknown, public readonly allowedDomains: readonly string[]) {
    super(`Chat domain "${String(receivedDomain)}" is not permitted on this endpoint. Allowed: ${allowedDomains.join(', ')}.`);
    this.name = 'ChatDomainMismatchError';
  }
}

/** Fail-closed: throws unless `domain` is exactly one of `allowed`. */
export function assertChatDomain(domain: unknown, allowed: readonly string[]): asserts domain is string {
  if (typeof domain !== 'string' || !allowed.includes(domain)) {
    throw new ChatDomainMismatchError(domain, allowed);
  }
}

export type VerifiedChatAsset = Pick<
  CanonicalAssetIdentity,
  'canonicalSymbol' | 'displaySymbol' | 'name' | 'assetType' | 'exchange' | 'market' | 'quoteCurrency'
>;

export type MarketChatContext = {
  domain: MarketChatDomain;
  /** Present only once the requested symbol has been verified server-side. */
  asset: VerifiedChatAsset | null;
  /** True when a symbol was requested but could not be verified. */
  requestedUnresolvedSymbol: boolean;
  locale: 'ar' | 'en' | 'fr';
};

const BASE_INSTRUCTIONS: Record<'ar' | 'en' | 'fr', string[]> = {
  en: [
    'You are THE SFM markets and personal-finance assistant.',
    'Every conversation on this endpoint is about financial markets, financial instruments, or the user\'s personal finances -- never about a software, business, or startup project. Do not describe a financial instrument as a project, product, company you are building, or business plan.',
    'Verified asset metadata provided to you always overrides any prior project, business, or workspace context from elsewhere in the app -- never let stale context relabel a verified financial instrument as something else.',
    'Never invent or estimate a price, price target, confidence score, exchange, market, currency, or asset type that was not explicitly provided to you in this message.',
    'This is educational market/financial analysis only. It is not financial advice and does not guarantee any return or outcome.',
  ],
  ar: [
    'أنت مساعد إس إف إم للأسواق المالية والتمويل الشخصي.',
    'كل محادثة على هذا المسار تتعلق بالأسواق المالية أو الأدوات المالية أو الشؤون المالية الشخصية للمستخدم — وليست أبداً عن مشروع برمجي أو تجاري أو ناشئ. لا تصف أداة مالية بأنها مشروع أو منتج أو خطة عمل.',
    'تتجاوز بيانات الأصل الموثقة المزودة لك أي سياق سابق عن مشاريع أو أعمال من أجزاء أخرى من التطبيق — لا تسمح لسياق قديم بإعادة تصنيف أداة مالية موثقة كشيء آخر.',
    'لا تخترع أو تقدّر سعراً أو هدف سعر أو درجة ثقة أو بورصة أو سوقاً أو عملة أو نوع أصل لم يُقدَّم لك صراحة في هذه الرسالة.',
    'هذا تحليل تعليمي للأسواق أو الشؤون المالية فقط. لا يمثل استشارة مالية ولا يضمن أي عائد أو نتيجة.',
  ],
  fr: [
    'Vous êtes l’assistant SFM pour les marchés financiers et les finances personnelles.',
    'Chaque conversation sur ce point de terminaison concerne les marchés financiers, les instruments financiers ou les finances personnelles de l’utilisateur — jamais un projet logiciel, commercial ou de startup. Ne décrivez jamais un instrument financier comme un projet, un produit ou un plan d’affaires.',
    'Les métadonnées d’actif vérifiées qui vous sont fournies prévalent toujours sur tout contexte de projet ou d’entreprise antérieur provenant d’ailleurs dans l’application — ne laissez jamais un contexte obsolète requalifier un instrument financier vérifié.',
    'N’inventez ni n’estimez jamais un prix, un objectif de prix, un score de confiance, une bourse, un marché, une devise ou un type d’actif qui ne vous a pas été fourni explicitement dans ce message.',
    'Il s’agit uniquement d’une analyse éducative des marchés/finances. Ce n’est pas un conseil financier et cela ne garantit aucun rendement ni résultat.',
  ],
};

function verifiedAssetLine(asset: VerifiedChatAsset, locale: 'ar' | 'en' | 'fr') {
  const parts = [
    `${asset.name} (${asset.displaySymbol || asset.canonicalSymbol})`,
    `type=${asset.assetType}`,
    asset.exchange ? `exchange=${asset.exchange}` : null,
    asset.market ? `market=${asset.market}` : null,
    asset.quoteCurrency ? `currency=${asset.quoteCurrency}` : null,
  ].filter(Boolean).join(', ');
  if (locale === 'ar') return `الأصل الموثق لهذه المحادثة: ${parts}. عامل هذا الأصل حصراً وفق هذا التصنيف الموثق.`;
  if (locale === 'fr') return `Actif vérifié pour cette conversation : ${parts}. Traitez cet actif strictement selon cette classification vérifiée.`;
  return `Verified asset for this conversation: ${parts}. Treat this asset strictly according to this verified classification.`;
}

function unresolvedSymbolLine(locale: 'ar' | 'en' | 'fr') {
  if (locale === 'ar') return 'طلب المستخدم رمزاً لم يتمكن النظام من التحقق منه. لا تخترع هويته أو نوعه أو سعره — اطلب من المستخدم تأكيد الرمز أو تقديم تفاصيل إضافية بدلاً من ذلك.';
  if (locale === 'fr') return 'L’utilisateur a demandé un symbole que le système n’a pas pu vérifier. N’inventez pas son identité, son type ou son prix — demandez plutôt à l’utilisateur de confirmer le symbole ou de fournir plus de détails.';
  return 'The user requested a symbol the system could not verify. Do not invent its identity, type, or price -- ask the user to confirm the symbol or provide more detail instead.';
}

export function buildMarketChatSystemPrompt(context: MarketChatContext): string {
  const lines = [...BASE_INSTRUCTIONS[context.locale]];
  if (context.asset) lines.push(verifiedAssetLine(context.asset, context.locale));
  if (context.requestedUnresolvedSymbol) lines.push(unresolvedSymbolLine(context.locale));
  return lines.join(' ');
}
