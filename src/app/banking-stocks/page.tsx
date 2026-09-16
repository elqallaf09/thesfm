import { BankNewsPage } from '@/components/banking-stocks/BankNewsPage';
import { StockCategoryScannerPanel } from '@/components/stock-categories/StockCategoryScannerPanel';

export default function BankingStocksPage() {
  return (
    <>
      <BankNewsPage />
      <StockCategoryScannerPanel category="banking" />
    </>
  );
}
