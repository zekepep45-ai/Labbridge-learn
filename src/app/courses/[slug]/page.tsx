"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Course = { id: string; title: string; description: string | null; discipline: string; level: string | null };
type Module = { id: string; title: string; description: string | null; position: number };
type Lesson = { id: string; module_id: string; title: string; summary: string | null; content_markdown: string | null; estimated_minutes: number | null; position: number };
type Resource = { id: string; lesson_id: string | null; title: string; description: string | null; resource_type: string; external_url: string | null; storage_path: string | null };
type Progress = { id: string; lesson_id: string; completion_percent: number };
type ModuleTranslation = { module_id: string; title: string; description: string | null };
type LessonTranslation = { lesson_id: string; title: string; summary: string | null; content_markdown: string | null };

export default function CoursePage() {
  const params = useParams<{ slug: string }>();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [language, setLanguage] = useState("en");
  const [translatedLessons, setTranslatedLessons] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) { window.location.href = "/"; return; }
      const { data: preferenceData } = await supabase.from("user_preferences").select("preferred_language").eq("user_id", auth.session.user.id).maybeSingle();
      const preferredLanguage = preferenceData?.preferred_language || "en";
      if (active) setLanguage(preferredLanguage);
      const { data: courseData, error } = await supabase.from("courses")
        .select("id, title, description, discipline, level")
        .eq("slug", params.slug).eq("status", "published").maybeSingle();
      if (error || !courseData) { if (active) { setMessage("We couldn't find this published course."); setLoading(false); } return; }
      const { data: moduleData } = await supabase.from("course_modules")
        .select("id, title, description, position").eq("course_id", courseData.id)
        .eq("status", "published").order("position");
      const moduleIds = (moduleData ?? []).map((item) => item.id);
      let lessonData: Lesson[] = [];
      if (moduleIds.length) {
        const { data } = await supabase.from("lessons")
          .select("id, module_id, title, summary, content_markdown, estimated_minutes, position")
          .in("module_id", moduleIds).eq("status", "published").order("position");
        lessonData = (data ?? []) as Lesson[];
      }
      const [{ data: progressData }, { data: resourceData }] = await Promise.all([
        supabase.from("learning_progress").select("id, lesson_id, completion_percent").eq("user_id", auth.session.user.id),
        supabase.from("learning_resources").select("id, lesson_id, title, description, resource_type, external_url, storage_path").eq("status", "published")
      ]);
      let translatedCourse = courseData as Course;
      let translatedModules = (moduleData ?? []) as Module[];
      let translatedLessonsList = lessonData;
      if (preferredLanguage !== "en") {
        const [{ data: courseTranslation }, { data: moduleTranslations }, { data: lessonTranslations }] = await Promise.all([
          supabase.from("course_translations").select("title,description").eq("course_id", courseData.id).eq("language_code", preferredLanguage).eq("translation_status", "published").maybeSingle(),
          moduleIds.length
            ? supabase.from("module_translations").select("module_id,title,description").in("module_id", moduleIds).eq("language_code", preferredLanguage).eq("translation_status", "published")
            : Promise.resolve({ data: [] as ModuleTranslation[] }),
          lessonData.length
            ? supabase.from("lesson_translations").select("lesson_id,title,summary,content_markdown").in("lesson_id", lessonData.map((item) => item.id)).eq("language_code", preferredLanguage).eq("translation_status", "published")
            : Promise.resolve({ data: [] as LessonTranslation[] })
        ]);
        if (courseTranslation) translatedCourse = { ...translatedCourse, title: courseTranslation.title, description: courseTranslation.description };
        const moduleMap = new Map(((moduleTranslations ?? []) as ModuleTranslation[]).map((item) => [item.module_id, item]));
        translatedModules = translatedModules.map((item) => {
          const translation = moduleMap.get(item.id);
          return translation ? { ...item, title: translation.title, description: translation.description } : item;
        });
        const lessonMap = new Map(((lessonTranslations ?? []) as LessonTranslation[]).map((item) => [item.lesson_id, item]));
        translatedLessonsList = lessonData.map((item) => {
          const translation = lessonMap.get(item.id);
          return translation ? { ...item, title: translation.title, summary: translation.summary, content_markdown: translation.content_markdown } : item;
        });
        if (active) setTranslatedLessons(lessonMap.size);
      }
      if (!active) return;
      setCourse(translatedCourse);
      setModules(translatedModules);
      setLessons(translatedLessonsList);
      setProgress((progressData ?? []) as Progress[]);
      setResources(((resourceData ?? []) as Resource[]).filter((r) => !r.lesson_id || lessonData.some((l) => l.id === r.lesson_id)));
      setSelected(translatedLessonsList[0] ?? null);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [params.slug, supabase]);

  async function markComplete() {
    if (!selected) return;
    setBusy(true); setMessage("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setMessage("Please sign in again to save your progress."); setBusy(false); return; }
    const existing = progress.find((item) => item.lesson_id === selected.id);
    const now = new Date().toISOString();
    const result = existing
      ? await supabase.from("learning_progress").update({ completion_percent: 100, completed_at: now, last_accessed_at: now, updated_at: now }).eq("id", existing.id)
      : await supabase.from("learning_progress").insert({ user_id: auth.user.id, lesson_id: selected.id, completion_percent: 100, completed_at: now, last_accessed_at: now });
    if (result.error) setMessage("We couldn't save your progress: " + result.error.message);
    else {
      setProgress((items) => existing
        ? items.map((item) => item.id === existing.id ? { ...item, completion_percent: 100 } : item)
        : [...items, { id: "local-" + selected.id, lesson_id: selected.id, completion_percent: 100 }]);
      setMessage("Lesson completed. Your progress has been saved.");
    }
    setBusy(false);
  }

  if (loading) return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Opening your course…</p></main>;

  const completedCount = progress.filter((item) => item.completion_percent >= 100).length;
  const currentResources = resources.filter((item) => !item.lesson_id || item.lesson_id === selected?.id);

  return (
    <main className="course-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="course-header"><Link href="/" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></Link><span className="course-language">{language.toUpperCase()}{language !== "en" ? " · " + translatedLessons + "/" + lessons.length + " lessons translated" : " · ENGLISH"}</span><Link href="/" className="back-link">← Learning dashboard</Link></header>
      {message && !course ? <div className="course-notice">{message}</div> : course && <>
        <section className="course-hero"><div className="eyebrow"><span className="eyebrow-line"/> {course.level || "MLS CURRICULUM"} · {course.discipline}</div><h1>{course.title}</h1><p>{course.description || "Build your understanding through structured lessons and supporting learning resources."}</p><div className="course-progress-summary"><span>{completedCount} of {lessons.length} lessons completed</span><div className="progress-track"><span style={{ width: lessons.length ? Math.min(100, completedCount / lessons.length * 100) + "%" : "0%" }}/></div></div></section>
        <div className="course-layout">
          <aside className="lesson-sidebar"><div className="lesson-sidebar-title">COURSE CONTENT <span>{lessons.length} lessons</span></div>{modules.map((module, index) => <section className="module-block" key={module.id}><div className="module-title"><span>MODULE {String(index + 1).padStart(2,"0")}</span><strong>{module.title}</strong></div>{lessons.filter((lesson) => lesson.module_id === module.id).map((lesson) => <button key={lesson.id} className={"lesson-nav " + (selected?.id === lesson.id ? "selected" : "")} onClick={() => setSelected(lesson)}><span className="lesson-check">{progress.some((item) => item.lesson_id === lesson.id && item.completion_percent >= 100) ? "✓" : "○"}</span><span>{lesson.title}<small>{lesson.estimated_minutes || 5} min</small></span></button>)}</section>)}</aside>
          <article className="lesson-content">{selected ? <><div className="eyebrow">LESSON {String(lessons.findIndex((lesson) => lesson.id === selected.id) + 1).padStart(2,"0")} · {selected.estimated_minutes || 5} MIN READ</div><h2>{selected.title}</h2>{selected.summary && <p className="lesson-summary">{selected.summary}</p>}<div className="lesson-body">{selected.content_markdown || "This lesson is being prepared by the LabBridge academic team. Please check back soon."}</div>{currentResources.length > 0 && <section className="lesson-resources"><h3>Learning resources</h3>{currentResources.map((resource) => <a key={resource.id} href={resource.external_url || "#"} target={resource.external_url ? "_blank" : undefined} rel="noreferrer" className="resource-link"><span>↗</span><span><strong>{resource.title}</strong><small>{resource.description || resource.resource_type}</small></span></a>)}</section>}<div className="lesson-actions"><span>{progress.some((item) => item.lesson_id === selected.id && item.completion_percent >= 100) ? "Completed" : "Ready when you are"}</span><button className="primary-button" disabled={busy || progress.some((item) => item.lesson_id === selected.id && item.completion_percent >= 100)} onClick={markComplete}>{busy ? "Saving…" : "Mark lesson complete ✓"}</button></div>{message && <p className="auth-message" role="status">{message}</p>}</> : <div className="empty-state"><span>✳</span><h3>Lessons are being prepared</h3><p>The academic team will publish this course content soon.</p></div>}</article>
        </div>
      </>}
    </main>
  );
}
