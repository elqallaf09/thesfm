import { toNum } from './projectModel';
export const feasibilityFields = {"market": ["marketSize", "targetCustomers", "problemSolved", "competitors", "competitiveAdvantage", "pricingStrategy", "acquisitionChannels"], "technical": ["requiredResources", "requiredTechnology", "operationalSetup", "keySuppliers", "teamSize", "implementationChallenges"], "financial": ["requiredCapital", "capex", "monthlyOpex", "expectedMonthlyRevenue", "expectedProfitMargin", "breakEvenPoint", "paybackPeriod"], "legal": ["targetCountry", "licenseType", "governmentEntities", "legalRequirements", "insuranceObligations", "legalNotes"]} as const;
export type StudySection = keyof typeof feasibilityFields;
export type Study = Record<StudySection, Record<string,string>>;
export const emptyStudy = (): Study => ({market:{},technical:{},financial:{},legal:{}});
export function scoreStudy(study: Study) {
 const weights = {market:25, technical:20, financial:35, legal:20};
 const capital=toNum(study.financial.requiredCapital), capex=toNum(study.financial.capex), opex=toNum(study.financial.monthlyOpex), revenue=toNum(study.financial.expectedMonthlyRevenue);
 const profit=revenue-opex, payback=capex>0&&profit>0?capex/profit:null;
 const hasInput=[capital,capex,opex,revenue].some(v=>v>0);
 let score=Object.entries(feasibilityFields).reduce((sum,[section,fields])=>sum+fields.filter(k=>study[section as StudySection][k]?.trim()).length/fields.length*weights[section as StudySection],0);
 if(hasInput&&profit<=0) score-=15; if(payback!==null&&payback>36) score-=10; if(capital<=0)score-=10;
 score=Math.round(Math.max(0,Math.min(100,score)));
 return {score,status:score<50||(hasInput&&profit<=0)?'high_risk':score<75||(payback!==null&&payback>36)?'needs_review':'feasible',profit,payback,roi:capital>0?profit*12/capital*100:null};
}
