import {MarketLeadership} from './MarketLeadership';
import {ServicesScreen} from './ServicesScreen';
import type {PhoneProduct} from '../../../src/lib/mobile/resourceContract';
import type {MobileSessionClient} from './session';
import {ProjectWorkspace} from './ProjectWorkspace';import {SpecializedReports} from './SpecializedReports';import {MonthCloseScreen} from './MonthCloseScreen';import {InvestmentCenters} from './InvestmentCenters';import {EconomicCenter} from './EconomicCenter';import {MacroSimulator} from './MacroSimulator';import {AccountAdvanced} from './AccountAdvanced';import {TraderWorkspace} from './TraderWorkspace';import {LearningLibrary} from './LearningLibrary';
export function ExtendedWorkspace({feature,client,product,base}:{feature:string;client:MobileSessionClient;product:PhoneProduct;base:string}){
 if(feature==='projects'&&product==='business')return <ProjectWorkspace client={client}/>;
 if(feature==='reports')return <SpecializedReports client={client} product={product}/>;
 if(feature==='month-close'&&product==='finance')return <MonthCloseScreen client={client}/>;
 if(feature==='investments'&&product==='investor')return <InvestmentCenters client={client}/>;
 if(feature==='economic')return <EconomicCenter client={client}/>;
 if(feature==='macro')return <MacroSimulator/>;
 if(feature==='account')return <AccountAdvanced client={client}/>;
 if(feature==='leadership'&&product==='investor')return <MarketLeadership client={client}/>;
 if(feature==='trader'&&product==='investor')return <TraderWorkspace client={client}/>;
 if(feature==='services')return <ServicesScreen client={client} business={product==='business'}/>;
 if(feature==='learning')return <LearningLibrary base={base}/>;
 return null;
}
