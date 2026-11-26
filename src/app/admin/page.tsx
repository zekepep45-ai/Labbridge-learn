"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Course = { id: string; title: string; slug: string; discipline: string; level: string | null; status: string };
type Module = { id: string; course_id: string; title: string; status: string };
type Lesson = { id: string; module_id: string; title: string; status: string };

export default function AdminPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [accessMessage, setAccessMessage] = useState("");
  const [signedInEmail, setSignedInEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [discipline, setDiscipline] = useState("Medical Laboratory Science");
  const [level, setLevel] = useState("Foundational");
  const [courseDescription, setCourseDescription] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonMinutes, setLessonMinutes] = useState("10");
  const [lessonContent, setLessonContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadContent() {
    const [{ data: courseRows }, { data: moduleRows }, { data: lessonRows }] = await Promise.all([
      supabase.from("courses").select("id,title,slug,discipline,level,status").order("created_at", { ascending: false }),
      supabase.from("course_modules").select("id,course_id,title,status").order("position"),
      supabase.from("lessons").select("id,module_id,title,status").order("position")
    ]);
    setCourses((courseRows ?? []) as Course[]);
    setModules((moduleRows ?? []) as Module[]);
    setLessons((lessonRows ?? []) as Lesson[]);
    if (!selectedCourse && courseRows?.[0]) setSelectedCourse(courseRows[0].id);
    if (!selectedModule && moduleRows?.[0]) setSelectedModule(moduleRows[0].id);
  }

  useEffect(() => {
    let active = true;
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { if (active) { setAccessMessage("No active sign-in session was found. Please sign in again."); setChecking(false); } return; }
      if (active) { setSignedInEmail(auth.user.email ?? "Email unavailable"); setCurrentUserId(auth.user.id); }
      const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id);
      if (roleError) {
        if (active) setAccessMessage("We could not check your content role: " + roleError.message);
        if (active) setChecking(false);
        return;
      }
      const canManage = (roles ?? []).some((item) => item.role === "admin" || item.role === "content_editor");
      if (!canManage && active) setAccessMessage("This signed-in account does not have an administrator or content-editor role.");
      if (active && canManage) {
        setAllowed(true);
        await loadContent();
      }
      if (active) setChecking(false);
    }
    void init();
    return () => { active = false; };
  }, [supabase]);

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const { data, error } = await supabase.from("courses").insert({
      title: courseTitle.trim(), slug: courseSlug.trim().toLowerCase(), description: courseDescription.trim(),
      discipline: discipline.trim(), level, status: "draft"
    }).select("id").single();
    if (error) setMessage("Course not saved: " + error.message);
    else {
      setCourseTitle(""); setCourseSlug(""); setCourseDescription("");
      await loadContent(); if (data) setSelectedCourse(data.id);
      setMessage("Draft course created. Add a module and lesson next.");
    }
    setBusy(false);
  }

  async function createModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedCourse) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("course_modules").insert({
      course_id: selectedCourse, title: moduleTitle.trim(),
      slug: moduleTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: moduleDescription.trim(), position: modules.filter((item) => item.course_id === selectedCourse).length,
      status: "draft"
    });
    if (error) setMessage("Module not saved: " + error.message);
    else { setModuleTitle(""); setModuleDescription(""); await loadContent(); setMessage("Draft module created."); }
    setBusy(false);
  }

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedModule) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("lessons").insert({
      module_id: selectedModule, title: lessonTitle.trim(),
      slug: lessonTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      summary: lessonSummary.trim(), estimated_minutes: Number(lessonMinutes),
      content_markdown: lessonContent.trim(), position: lessons.filter((item) => item.module_id === selectedModule).length,
      status: "draft"
    });
    if (error) setMessage("Lesson not saved: " + error.message);
    else { setLessonTitle(""); setLessonSummary(""); setLessonContent(""); await loadContent(); setMessage("Draft lesson created and saved."); }
    setBusy(false);
  }


  async function submitCourseForReview() {
    if (!selectedCourse || !currentUserId) return;
    const courseModules = modules.filter((item) => item.course_id === selectedCourse);
    if (!courseModules.length) { setMessage("Add at least one module before submitting for review."); return; }
    const moduleIds = courseModules.map((item) => item.id);
    const courseLessons = lessons.filter((item) => moduleIds.includes(item.module_id));
    if (!courseLessons.length) { setMessage("Add at least one lesson before submitting for review."); return; }
    setBusy(true); setMessage("");
    const items = [
      { item_type: "course", item_id: selectedCourse, submitted_by: currentUserId },
      ...courseModules.map((item) => ({ item_type: "module", item_id: item.id, submitted_by: currentUserId })),
      ...courseLessons.map((item) => ({ item_type: "lesson", item_id: item.id, submitted_by: currentUserId }))
    ];
    const itemIds = items.map((item) => item.item_id);
    const { data: existing, error: lookupError } = await supabase.from("academic_content_reviews")
      .select("item_id").eq("status", "pending").in("item_id", itemIds);
    if (lookupError) { setMessage("Could not check existing review submissions: " + lookupError.message); setBusy(false); return; }
    const pendingIds = new Set((existing ?? []).map((item) => item.item_id));
    const freshItems = items.filter((item) => !pendingIds.has(item.item_id));
    if (!freshItems.length) { setMessage("This course already has pending academic review submissions."); setBusy(false); return; }
    const { error } = await supabase.from("academic_content_reviews").insert(freshItems);
    if (error) setMessage("Could not submit content for review: " + error.message);
    else {
      setMessage("Submitted " + freshItems.length + " course, module and lesson item(s) for academic review. Publication remains locked until every item is approved.");
      await loadContent();
    }
    setBusy(false);
  }

  async function publishCourse() {
    if (!selectedCourse) {
      setMessage("Choose a course before publishing.");
      return;
    }
    const courseModules = modules.filter((item) => item.course_id === selectedCourse);
    if (!courseModules.length) { setMessage("Add at least one module before publishing."); return; }
    const moduleIds = courseModules.map((item) => item.id);
    const courseLessons = lessons.filter((item) => moduleIds.includes(item.module_id));
    if (!courseLessons.length) { setMessage("Add at least one lesson before publishing."); return; }
    setBusy(true); setMessage("");
    const moduleResult = await supabase.from("course_modules").update({ status: "published" }).in("id", moduleIds);
    if (moduleResult.error) { setMessage("Could not publish modules: " + moduleResult.error.message); setBusy(false); return; }
    const lessonResult = await supabase.from("lessons").update({ status: "published" }).in("module_id", moduleIds);
    if (lessonResult.error) { setMessage("Could not publish lessons: " + lessonResult.error.message); setBusy(false); return; }
    const courseResult = await supabase.from("courses").update({ status: "published" }).eq("id", selectedCourse);
    if (courseResult.error) setMessage("Content prepared, but course publication failed: " + courseResult.error.message);
    else { setMessage("Course published. It is now visible in the student learning library."); }
    await loadContent(); setBusy(false);
  }

  if (checking) return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Checking content team access…</p></main>;
  if (!allowed) return <main className="admin-page"><div className="admin-card"><span className="admin-kicker">LABBRIDGE CONTENT STUDIO</span><h1>Access restricted</h1><p>This workspace is available only to authorised administrators and content editors.</p>{accessMessage && <p className="admin-feedback">{accessMessage}</p>}<p>Signed in as: <strong>{signedInEmail || "Not signed in"}</strong></p><p>If this is not your administrator email, sign out and use the account that was granted access.</p><Link href="/">Return to learning dashboard →</Link></div></main>;

  const activeCourse = courses.find((item) => item.id === selectedCourse);
  const availableModules = modules.filter((item) => item.course_id === selectedCourse);

  return <main className="admin-page">
    <header className="admin-header"><Link href="/" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>CONTENT STUDIO</small></span></Link><nav className="admin-header-links"><Link href="/academic-review">Academic Review →</Link><Link href="/admin/assessments">Assessment Studio →</Link><Link href="/">← Student dashboard</Link></nav></header>
    <section className="admin-intro"><span className="admin-kicker">ACADEMIC CONTENT WORKSPACE</span><h1>Build the global learning library.</h1><p>Create globally relevant courses, organise modules and write lessons. New content stays in draft until it has been academically reviewed and deliberately published.</p></section>
    <div className="admin-notice"><strong>Academic quality gate</strong><span>Use lecturer-reviewed material, cite reliable international references, and verify clinical information before publishing. Include regional examples where they improve understanding, without restricting core learning to a single national curriculum. LabBridge lessons are educational and do not replace supervised clinical training.</span></div>
    <div className="admin-grid">
      <section className="admin-card"><div className="admin-card-head"><span>01 / COURSE</span><h2>Create a course</h2></div><form onSubmit={createCourse} className="admin-form">
        <label>Course title<input required value={courseTitle} onChange={(e) => { setCourseTitle(e.target.value); setCourseSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")); }} placeholder="Foundations of Medical Laboratory Science"/></label>
        <label>Course URL slug<input required value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)} placeholder="foundations-of-mls"/></label>
        <div className="admin-form-row"><label>Study level<select value={level} onChange={(e) => setLevel(e.target.value)}><option>Foundational</option><option>Intermediate</option><option>Advanced</option><option>Professional development</option></select></label><label>Discipline<input required value={discipline} onChange={(e) => setDiscipline(e.target.value)}/></label></div>
        <label>Course description<textarea required rows={3} value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} placeholder="What will learners understand or be able to do?"/></label>
        <button className="primary-button" disabled={busy}>Save draft course →</button>
      </form></section>
      <section className="admin-card"><div className="admin-card-head"><span>02 / MODULE</span><h2>Organise a module</h2></div><form onSubmit={createModule} className="admin-form">
        <label>Choose course<select required value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}><option value="">Select a course</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label>Module title<input required value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="Introduction to Medical Laboratory Science"/></label>
        <label>Module description<textarea rows={3} value={moduleDescription} onChange={(e) => setModuleDescription(e.target.value)} placeholder="Briefly describe this module."/></label>
        <button className="primary-button" disabled={busy || !selectedCourse}>Save draft module →</button>
      </form></section>
      <section className="admin-card admin-card-wide"><div className="admin-card-head"><span>03 / LESSON</span><h2>Write a lesson</h2></div><form onSubmit={createLesson} className="admin-form">
        <label>Choose module<select required value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}><option value="">Select a module</option>{modules.map((item) => <option key={item.id} value={item.id}>{courses.find((course) => course.id === item.course_id)?.title} — {item.title}</option>)}</select></label>
        <label>Lesson title<input required value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="What is Medical Laboratory Science?"/></label>
        <div className="admin-form-row"><label>Short summary<input value={lessonSummary} onChange={(e) => setLessonSummary(e.target.value)} placeholder="A concise lesson overview."/></label><label>Estimated minutes<input type="number" min="1" required value={lessonMinutes} onChange={(e) => setLessonMinutes(e.target.value)}/></label></div>
        <label>Lesson content (Markdown supported)<textarea required rows={12} value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} placeholder={"## Learning objectives\n- Explain...\n- Describe...\n\n## Lesson notes\nWrite clear, referenced academic content here.\n\n## Knowledge check\n1. ...\n\n## References\nAdd textbooks, guidelines or peer-reviewed sources."}/></label>
        <button className="primary-button" disabled={busy || !selectedModule}>Save draft lesson →</button>
      </form></section>
      <section className="admin-card admin-card-wide"><div className="admin-card-head"><span>04 / REVIEW & PUBLISH</span><h2>Review course status</h2></div>
        <div className="publish-layout"><div><label>Course to review<select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}><option value="">Select a course</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>{activeCourse && <div className="content-outline"><div><span>COURSE</span><strong>{activeCourse.title}</strong><small>{activeCourse.status.toUpperCase()}</small></div>{availableModules.map((mod) => <div className="outline-child" key={mod.id}><span>MODULE</span><strong>{mod.title}</strong><small>{mod.status.toUpperCase()}</small>{lessons.filter((lesson) => lesson.module_id === mod.id).map((lesson) => <p key={lesson.id}>↳ {lesson.title} <small>{lesson.status.toUpperCase()}</small></p>)}</div>)}</div>}</div>
        <div className="publish-check"><p>Submit the course, its modules and its lessons to the academic review queue. A reviewer must approve every item before the course can be published to learners.</p><button className="primary-button" disabled={busy || !activeCourse || activeCourse.status === "published"} onClick={submitCourseForReview}>Submit course for academic review →</button><p>After all review decisions are approved, an authorised content administrator can publish the course.</p><button className="primary-button" disabled={busy || !activeCourse || activeCourse.status === "published"} onClick={publishCourse}>Publish approved course to students ↗</button><small>Database safeguards block publication if any course, module or lesson has not been approved.</small></div></div>
      </section>
    </div>
    {message && <p className="admin-feedback" role="status">{message}</p>}
    <footer className="admin-footer">LabBridge Learn · Academic Content Studio</footer>
  </main>;
}
