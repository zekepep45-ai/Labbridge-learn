"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type CourseRow = { id:string; title:string; slug:string; status:string; review_status:string };
type ModuleRow = { id:string; course_id:string; title:string; status:string; review_status:string };
type LessonRow = { id:string; module_id:string; title:string; status:string; review_status:string; content_markdown:string|null; summary:string|null };

export default function ContentReadinessPage(){
 const supabase=useMemo(()=>getSupabaseBrowserClient(),[]);
 const [loading,setLoading]=useState(true);
 const [allowed,setAllowed]=useState(false);
 const [courses,setCourses]=useState<CourseRow[]>([]);
 const [modules,setModules]=useState<ModuleRow[]>([]);
 const [lessons,setLessons]=useState<LessonRow[]>([]);
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("all");
 const [error,setError]=useState("");

 useEffect(()=>{
  let active=true;
  async function load(){
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){if(active){setError("Sign in with an administrator account.");setLoading(false);}return;}
   const {data:roles}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id);
   const admin=(roles??[]).some((r)=>r.role==="admin");
   if(active)setAllowed(admin);
   if(!admin){if(active){setLoading(false);setError("Administrator access is required to view the academic readiness report.");}return;}
   const [c,m,l]=await Promise.all([
    supabase.from("courses").select("id,title,slug,status,review_status").order("title"),
    supabase.from("course_modules").select("id,course_id,title,status,review_status").order("position"),
    supabase.from("lessons").select("id,module_id,title,status,review_status,content_markdown,summary").order("position")
   ]);
   if(c.error||m.error||l.error){if(active)setError(c.error?.message||m.error?.message||l.error?.message||"Could not load readiness data.");}
   if(active){setCourses((c.data??[]) as CourseRow[]);setModules((m.data??[]) as ModuleRow[]);setLessons((l.data??[]) as LessonRow[]);setLoading(false);}
  }
  void load();return()=>{active=false;};
 },[supabase]);

 const rows=useMemo(()=>courses.map(course=>{
  const courseModules=modules.filter(m=>m.course_id===course.id);
  const moduleIds=courseModules.map(m=>m.id);
  const courseLessons=lessons.filter(l=>moduleIds.includes(l.module_id));
  const shortLessons=courseLessons.filter(l=>(l.content_markdown??"").trim().length<1200);
  const noSummary=courseLessons.filter(l=>!(l.summary??"").trim());
  const pendingLessons=courseLessons.filter(l=>l.review_status!=="approved");
  const modulesApproved=courseModules.filter(m=>m.review_status==="approved").length;
  const lessonApproved=courseLessons.filter(l=>l.review_status==="approved").length;
  const ready=courseModules.length>0&&courseLessons.length>0&&shortLessons.length===0&&noSummary.length===0&&course.review_status==="approved"&&modulesApproved===courseModules.length&&lessonApproved===courseLessons.length;
  return {course,modules:courseModules.length,lessons:courseLessons.length,short:shortLessons.length,noSummary:noSummary.length,approvedModules:modulesApproved,approvedLessons:lessonApproved,ready};
 }),[courses,modules,lessons]);
 const totals={courses:courses.length,modules:modules.length,lessons:lessons.length,short:lessons.filter(l=>(l.content_markdown??"").trim().length<1200).length,approved:lessons.filter(l=>l.review_status==="approved").length};
 const filtered=rows.filter(r=>{
  const term=query.toLowerCase().trim();
  const match=!term||r.course.title.toLowerCase().includes(term);
  const state=filter==="all"||(filter==="ready"&&r.ready)||(filter==="needs-work"&&!r.ready);
  return match&&state;
 });
 if(loading)return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Checking academic readiness…</p></main>;
 if(!allowed)return <main className="readiness-page"><section className="lecturer-denied"><h1>Access restricted</h1><p>{error}</p><Link href="/">Return to dashboard →</Link></section></main>;
 return <main className="readiness-page">
  <header className="admin-header"><Link href="/" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>ACADEMIC QUALITY</small></span></Link><nav className="admin-header-links"><Link href="/admin">Content Studio</Link><Link href="/academic-review">Review Centre</Link><Link href="/">Dashboard</Link></nav></header>
  <section className="readiness-hero"><span className="admin-kicker">ACADEMIC QUALITY CONTROL</span><h1>Course readiness <em>overview.</em></h1><p>A transparent checklist of course structure, lesson depth and academic review. This report does not approve content; it helps the team identify what still needs development and expert review.</p></section>
  <section className="readiness-stats"><article><span>COURSES</span><strong>{totals.courses}</strong></article><article><span>MODULES</span><strong>{totals.modules}</strong></article><article><span>LESSONS</span><strong>{totals.lessons}</strong></article><article><span>SHORT DRAFTS</span><strong>{totals.short}</strong></article><article><span>APPROVED LESSONS</span><strong>{totals.approved}</strong></article></section>
  <section className="readiness-panel"><div className="readiness-panel-head"><div><span className="admin-kicker">RELEASE CHECKLIST</span><h2>Every course, accounted for</h2><p>Lesson depth flag: under 1,200 characters. This is a screening heuristic, not a measure of academic accuracy.</p></div><Link href="/lecturer">Open Lecturer Workspace →</Link></div>
   <div className="readiness-filters"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search courses…"/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All courses</option><option value="needs-work">Needs work</option><option value="ready">Meets checklist</option></select></div>
   <div className="readiness-list">{filtered.map(r=><article key={r.course.id} className="readiness-course"><div className="readiness-course-main"><div><span className="readiness-discipline">COURSE · {r.course.review_status.replace("_"," ").toUpperCase()}</span><h3>{r.course.title}</h3><small>{r.modules} modules · {r.lessons} lessons</small></div><span className={"readiness-badge "+(r.ready?"is-ready":"is-work")}>{r.ready?"Checklist met":"Needs work"}</span></div><div className="readiness-metrics"><span>{r.approvedModules}/{r.modules} modules approved</span><span>{r.approvedLessons}/{r.lessons} lessons approved</span><span>{r.short} short lessons</span><span>{r.noSummary} missing summaries</span></div><div className="readiness-track"><i style={{width:(r.lessons?Math.round(r.approvedLessons/r.lessons*100):0)+"%"}}/></div><div className="readiness-course-foot"><span>Publication: {r.course.status}</span><Link href="/admin">Review in Content Studio ↗</Link></div></article>)}</div>
   {filtered.length===0&&<p className="readiness-empty">No courses match this filter.</p>}
  </section>
  <footer className="admin-footer">LabBridge Learn · Academic approval is required before student publication</footer>
 </main>;
}
