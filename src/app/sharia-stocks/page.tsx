import { ShariahStocksNewsPage } from '@/components/shariah-stocks/ShariahStocksNewsPage';
import { StockCategoryScannerPanel } from '@/components/stock-categories/StockCategoryScannerPanel';

export default function ShariaStocksPage() {
  return (
    <>
      <ShariahStocksNewsPage />
      <StockCategoryScannerPanel category="sharia" />
    </>
  );
}
