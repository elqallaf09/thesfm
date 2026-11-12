import { createRoot } from 'react-dom/client';
import { PortfolioRiskHistoryLive } from '@/components/investments/PortfolioRiskHistoryLive';
import { SyntheticAuth } from './authFixture';

const root = document.getElementById('root');
if (!root) throw new Error('Missing isolated QA root');
createRoot(root).render(<SyntheticAuth><PortfolioRiskHistoryLive locale="ar" /></SyntheticAuth>);
