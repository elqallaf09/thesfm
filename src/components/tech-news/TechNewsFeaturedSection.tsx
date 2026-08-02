'use client';

import { Sparkles } from 'lucide-react';
import type { ComponentProps } from 'react';
import type { TechNewsItem } from '@/lib/market/fetchTechNews';
import { TechNewsCard } from '@/components/tech-news/TechNewsCard';
import { TechNewsEvidence, type EvidenceLabels } from '@/components/tech-news/TechNewsEvidence';

type CardLabels = ComponentProps<typeof TechNewsCard>['labels'];

type TechNewsFeaturedSectionProps = {
  items: TechNewsItem[];
  labels: { title: string; lead: string; openArticle: string; readMore: string; linkUnavailable: string };
  cardLabels: CardLabels;
  evidenceLabels: EvidenceLabels;
  formatDateTime: (value: string) => string;
  formatPrice: (value: number | null) => string;
};

export function TechNewsFeaturedSection({
  items,
  labels,
  cardLabels,
  evidenceLabels,
  formatDateTime,
  formatPrice,
}: TechNewsFeaturedSectionProps) {
  const [lead, ...secondaryItems] = items;
  if (!lead) return null;

  return (
    <section className="tech-news-featured" aria-label={labels.title}>
      <div className="tech-news-featured-head">
        <h2>{labels.title}</h2>
        <span>
          <Sparkles size={16} />
          {labels.lead}
        </span>
      </div>
      <div className="tech-news-featured-grid">
        <div className="tech-news-evidence-card">
          <TechNewsCard
            item={lead}
            variant="lead"
            labels={cardLabels}
            formatDateTime={formatDateTime}
            formatPrice={formatPrice}
          />
          <TechNewsEvidence item={lead} labels={evidenceLabels} />
        </div>
        {secondaryItems.length > 0 ? (
          <div className="tech-news-featured-side">
            {secondaryItems.map(item => (
              <div className="tech-news-evidence-card" key={item.id}>
                <TechNewsCard
                  item={item}
                  variant="secondary"
                  labels={cardLabels}
                  formatDateTime={formatDateTime}
                  formatPrice={formatPrice}
                />
                <TechNewsEvidence item={item} labels={evidenceLabels} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default TechNewsFeaturedSection;
