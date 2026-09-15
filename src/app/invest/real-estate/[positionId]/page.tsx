'use client';
import { useEffect,useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { RealEstateLandAnalyst } from '@/components/invest/RealEstateLandAnalyst';
import { RealEstateValuationTimeline } from '@/components/invest/RealEstateValuationTimeline';
import { useAuth } from '@/hooks/useAuth';
import '../../real-estate.css';

type Snapshot={id:string;currency:string|null;low_value:number|null;midpoint_value:number|null;high_value:number|null;confidence_level:string;evidence_count:number;official_evidence_count:number;methodology_version:string;valued_at:string};
export default function SavedRealEstateAnalystPage(){const params=useParams<{positionId:string}>();const{session,isGuest}=useAuth();const[items,setItems]=useState<Snapshot[]>([]);const[loading,setLoading]=useState(true);useEffect(()=>{const token=session?.access_token;if(!token||isGuest||!params.positionId){setLoading(false);return;}const controller=new AbortController();fetch(`/api/investments/real-estate/history?positionId=${encodeURIComponent(params.positionId)}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(p=>setItems(p?.items??[])).finally(()=>setLoading(false));return()=>controller.abort();},[isGuest,params.positionId,session?.access_token]);return <DashboardPageShell ariaLabel="Real Estate Intelligence"><RealEstateLandAnalyst/><section className="real-estate-analyst__history-card"><div><span>Historical intelligence</span><h2>Valuation timeline</h2><p>Every saved valuation keeps its date, evidence count, official-source coverage, confidence and methodology version.</p></div>{loading?<div className="real-estate-analyst__timeline-empty">Loading valuation history…</div>:<RealEstateValuationTimeline items={items}/>}</section></DashboardPageShell>}
