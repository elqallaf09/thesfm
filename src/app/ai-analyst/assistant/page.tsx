import { AiAnalystChat } from '@/components/ai-analyst/AiAnalystChat';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';
import { normalizeAiAnalystAssetType, normalizeAiAnalystSymbol } from '@/lib/ai-analyst/legacyRoutes';

type PageProps = {
  searchParams: Promise<{
    symbol?: string | string[];
    assetType?: string | string[];
  }>;
};

function single(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined;
}

export default async function AiAnalystAssistantPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const symbol = normalizeAiAnalystSymbol(single(query.symbol)) ?? undefined;
  // assetType only means anything once a symbol is actually present — a
  // bare, unverified assetType with no symbol would have nothing to
  // classify, so it is deliberately dropped in that case rather than
  // forwarded to the chat request.
  const assetType = symbol ? normalizeAiAnalystAssetType(single(query.assetType)) : undefined;

  return (
    <AiAnalystShell activeTab="assistant">
      <AiAnalystChat symbol={symbol} assetType={assetType} />
    </AiAnalystShell>
  );
}
