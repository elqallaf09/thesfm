import type {PhoneProduct,LocalizedLabel} from '../../../src/lib/mobile/resourceContract';
export const featureDirectory:Array<{id:string;label:LocalizedLabel;products:PhoneProduct[];paths:string[]}>= [
 {id:'projects',label:['مساحة المشاريع المتقدمة','Advanced projects','Projets avancés'],products:['business'],paths:['/projects','/projects/workspace']},
 {id:'reports',label:['التقارير المتخصصة والتصدير','Specialized reports and export','Rapports spécialisés et export'],products:['finance','business','investor'],paths:['/reports-center']},
 {id:'month-close',label:['الإقفال الشهري','Month close','Clôture mensuelle'],products:['finance'],paths:['/income/month-close']},
 {id:'account',label:['الأمان والفوترة والتكاملات','Security, billing and integrations','Sécurité, facturation et intégrations'],products:['finance','business','investor'],paths:['/settings/integrations','/profile/security']},
 {id:'investments',label:['مراكز الذهب والفضة والنفط والعقار','Gold, silver, oil and property','Or, argent, pétrole et immobilier'],products:['investor'],paths:['/investments/gold-silver/intelligence','/investments/real-estate/analyst','/oil-scenarios']},
 {id:'economic',label:['مركز الذكاء الاقتصادي','Economic intelligence','Intelligence économique'],products:['finance','business','investor'],paths:['/economic-intelligence','/advisors']},
 {id:'macro',label:['محاكاة السيناريوهات الاقتصادية','Economic scenario simulator','Simulateur de scénarios économiques'],products:['finance','business','investor'],paths:['/macro-simulator']},
 {id:'leadership',label:['قيادة السوق والجلسات','Market leadership and sessions','Marchés et sessions'],products:['investor'],paths:['/ai-analyst/market-leadership','/ai-analyst/markets/sessions']},
 {id:'trader',label:['مساحة التداول وسجل الأداء','Trading workspace and performance','Trading et performance'],products:['investor'],paths:['/thesfm-trader-own','/thesfm-trader-own/trade-performance','/thesfm-trader-own/trade-history']},
 {id:'services',label:['الشركات وحاسبة الإعلانات','Companies and ad calculator','Entreprises et calculateur publicitaire'],products:['finance','business','investor'],paths:['/projects/ad-calculator','/services']},
 {id:'learning',label:['التعليم والكتب','Learning and books','Formation et livres'],products:['finance','business','investor'],paths:['/ebooks','/thesfm-trader-own/education','/ai-analyst/education']},
];
