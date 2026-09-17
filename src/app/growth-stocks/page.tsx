import { GrowthStocksNewsPage } from '@/components/growth-stocks/GrowthStocksNewsPage';
import { StockCategoryScannerPanel } from '@/components/stock-categories/StockCategoryScannerPanel';

export default function GrowthStocksPage() {
  return (
    <>
      <GrowthStocksNewsPage />
      <StockCategoryScannerPanel category="growth" />
    </>
  );
}
