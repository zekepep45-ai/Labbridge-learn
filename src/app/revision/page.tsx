"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Attempt={id:string;assessment_id:string;percentage:number;submitted_at:string};
type Assessment={id:string;title:string;description:string|null;course_id:string;time_limit_minutes:number|null;status:string};
type Question={id:string;tags:string[]|null};
type Response={attempt_id:string;question_id:string;is_correct:boolean};
type Topic={name:string;correct:number;total:number};
export default function RevisionPage(){
 const db=useMemo(()=>getSupabaseBrowserClient(),[]);
 const [loading,setLoading]=useState(true);
 const [topics,setTopics]=useState<Topic[]>([]);
 const [assessments,setAssessments]=useState<Assessment[]>([]);
 const [search,setSearch]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{
  const {data:auth}=await db.auth.getUser();if(!auth.user){window.location.href="/";return;}
  const [{data:attemptRows},{data:assessmentRows,error:assessmentError}]=await Promise.all([
   db.from("assessment_attempts").select("id,assessment_id,percentage,submitted_at").eq("user_id",auth.user.id).eq("status","graded").order("submitted_at",{ascending:false}),
   db.from("assessments").select("id,title,description,course_id,time_limit_minutes,status").eq("status","published").order("title")
  ]);
  if(assessmentError){if(active){setError(assessmentError.message);setLoading(false);}return;}
  const attempts=(attemptRows??[]) as Attempt[];const ids=attempts.map(x=>x.id);
  const {data:responseRows}=ids.length?await db.from("assessment_responses").select("attempt_id,question_id,is_correct").in("attempt_id",ids):{data:[] as Response[]};
  const responses=(responseRows??[]) as Response[];const qids=Array.from(new Set(responses.map(x=>x.question_id)));
  const {data:questionRows}=qids.length?await db.from("assessment_questions").select("id,tags").in("id",qids):{data:[] as Question[]};
  const qmap=new Map(((questionRows??[]) as Question[]).map(q=>[q.id,q]));
  const totals=new Map<string,{correct:number;total:number}>();
  responses.forEach(r=>{const tags=qmap.get(r.question_id)?.tags?.length?qmap.get(r.question_id)!.tags!:["General MLS knowledge"];tags.forEach(tag=>{const v=totals.get(tag)??{correct:0,total:0};v.total++;if(r.is_correct)v.correct++;totals.set(tag,v);});});
  if(!active)return;
  setTopics(Array.from(totals.entries()).map(([name,v])=>({name,...v})).sort((a,b)=>(a.correct/a.total)-(b.correct/b.total)));
  setAssessments((assessmentRows??[]) as Assessment[]);setLoading(false);
 })();return()=>{active=false;};},[db]);
 const filtered=assessments.filter(a=>(a.title+" "+(a.description??"")).toLowerCase().includes(search.toLowerCase()));
 const weak=topics.filter(t=>t.total>=2&&t.correct/t.total<0.75).slice(0,4);
 if(loading)return <main className="loading-screen"><p>Building your revision plan…</p></main>;
 return <main className="revision-page">
  <header className="admin-header"><Link href="/" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></Link><nav><Link href="/progress">Progress</Link><Link href="/exams">Examination Centre</Link></nav></header>
  <section className="revision-hero"><span className="admin-kicker">PERSONALISED REVISION</span><h1>Know what to revise.<br/><em>Practise with purpose.</em></h1><p>Your recommendations use your graded assessment responses. Topics with limited evidence are not labelled as weaknesses.</p></section>
  {error&&<p className="quiz-message">{error}</p>}
  <section className="revision-panel"><div className="section-heading compact"><div><div className="eyebrow">PRIORITY TOPICS</div><h2>Recommended revision</h2></div><span>{weak.length} priorities</span></div>
   {weak.length?<div className="revision-topic-grid">{weak.map(t=><article key={t.name}><strong>{t.name}</strong><span>{Math.round(t.correct/t.total*100)}% accuracy</span><small>{t.correct} correct out of {t.total} responses</small><div className="revision-track"><i style={{width:(t.correct/t.total*100)+"%"}}/></div></article>)}</div>:<div className="revision-empty"><h3>No priority topic identified yet</h3><p>Complete more graded assessments. Once there is enough topic-level evidence, we'll recommend where to focus next.</p></div>}
  </section>
  <section className="revision-panel"><div className="section-heading compact"><div><div className="eyebrow">PRACTICE LIBRARY</div><h2>Published assessments</h2></div><span>{assessments.length} available</span></div>
   <input className="revision-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search assessments by title or topic…"/>
   <div className="revision-assessment-list">{filtered.map(a=><article key={a.id}><div><strong>{a.title}</strong><p>{a.description||"Published Medical Laboratory Science assessment"}</p><small>{a.time_limit_minutes?"Timed · "+a.time_limit_minutes+" minutes":"Practice assessment"}</small></div><Link href={"/quizzes/"+a.id}>Start practice →</Link></article>)}{!filtered.length&&<p className="revision-empty">No published assessments match your search.</p>}</div>
  </section>
  <div className="revision-links"><Link href="/progress">View full performance insights →</Link><Link href="/admin/assessments">Assessment Studio (staff) →</Link></div>
  <footer className="admin-footer">LabBridge Learn · Revision recommendations improve as you complete more assessments.</footer>
 </main>;
}
