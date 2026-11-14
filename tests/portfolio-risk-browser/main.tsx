import { createRoot } from 'react-dom/client';
import { PortfolioRiskHistoryLive } from '@/components/investments/PortfolioRiskHistoryLive';
import { PortfolioRiskHistoryImport } from '@/components/investments/PortfolioRiskHistoryImport';
import { SyntheticAuth } from './authFixture';

const root = document.getElementById('root');
if (!root) throw new Error('Missing isolated QA root');
const locale = new URLSearchParams(window.location.search).get('locale');
const language = locale === 'en' || locale === 'fr' ? locale : 'ar';
createRoot(root).render(<SyntheticAuth><PortfolioRiskHistoryLive locale={language} /><PortfolioRiskHistoryImport locale={language} /></SyntheticAuth>);
