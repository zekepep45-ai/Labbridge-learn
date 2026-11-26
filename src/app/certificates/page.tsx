"use client";

import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
type Course={id:string;title:string;description:string|null};
type Module={id:string;course_id:string};
type Lesson={id:string;module_id:string};
type Progress={lesson_id:string;completion_percent:number};
export default function CertificatesPage(){
 const db=useMemo(()=>getSupabaseBrowserClient(),[]);
 const [loading,setLoading]=useState(true);
 const [rows,setRows]=useState<{course:Course;done:number;total:number;eligible:boolean}[]>([]);
 const [selected,setSelected]=useState<Course|null>(null);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{
  const {data:auth}=await db.auth.getUser();if(!auth.user){window.location.href="/";return;}
  const {data:courses,error:courseError}=await db.from("courses").select("id,title,description").eq("status","published").order("title");
  if(courseError){if(active){setError(courseError.message);setLoading(false);}return;}
  const courseRows=(courses??[]) as Course[];const cids=courseRows.map(c=>c.id);
  const {data:modules}=cids.length?await db.from("course_modules").select("id,course_id").in("course_id",cids).eq("status","published"):{data:[] as Module[]};
  const moduleRows=(modules??[]) as Module[];const mids=moduleRows.map(m=>m.id);
  const {data:lessons}=mids.length?await db.from("lessons").select("id,module_id").in("module_id",mids).eq("status","published"):{data:[] as Lesson[]};
  const lessonRows=(lessons??[]) as Lesson[];const lessonIds=lessonRows.map(l=>l.id);
  const {data:progress}=lessonIds.length?await db.from("learning_progress").select("lesson_id,completion_percent").eq("user_id",auth.user.id).in("lesson_id",lessonIds):{data:[] as Progress[]};
  const progressMap=new Map(((progress??[]) as Progress[]).map(p=>[p.lesson_id,p.completion_percent]));
  const results=courseRows.map(course=>{
   const courseModuleIds=new Set(moduleRows.filter(m=>m.course_id===course.id).map(m=>m.id));
   const courseLessons=lessonRows.filter(l=>courseModuleIds.has(l.module_id));
   const done=courseLessons.filter(l=>(progressMap.get(l.id)??0)>=100).length;
   return {course,done,total:courseLessons.length,eligible:courseLessons.length>0&&done===courseLessons.length};
  });
  if(active){setRows(results);setLoading(false);}
 })();return()=>{active=false;};},[db]);
 if(loading)return <main className="loading-screen"><p>Checking certificate eligibility…</p></main>;
 return <main className="certificate-page">
  <header className="admin-header"><Link href="/" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></Link><nav><Link href="/progress">Progress</Link><Link href="/library">Academic Library</Link></nav></header>
  <section className="certificate-hero"><span className="admin-kicker">LEARNING ACHIEVEMENTS</span><h1>Your certificates.<br/><em>Your progress.</em></h1><p>Certificates are available only after every published lesson in a course has been completed. They recognise learning completion and are not professional licences or accredited clinical qualifications.</p></section>
  {error&&<p className="quiz-message">{error}</p>}
  {rows.length?<section className="certificate-list">{rows.map(row=><article key={row.course.id}><div><span className="admin-kicker">{row.eligible?"COMPLETED":"IN PROGRESS"}</span><h2>{row.course.title}</h2><p>{row.done} of {row.total} published lessons completed</p><div className="certificate-track"><i style={{width:(row.total?row.done/row.total*100:0)+"%"}}/></div></div>{row.eligible?<button className="primary-button" onClick={()=>setSelected(row.course)}>View certificate →</button>:<span className="certificate-locked">Not yet eligible</span>}</article>)}</section>:<section className="certificate-empty"><h2>Certificates are not available yet</h2><p>There are currently no published courses with published lessons. Once academically reviewed courses are released and you complete their lessons, your eligibility will appear here.</p><Link href="/library">Visit Academic Library →</Link></section>}
  {selected&&<div className="certificate-modal" role="dialog" aria-modal="true" aria-label="Course completion certificate"><div className="certificate-sheet" id="print-certificate"><div className="certificate-inner"><div className="certificate-brand">LABBRIDGE LEARN</div><div className="certificate-rule"/><div className="certificate-label">CERTIFICATE OF COMPLETION</div><h2>This certificate is presented to</h2><div className="certificate-recipient">Learner</div><p>For successfully completing all published lessons in</p><h3>{selected.title}</h3><p className="certificate-note">This certificate recognises completion of the learning materials available on LabBridge Learn. It is not an accredited qualification, professional licence or evidence of supervised clinical competency.</p><div className="certificate-date">Issued {new Date().toLocaleDateString()}</div><div className="certificate-sign">LabBridge Learn · Academic Learning Platform</div></div></div><div className="certificate-actions"><button className="primary-button" onClick={()=>window.print()}>Print / Save as PDF</button><button onClick={()=>setSelected(null)}>Close</button></div></div>}
  <footer className="admin-footer">LabBridge Learn · Learn. Practise. Advance.</footer>
 </main>;
}
