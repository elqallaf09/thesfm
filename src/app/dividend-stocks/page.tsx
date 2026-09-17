import { DividendStocksNewsPage } from '@/components/dividend-stocks/DividendStocksNewsPage';
import { StockCategoryScannerPanel } from '@/components/stock-categories/StockCategoryScannerPanel';

export default function DividendStocksPage() {
  return (
    <>
      <DividendStocksNewsPage />
      <StockCategoryScannerPanel category="dividend" />
    </>
  );
}
