import { CyclicalStocksNewsPage } from '@/components/cyclical-stocks/CyclicalStocksNewsPage';
import { StockCategoryScannerPanel } from '@/components/stock-categories/StockCategoryScannerPanel';

export default function CyclicalStocksPage() {
  return (
    <>
      <CyclicalStocksNewsPage />
      <StockCategoryScannerPanel category="cyclical" />
    </>
  );
}
