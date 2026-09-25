import { describe,it,expect } from 'vitest';
import { ADVISOR_CAPABILITIES,advisorRequestSchema,buildCapabilityReport,simulateDebtPayoff,type AdvisorSource } from '@/domain/economic-intelligence/advisorCapabilities';
import { advisorSourceFromRows } from '@/domain/economic-intelligence/advisorSource';
const source:AdvisorSource={income:1000,expenses:500,savings:3000,holdings:[{id:'a',name:'A',value:1000},{id:'b',name:'B',value:3000}],debts:[{id:'d',balance:1000,payment:100,monthlyRate:0}],goals:[{id:'g',name:'Goal',target:1200,saved:0,months:12}],spending:[{category:'food',amount:500}],missing:[],excluded:0};
const input=(capability:typeof ADVISOR_CAPABILITIES[number])=>advisorRequestSchema.parse({capability,currency:'KWD',month:'2026-09'});
const value=(capability:typeof ADVISOR_CAPABILITIES[number],key:string)=>buildCapabilityReport(input(capability),source).metrics.find(m=>m.key===key)?.value;
describe('ten financial capability reports',()=>{
 it.each(ADVISOR_CAPABILITIES)('%s exposes provenance, inputs and limits',id=>{const report=buildCapabilityReport(input(id),source);expect(report.methodology).toBe('sfm-advisor-v1');expect(report.assumptions.currency).toBe('KWD');expect(report.metrics.length).toBeGreaterThan(1);expect(report.warnings).toContain('simulation_not_prediction');});
 it('uses cash constraints for the coach and investment capacity',()=>{expect(value('coach','monthly_surplus')).toBe(400);expect(value('coach','reserve_gap')).toBe(600);expect(value('coach','reserve_completion_months')).toBe(2);expect(value('investment','capital_above_reserve')).toBe(0);});
 it('separates allocation from return forecasts',()=>{expect(value('portfolio','largest_holding_percent')).toBe(75);expect(value('wealth','recorded_net_worth')).toBe(6000);});
 it('calculates zero-return retirement without division by zero',()=>{const r=buildCapabilityReport({...input('retirement'),retirementSpending:500,retirementYears:20,monthlyContribution:100,horizonMonths:120},source);expect(r.metrics.find(m=>m.key==='retirement_required')?.value).toBe(120000);expect(r.metrics.find(m=>m.key==='projected_real_assets')?.value).toBe(19000);});
 it('compares goals against available cash and detects missing deadlines',()=>{expect(value('goals','goal_monthly_required')).toBe(100);const r=buildCapabilityReport(input('goals'),{...source,goals:[{...source.goals[0],months:null}]});expect(r.metrics.find(m=>m.key==='goal_monthly_required')?.value).toBeNull();});
 it('does not invent income, savings, debt rates, or an amortization end date',()=>{const r=buildCapabilityReport(input('risk'),{...source,income:null,savings:null});expect(r.metrics.find(m=>m.key==='monthly_surplus')?.value).toBeNull();expect(simulateDebtPayoff([{id:'d',balance:10000,payment:10,monthlyRate:0.1}],0,'avalanche')).toBeNull();expect(simulateDebtPayoff([{...source.debts[0],monthlyRate:null}],0,'avalanche')).toBeNull();});
 it('reallocates paid-off minimums and extra payment without creating cash',()=>{const debts=[{id:'a',balance:500,payment:100,monthlyRate:0.02},{id:'b',balance:1000,payment:100,monthlyRate:0.01}];const a=simulateDebtPayoff(debts,100,'avalanche')!;const s=simulateDebtPayoff(debts,100,'snowball')!;expect(a.months).toBe(6);expect(a.interest).toBeLessThanOrEqual(s.interest);expect(simulateDebtPayoff(source.debts,0,'avalanche')).toEqual({months:10,interest:0});});
 it('rejects excessive or non-finite assumptions',()=>{expect(advisorRequestSchema.safeParse({...input('retirement'),horizonMonths:601}).success).toBe(false);expect(advisorRequestSchema.safeParse({...input('planner'),annualReturn:Infinity}).success).toBe(false);});
 it('filters period, templates, expected income, business rows and foreign currency',()=>{
  const rows={income:[{amount:100,currency:'KWD',received_date:'2026-09-01',status:'received'},{amount:500,currency:'KWD',received_date:'2026-08-01',status:'received'},{amount:900,currency:'KWD',received_date:'2026-09-01',status:'expected'},{amount:200,currency:'KWD',received_date:'2026-09-01',status:'received',is_recurring:true},{amount:40,currency:'USD',received_date:'2026-09-01',status:'received'}],expenses:[{amount:20,currency:'KWD',date:'2026-09-01'},{amount:30,currency:'KWD',date:'2026-09-01',project_id:'private'}],savings:[],investments:[],debts:[],goals:[]};
  const result=advisorSourceFromRows(rows,'KWD','2026-09');expect(result.income).toBe(100);expect(result.expenses).toBe(20);expect(result.savings).toBeNull();expect(result.excluded).toBe(1);
 });
 it('counts linked debt repayments once and reserves only the unpaid scheduled part',()=>{
  const rows={income:[{amount:1000,currency:'KWD',status:'received',received_date:'2026-09-01'}],expenses:[{amount:500,currency:'KWD',date:'2026-09-02'},{amount:40,currency:'KWD',date:'2026-09-03',debt_id:'d'}],debts:[{id:'d',currency:'KWD',amount:1000,monthly_payment:100,interest_type:'none'}],savings:[],investments:[],goals:[]};
  const result=advisorSourceFromRows(rows,'KWD','2026-09');
  expect(result.debtPaymentsNotInExpenses).toBe(60);
  expect(buildCapabilityReport(input('coach'),result).metrics.find(m=>m.key==='monthly_surplus')?.value).toBe(400);
 });
 it('does not treat an excluded incomplete debt as zero liability',()=>{
  const incomplete={...source,missing:['debt_balance_or_payment']};
  expect(buildCapabilityReport(input('wealth'),incomplete).metrics.find(m=>m.key==='recorded_net_worth')?.value).toBeNull();
  expect(buildCapabilityReport(input('debt'),incomplete).metrics.find(m=>m.key==='avalanche_months')?.value).toBeNull();
 });

});
