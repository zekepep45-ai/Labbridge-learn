"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Course = { id: string; title: string; slug: string; description: string | null; discipline: string; level: string | null; status: string; review_status: string; created_by: string | null };
type Module = { id: string; course_id: string; title: string; description: string | null; position: number; status: string; review_status: string; created_by: string | null };
type Lesson = { id: string; module_id: string; title: string; summary: string | null; content_markdown: string | null; estimated_minutes: number | null; position: number; status: string; review_status: string; created_by: string | null };
type Review = { id: string; item_type: string; item_id: string; status: string; reviewer_comments: string | null; submitted_at: string; reviewed_at: string | null };

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function LecturerWorkspacePage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [discipline, setDiscipline] = useState("Medical Laboratory Science");
  const [level, setLevel] = useState("Foundational");
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [minutes, setMinutes] = useState("15");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadWorkspace(id: string) {
    const [courseResult, moduleResult, lessonResult, reviewResult] = await Promise.all([
      supabase.from("courses").select("id,title,slug,description,discipline,level,status,review_status,created_by").order("created_at", { ascending: false }),
      supabase.from("course_modules").select("id,course_id,title,description,position,status,review_status,created_by").order("position"),
      supabase.from("lessons").select("id,module_id,title,summary,content_markdown,estimated_minutes,position,status,review_status,created_by").order("position"),
      supabase.from("academic_content_reviews").select("id,item_type,item_id,status,reviewer_comments,submitted_at,reviewed_at").eq("submitted_by", id).order("submitted_at", { ascending: false })
    ]);
    if (courseResult.error || moduleResult.error || lessonResult.error || reviewResult.error) {
      setMessage("Some workspace data could not be loaded. " + (courseResult.error?.message || moduleResult.error?.message || lessonResult.error?.message || reviewResult.error?.message));
      return;
    }
    const courseRows = (courseResult.data ?? []) as Course[];
    setCourses(courseRows);
    setModules((moduleResult.data ?? []) as Module[]);
    setLessons((lessonResult.data ?? []) as Lesson[]);
    setReviews((reviewResult.data ?? []) as Review[]);
    if (!selectedCourse && courseRows[0]) setSelectedCourse(courseRows[0].id);
  }

  useEffect(() => {
    let active = true;
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { if (active) { setMessage("Please sign in to open the lecturer workspace."); setChecking(false); } return; }
      const { data: roleRows, error } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id);
      if (error) { if (active) { setMessage("Could not verify your role: " + error.message); setChecking(false); } return; }
      const hasAccess = (roleRows ?? []).some((row) => ["lecturer", "admin", "content_editor"].includes(row.role));
      if (active) {
        setUserId(auth.user.id);
        setEmail(auth.user.email ?? "");
        setAllowed(hasAccess);
        if (hasAccess) await loadWorkspace(auth.user.id);
        else setMessage("This workspace is available to lecturers and authorised content administrators.");
        setChecking(false);
      }
    }
    void init();
    return () => { active = false; };
  }, [supabase]);

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!userId) return;
    setBusy(true); setMessage("");
    const { data, error } = await supabase.from("courses").insert({
      title: courseTitle.trim(), slug: slugify(courseTitle), description: courseDescription.trim(),
      discipline: discipline.trim(), level, status: "draft", review_status: "draft", created_by: userId
    }).select("id").single();
    if (error) setMessage("Course could not be saved: " + error.message);
    else { setCourseTitle(""); setCourseDescription(""); await loadWorkspace(userId); if (data) setSelectedCourse(data.id); setMessage("Draft course created. Add its modules and lessons below."); }
    setBusy(false);
  }

  async function createModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedCourse || !userId) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("course_modules").insert({
      course_id: selectedCourse, title: moduleTitle.trim(), slug: slugify(moduleTitle),
      description: moduleDescription.trim(), position: modules.filter((item) => item.course_id === selectedCourse).length,
      status: "draft", review_status: "draft", created_by: userId
    });
    if (error) setMessage("Module could not be saved: " + error.message);
    else { setModuleTitle(""); setModuleDescription(""); await loadWorkspace(userId); setMessage("Draft module created."); }
    setBusy(false);
  }

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedModule || !userId) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("lessons").insert({
      module_id: selectedModule, title: lessonTitle.trim(), slug: slugify(lessonTitle),
      summary: lessonSummary.trim(), content_markdown: lessonContent.trim(),
      estimated_minutes: Number(minutes), position: lessons.filter((item) => item.module_id === selectedModule).length,
      status: "draft", review_status: "draft", created_by: userId
    });
    if (error) setMessage("Lesson could not be saved: " + error.message);
    else { setLessonTitle(""); setLessonSummary(""); setLessonContent(""); await loadWorkspace(userId); setMessage("Draft lesson saved successfully."); }
    setBusy(false);
  }

  async function submitForReview() {
    if (!selectedCourse || !userId) return;
    const courseModules = modules.filter((item) => item.course_id === selectedCourse);
    const moduleIds = courseModules.map((item) => item.id);
    const courseLessons = lessons.filter((item) => moduleIds.includes(item.module_id));
    if (!courseModules.length || !courseLessons.length) { setMessage("Add at least one module and one lesson before requesting academic review."); return; }
    setBusy(true); setMessage("");
    const rows = [
      { item_type: "course", item_id: selectedCourse, submitted_by: userId },
      ...courseModules.map((item) => ({ item_type: "module", item_id: item.id, submitted_by: userId })),
      ...courseLessons.map((item) => ({ item_type: "lesson", item_id: item.id, submitted_by: userId }))
    ];
    const ids = rows.map((item) => item.item_id);
    const { data: pending, error: pendingError } = await supabase.from("academic_content_reviews").select("item_id").eq("status", "pending").in("item_id", ids);
    if (pendingError) { setMessage("Could not check review queue: " + pendingError.message); setBusy(false); return; }
    const pendingIds = new Set((pending ?? []).map((item) => item.item_id));
    const fresh = rows.filter((item) => !pendingIds.has(item.item_id));
    if (!fresh.length) { setMessage("This course already has pending review submissions."); setBusy(false); return; }
    const { error } = await supabase.from("academic_content_reviews").insert(fresh);
    if (error) setMessage("Submission failed: " + error.message);
    else { setMessage("Submitted " + fresh.length + " course, module and lesson item(s). A reviewer must approve them before publication."); await loadWorkspace(userId); }
    setBusy(false);
  }

  const activeCourse = courses.find((item) => item.id === selectedCourse);
  const availableModules = modules.filter((item) => item.course_id === selectedCourse);
  const pendingCount = reviews.filter((item) => item.status === "pending").length;

  if (checking) return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Opening lecturer workspace…</p></main>;
  if (!allowed) return <main className="lecturer-page"><section className="lecturer-denied"><span className="admin-kicker">LABBRIDGE LEARN</span><h1>Lecturer access required</h1><p>{message || "Sign in with an authorised lecturer account."}</p><Link href="/">Return to dashboard →</Link></section></main>;

  return <main className="lecturer-page">
    <header className="admin-header"><Link href="/" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LECTURER WORKSPACE</small></span></Link><nav className="admin-header-links"><Link href="/academic-review">Academic Review →</Link><Link href="/admin">Content Studio →</Link><Link href="/">← Dashboard</Link></nav></header>
    <section className="lecturer-hero"><div><span className="admin-kicker">ACADEMIC CONTENT CREATION</span><h1>Build learning that <em>moves science forward.</em></h1><p>Create structured MLS courses, write lessons and submit your work for independent academic review. Your drafts remain private to your content team until approved and published.</p><small>Signed in as {email}</small></div><div className="lecturer-hero-mark">L<span>+</span></div></section>
    <section className="lecturer-stats"><article><span>YOUR COURSES</span><strong>{courses.length}</strong></article><article><span>MODULES</span><strong>{modules.length}</strong></article><article><span>LESSONS</span><strong>{lessons.length}</strong></article><article><span>AWAITING REVIEW</span><strong>{pendingCount}</strong></article></section>
    <div className="lecturer-grid">
      <section className="admin-card"><div className="admin-card-head"><span>01 / COURSE DESIGN</span><h2>Create a course</h2></div><form className="admin-form" onSubmit={createCourse}>
        <label>Course title<input required value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="Clinical Biochemistry"/></label>
        <label>Course description<textarea required rows={4} value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} placeholder="Describe the learning outcomes and scope."/></label>
        <div className="admin-form-row"><label>Discipline<input required value={discipline} onChange={(e) => setDiscipline(e.target.value)}/></label><label>Level<select value={level} onChange={(e) => setLevel(e.target.value)}><option>Foundational</option><option>Intermediate</option><option>Advanced</option><option>Professional development</option></select></label></div>
        <button className="primary-button" disabled={busy}>Save course draft →</button>
      </form></section>
      <section className="admin-card"><div className="admin-card-head"><span>02 / COURSE STRUCTURE</span><h2>Add a module</h2></div><form className="admin-form" onSubmit={createModule}>
        <label>Course<select required value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}><option value="">Choose your course</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label>Module title<input required value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="Enzymes and clinical applications"/></label>
        <label>Module overview<textarea rows={4} value={moduleDescription} onChange={(e) => setModuleDescription(e.target.value)} placeholder="What does this module cover?"/></label>
        <button className="primary-button" disabled={busy || !selectedCourse}>Save module draft →</button>
      </form></section>
      <section className="admin-card lecturer-wide"><div className="admin-card-head"><span>03 / LESSON AUTHORING</span><h2>Write a lesson</h2></div><form className="admin-form" onSubmit={createLesson}>
        <label>Module<select required value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}><option value="">Choose a module</option>{modules.filter((item) => item.course_id === selectedCourse).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label>Lesson title<input required value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="Principles of spectrophotometry"/></label>
        <div className="admin-form-row"><label>Lesson summary<input value={lessonSummary} onChange={(e) => setLessonSummary(e.target.value)} placeholder="A concise overview."/></label><label>Estimated minutes<input type="number" min="1" max="240" value={minutes} onChange={(e) => setMinutes(e.target.value)} required/></label></div>
        <label>Lesson content (Markdown supported)<textarea required rows={14} value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} placeholder={"## Learning objectives\n- Explain the key principles...\n\n## Lesson notes\nWrite accurate, referenced academic content.\n\n## Clinical relevance\nConnect the concepts to laboratory practice.\n\n## Knowledge check\n1. ...\n\n## References\nList textbooks, guidelines and peer-reviewed sources."}/></label>
        <p className="lecturer-hint">Include learning objectives, clear explanations, clinical relevance, a knowledge check and credible references. AI-generated drafts must be checked by a qualified academic before submission.</p>
        <button className="primary-button" disabled={busy || !selectedModule}>Save lesson draft →</button>
      </form></section>
      <section className="admin-card lecturer-wide"><div className="admin-card-head"><span>04 / REVIEW TRACKER</span><h2>Your academic content</h2></div>
        <label className="lecturer-course-select">Selected course<select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}><option value="">Choose a course</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        {activeCourse ? <div className="lecturer-outline"><article><span>COURSE · {activeCourse.review_status.replace("_"," ").toUpperCase()}</span><strong>{activeCourse.title}</strong><small>{activeCourse.status}</small></article>
          {availableModules.map((mod) => <div className="lecturer-outline-child" key={mod.id}><span>MODULE · {mod.review_status.replace("_"," ").toUpperCase()}</span><strong>{mod.title}</strong>{lessons.filter((lesson) => lesson.module_id === mod.id).map((lesson) => <p key={lesson.id}><span>LESSON · {lesson.review_status.replace("_"," ").toUpperCase()}</span><strong>{lesson.title}</strong></p>)}</div>)}
          <button className="primary-button lecturer-submit" disabled={busy || activeCourse.status === "published"} onClick={submitForReview}>Submit course and lessons for academic review →</button>
        </div> : <p className="lecturer-hint">Create a course to start building your academic library.</p>}
        <div className="lecturer-review-history"><h3>Review feedback</h3>{reviews.length ? reviews.map((review) => <article key={review.id}><div><strong>{review.item_type.toUpperCase()}</strong><span className={"academic-review-status status-" + review.status}>{review.status.replace("_"," ")}</span></div><p>{review.reviewer_comments || (review.status === "pending" ? "Waiting for an academic reviewer." : "No additional comments.")}</p><small>{new Date(review.submitted_at).toLocaleDateString()}</small></article>) : <p className="lecturer-hint">Your review requests and feedback will appear here.</p>}</div>
      </section>
    </div>
    {message && <p className="admin-feedback" role="status">{message}</p>}
    <footer className="admin-footer">LabBridge Learn · Lecturer Workspace · Academic review required before publication</footer>
  </main>;
}
