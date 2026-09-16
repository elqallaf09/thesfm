import { EnergyNewsPage } from '@/components/energy-stocks/EnergyNewsPage';
import { StockCategoryScannerPanel } from '@/components/stock-categories/StockCategoryScannerPanel';

export default function EnergyStocksPage() {
  return (
    <>
      <EnergyNewsPage />
      <StockCategoryScannerPanel category="energy" />
    </>
  );
}
