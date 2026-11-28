"use client";
import Link from "next/link";
import type { SupportedLocale } from "@/lib/i18n";
type Course = { id:string; title:string; slug:string; description:string|null; discipline:string; level:string|null; cover_image_url:string|null };
type Country = { code:string; name:string; default_language_code:string };
type CourseProgress = { percent:number; completed:number; total:number; nextLesson:string|null };
type Activity = { title:string; courseTitle:string; lastAccessedAt:string; percent:number };
type Props = { firstName:string; email:string; planCode:string; language:SupportedLocale; countryCode:string; countries:Country[]; courses:Course[]; enrolled:string[]; completedLessons:number; overallProgress:number; courseProgress:Record<string,CourseProgress>; recentActivity:Activity[]; canCreateAcademicContent:boolean; canReviewAcademicContent:boolean; onLanguageChange:(value:SupportedLocale)=>void; onCountryChange:(value:string)=>void; onSignOut:()=>void };
const navGroups = [
 {label:"LEARN",links:[["▦","Overview","#overview"],["▤","My courses","#my-courses"],["▣","Academic library","/library"],["⚗","Virtual laboratory","/virtual-lab"]]},
 {label:"PRACTISE",links:[["✎","Examination centre","/exams"],["◴","My progress","/progress"],["⌕","Smart revision","/revision"]]},
 {label:"EXPLORE",links:[["✦","AI study tutor","/ai-tutor"],["◎","Student community","/community"],["✧","Study tools","/study-tools"],["◇","Certificates","/certificates"]]}
];
export default function StudentDashboard(p:Props) {
 const mine=p.courses.filter(c=>p.enrolled.includes(c.id));
 const available=p.courses.filter(c=>!p.enrolled.includes(c.id));
 const date=new Intl.DateTimeFormat(p.language==="en"?"en-GH":p.language,{weekday:"long",month:"long",day:"numeric"}).format(new Date());
 return <main className="lb-dashboard" dir={p.language==="ar"?"rtl":"ltr"}>
  <aside className="lb-dash-sidebar">
   <Link className="lb-dash-brand" href="/"><span className="lb-dash-mark">L<sup>+</sup></span><span><strong>LabBridge</strong><small>LEARN</small></span></Link>
   <div className="lb-dash-student-label">STUDENT WORKSPACE</div>
   <nav className="lb-dash-nav" aria-label="Student navigation">
    {navGroups.map(g=><div className="lb-dash-nav-group" key={g.label}><span>{g.label}</span>{g.links.map(([icon,label,href])=><a className={href==="#overview"?"is-active":""} href={href} key={label}><i aria-hidden="true">{icon}</i>{label}</a>)}</div>)}
    {(p.canCreateAcademicContent||p.canReviewAcademicContent)&&<div className="lb-dash-nav-group"><span>ACADEMIC</span>{p.canCreateAcademicContent&&<a href="/lecturer"><i>✎</i>Lecturer workspace</a>}{p.canReviewAcademicContent&&<a href="/academic-review"><i>✓</i>Academic review</a>}</div>}
   </nav>
   <div className="lb-dash-sidebar-foot"><div className="lb-dash-support"><span>✦</span><strong>Keep your momentum</strong><p>Small, consistent study sessions build lasting understanding.</p><a href="/library">Explore resources ↗</a></div><div className="lb-dash-online"><i/> Learning space active <small>{p.countryCode}</small></div></div>
  </aside>
  <section className="lb-dash-main" id="overview">
   <header className="lb-dash-topbar"><div className="lb-dash-crumb">LabBridge <span>/</span> <strong>Student overview</strong></div><div className="lb-dash-top-actions">
    <label><span>Language</span><select aria-label="Language" value={p.language} onChange={e=>p.onLanguageChange(e.target.value as SupportedLocale)}><option value="en">English</option><option value="fr">Français</option><option value="pt">Português</option><option value="ar">العربية</option><option value="sw">Kiswahili</option><option value="es">Español</option></select></label>
    <label className="lb-dash-country"><span>Country</span><select aria-label="Country" value={p.countryCode} onChange={e=>p.onCountryChange(e.target.value)}>{p.countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
    <span className="lb-dash-plan">{p.planCode}</span><div className="lb-dash-user"><span>{p.firstName.slice(0,1).toUpperCase()}</span><div><strong>{p.firstName}</strong><small>{p.email}</small></div></div><button className="lb-dash-signout" onClick={p.onSignOut}>Sign out</button>
   </div></header>
   <div className="lb-dash-content">
    <section className="lb-dash-welcome"><div><div className="lb-dash-kicker"><i/> YOUR MLS LEARNING JOURNEY</div><p className="lb-dash-date">{date}</p><h1>Welcome back, {p.firstName}.<br/><em>Keep building your expertise.</em></h1><p className="lb-dash-intro">Your learning space is ready. Pick up where you left off or explore a new area of medical laboratory science.</p><a className="lb-dash-primary" href={mine[0]?"/courses/"+mine[0].slug:"#explore"}>{mine.length?"Continue learning":"Explore courses"} <span>→</span></a></div><div className="lb-dash-hero-visual" aria-hidden="true"><div className="lb-dash-hero-orbit orbit-a"/><div className="lb-dash-hero-orbit orbit-b"/><div className="lb-dash-hero-cell"><span>LAB</span><strong>✳</strong><small>LEARN</small></div><b>+</b><i/></div></section>
    <section className="lb-dash-stats" aria-label="Your learning statistics">
     <article><span className="lb-dash-stat-icon">▤</span><div><small>COURSES ENROLLED</small><strong>{mine.length.toString().padStart(2,"0")}</strong><p>Learning pathways</p></div></article>
     <article><span className="lb-dash-stat-icon stat-violet">◷</span><div><small>LESSONS COMPLETED</small><strong>{p.completedLessons.toString().padStart(2,"0")}</strong><p>Knowledge milestones</p></div></article>
     <article><span className="lb-dash-stat-icon stat-gold">◉</span><div><small>OVERALL PROGRESS</small><strong>{p.overallProgress}%</strong><p>Across your learning</p></div><div className="lb-dash-progress-ring" style={{background:"conic-gradient(#168779 "+p.overallProgress+"%, #e8efec 0)"}}><span>{p.overallProgress}%</span></div></article>
     <article><span className="lb-dash-stat-icon stat-blue">＋</span><div><small>AVAILABLE COURSES</small><strong>{available.length.toString().padStart(2,"0")}</strong><p>Ready to explore</p></div></article>
    </section>
    <section className="lb-dash-section" id="my-courses"><div className="lb-dash-section-head"><div><span>YOUR LEARNING PATH</span><h2>Continue where you left off</h2><p>Pick up your enrolled courses and keep moving forward.</p></div><a href="/library">Browse library ↗</a></div>
     {mine.length?<div className="lb-dash-course-grid">{mine.map(c=>{const v=p.courseProgress[c.id]||{percent:0,completed:0,total:0,nextLesson:null};return <article className="lb-dash-course-card" key={c.id}><div className="lb-dash-course-top"><span>{c.discipline}</span><small>{c.level||"MLS"}</small></div><h3>{c.title}</h3><p>{c.description||"Build your understanding with structured lessons and practical learning resources."}</p><div className="lb-dash-course-meta"><strong>{v.percent}% complete</strong><span>{v.completed}/{v.total} lessons</span></div><div className="lb-dash-course-track"><i style={{width:v.percent+"%"}}/></div><div className="lb-dash-course-foot"><span>{v.nextLesson?"Next: "+v.nextLesson:v.percent===100?"Course completed":"Ready to continue"}</span><a href={"/courses/"+c.slug}>Open course →</a></div></article>})}</div>:<div className="lb-dash-empty"><span>✳</span><div><strong>Your learning journey starts here</strong><p>You have not enrolled in a course yet. Explore the academic library and choose your first subject.</p></div><a href="/library">Explore courses →</a></div>}
    </section>
    <section className="lb-dash-lower"><div className="lb-dash-activity"><div className="lb-dash-section-head compact"><div><span>RECENT ACTIVITY</span><h2>Your study timeline</h2></div><a href="/progress">View progress ↗</a></div>{p.recentActivity.length?<div className="lb-dash-activity-list">{p.recentActivity.slice(0,4).map((a,i)=><div className="lb-dash-activity-item" key={a.title+a.lastAccessedAt}><span className="lb-dash-activity-number">0{i+1}</span><div><strong>{a.title}</strong><small>{a.courseTitle}</small></div><time>{new Date(a.lastAccessedAt).toLocaleDateString()}</time><b>{a.percent}%</b></div>)}</div>:<div className="lb-dash-activity-empty">Your recently opened lessons will appear here as you study.</div>}</div>
     <aside className="lb-dash-quick"><span>YOUR STUDY TOOLKIT</span><h2>Learn with purpose.</h2><p>Move from understanding concepts to applying your knowledge.</p><a href="/ai-tutor"><i>✦</i><span><strong>Ask the AI Tutor</strong><small>Get help understanding a topic</small></span><b>↗</b></a><a href="/exams"><i>✎</i><span><strong>Practise for exams</strong><small>Test your knowledge</small></span><b>↗</b></a><a href="/virtual-lab"><i>⚗</i><span><strong>Enter the virtual lab</strong><small>Explore laboratory scenarios</small></span><b>↗</b></a></aside>
    </section>
    {available.length>0&&<section className="lb-dash-section lb-dash-explore" id="explore"><div className="lb-dash-section-head"><div><span>KEEP DISCOVERING</span><h2>Explore more subjects</h2><p>Expand your knowledge with another learning pathway.</p></div><a href="/library">See all courses ↗</a></div><div className="lb-dash-explore-grid">{available.slice(0,3).map(c=><article key={c.id}><span>{c.level||c.discipline}</span><h3>{c.title}</h3><p>{c.description||"Explore guided lessons and resources."}</p><a href="/library">View in library →</a></article>)}</div></section>}
    <footer className="lb-dash-footer"><span>© 2026 LabBridge Learn</span><span>Learn with curiosity. Practise with care. <b>✦</b></span></footer>
   </div>
  </section>
 </main>;
}