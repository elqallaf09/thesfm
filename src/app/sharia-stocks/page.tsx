import { ShariahStocksNewsPage } from '@/components/shariah-stocks/ShariahStocksNewsPage';
import { BoubyanReferencePanel } from '@/components/shariah-stocks/BoubyanReferencePanel';
import { StockCategoryScannerPanel } from '@/components/stock-categories/StockCategoryScannerPanel';

export default function ShariaStocksPage() {
  return (
    <>
      <BoubyanReferencePanel />
      <ShariahStocksNewsPage />
      <StockCategoryScannerPanel category="sharia" />
    </>
  );
}
