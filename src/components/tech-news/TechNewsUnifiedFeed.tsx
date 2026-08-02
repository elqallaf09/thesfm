'use client';

import type { ComponentProps } from 'react';
import type { TechNewsItem } from '@/lib/market/fetchTechNews';
import { TechNewsCard } from '@/components/tech-news/TechNewsCard';
import { TechNewsEvidence, type EvidenceLabels } from '@/components/tech-news/TechNewsEvidence';

type CardLabels = ComponentProps<typeof TechNewsCard>['labels'];

type TechNewsUnifiedFeedProps = {
  items: TechNewsItem[];
  viewMode: 'grid' | 'list';
  label: string;
  cardLabels: CardLabels;
  evidenceLabels: EvidenceLabels;
  formatDateTime: (value: string) => string;
  formatPrice: (value: number | null) => string;
};

function EvidenceCard({
  item,
  variant,
  cardLabels,
  evidenceLabels,
  formatDateTime,
  formatPrice,
}: {
  item: TechNewsItem;
  variant: ComponentProps<typeof TechNewsCard>['variant'];
  cardLabels: CardLabels;
  evidenceLabels: EvidenceLabels;
  formatDateTime: (value: string) => string;
  formatPrice: (value: number | null) => string;
}) {
  return (
    <div className="tech-news-evidence-card" data-news-id={item.id}>
      <TechNewsCard
        item={item}
        variant={variant}
        labels={cardLabels}
        formatDateTime={formatDateTime}
        formatPrice={formatPrice}
      />
      <TechNewsEvidence item={item} labels={evidenceLabels} />
    </div>
  );
}

export function TechNewsUnifiedFeed({
  items,
  viewMode,
  label,
  cardLabels,
  evidenceLabels,
  formatDateTime,
  formatPrice,
}: TechNewsUnifiedFeedProps) {
  const [lead, ...remainingItems] = items;
  if (!lead) return null;

  const secondaryItems = remainingItems.slice(0, 2);
  const standardItems = remainingItems.slice(2);

  return (
    <section className="tech-news-feed tech-news-unified-feed" aria-label={label} data-testid="tech-news-unified-feed">
      <div className="tech-news-editorial-grid">
        <EvidenceCard
          item={lead}
          variant="lead"
          cardLabels={cardLabels}
          evidenceLabels={evidenceLabels}
          formatDateTime={formatDateTime}
          formatPrice={formatPrice}
        />
        {secondaryItems.length > 0 ? (
          <div className="tech-news-secondary-stack">
            {secondaryItems.map(item => (
              <EvidenceCard
                key={item.id}
                item={item}
                variant="secondary"
                cardLabels={cardLabels}
                evidenceLabels={evidenceLabels}
                formatDateTime={formatDateTime}
                formatPrice={formatPrice}
              />
            ))}
          </div>
        ) : null}
      </div>

      {standardItems.length > 0 ? (
        <div className={`tech-news-standard-results ${viewMode}`}>
          {standardItems.map(item => (
            <EvidenceCard
              key={item.id}
              item={item}
              variant={viewMode === 'list' ? 'compact' : 'standard'}
              cardLabels={cardLabels}
              evidenceLabels={evidenceLabels}
              formatDateTime={formatDateTime}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default TechNewsUnifiedFeed;
