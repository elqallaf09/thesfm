import { DefensiveStocksNewsPage } from '@/components/defensive-stocks/DefensiveStocksNewsPage';
import { StockCategoryScannerPanel } from '@/components/stock-categories/StockCategoryScannerPanel';

export default function DefensiveStocksPage() {
  return (
    <>
      <DefensiveStocksNewsPage />
      <StockCategoryScannerPanel category="defensive" />
    </>
  );
}
