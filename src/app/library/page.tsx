"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  discipline: string;
  level: string | null;
  status: string;
  created_at: string;
};
type CourseCounts = { modules: number; lessons: number };

const levels = ["All levels", "Foundational", "Intermediate", "Advanced", "Professional development"];

export default function AcademicLibraryPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [counts, setCounts] = useState<Record<string, CourseCounts>>({});
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState("All subjects");
  const [level, setLevel] = useState("All levels");
  const [sort, setSort] = useState("A–Z");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) { router.replace("/"); return; }
      const userId = auth.session.user.id;
      const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const admin = (roleRows ?? []).some((row) => ["admin", "content_editor"].includes(row.role));
      if (active) setIsAdmin(admin);

      let courseQuery = supabase.from("courses")
        .select("id,title,slug,description,discipline,level,status,created_at")
        .order("title");
      const { data, error: courseError } = await courseQuery;
      if (courseError) {
        if (active) { setError(courseError.message); setLoading(false); }
        return;
      }
      const list = (data ?? []) as Course[];
      const visible = list;
      const ids = visible.map((item) => item.id);
      const nextCounts: Record<string, CourseCounts> = {};
      if (ids.length) {
        const { data: moduleRows } = await supabase.from("course_modules")
          .select("id,course_id").in("course_id", ids)
          .eq("status", "published");
        const modules = moduleRows ?? [];
        const moduleIds = modules.map((item) => item.id);
        const lessonRows = moduleIds.length
          ? (await supabase.from("lessons").select("id,module_id").in("module_id", moduleIds).eq("status", "published")).data ?? []
          : [];
        for (const course of visible) {
          const courseModuleIds = modules.filter((item) => item.course_id === course.id).map((item) => item.id);
          nextCounts[course.id] = {
            modules: courseModuleIds.length,
            lessons: lessonRows.filter((item) => courseModuleIds.includes(item.module_id)).length
          };
        }
      }
      if (active) { setCourses(list); setCounts(nextCounts); setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [supabase, router]);

  const disciplines = useMemo(() => ["All subjects", ...Array.from(new Set(courses.filter((item) => item.status === "published").map((item) => item.discipline).filter(Boolean))).sort()], [courses]);
  const visibleCourses = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = courses.filter((course) => {
      const publishedOrPreview = true;
      const matchesTerm = !term || [course.title, course.description, course.discipline, course.level].some((value) => (value || "").toLowerCase().includes(term));
      const matchesDiscipline = discipline === "All subjects" || course.discipline === discipline;
      const matchesLevel = level === "All levels" || course.level === level;
      return publishedOrPreview && matchesTerm && matchesDiscipline && matchesLevel;
    });
    return filtered.sort((a, b) => sort === "Newest" ? b.created_at.localeCompare(a.created_at) : a.title.localeCompare(b.title));
  }, [courses, query, discipline, level, sort]);

  if (loading) return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Opening the academic library…</p></main>;

  return (
    <main className="library-page">
      <header className="library-header">
        <Link href="/" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></Link>
        <nav><Link href="/">Dashboard</Link><Link href="/admin">Content Studio</Link></nav>
      </header>
      <section className="library-hero">
        <div className="eyebrow"><span className="eyebrow-line"/> THE GLOBAL MLS KNOWLEDGE LIBRARY</div>
        <h1>Explore. Understand.<br/><em>Become exceptional.</em></h1>
        <p>Explore a connected learning library across Medical Laboratory Science. Find a subject, build strong foundations and progress towards advanced professional knowledge.</p>
        <div className="library-principles"><span>Global academic foundations</span><span>Multilingual by design</span><span>Built for lifelong learning</span></div>
      </section>
      <section className="library-content">
        <div className="library-heading"><div><div className="eyebrow">DISCOVER YOUR NEXT SUBJECT</div><h2>Academic library</h2><p>Search across disciplines and learning levels.</p></div><span className="library-count">{visibleCourses.length} {visibleCourses.length === 1 ? "course" : "courses"}</span></div>
        <div className="library-filters">
          <label className="library-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses, subjects or topics…" aria-label="Search courses"/></label>
          <label><span>Subject</span><select value={discipline} onChange={(event) => setDiscipline(event.target.value)}>{disciplines.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Learning level</span><select value={level} onChange={(event) => setLevel(event.target.value)}>{levels.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>A–Z</option><option>Newest</option></select></label>
        </div>
        {isAdmin && <div className="library-admin-toggle"><span>Admin view · includes courses in development</span><Link href="/admin">Manage academic content ↗</Link></div>}
        {!isAdmin && <p className="library-catalog-note">The catalogue includes courses in development. Lessons become accessible after academic review and publication.</p>}
        {error && <p className="library-error" role="alert">We couldn&apos;t load the library: {error}</p>}
        {visibleCourses.length ? <div className="library-grid">{visibleCourses.map((course) => {
          const courseCount = counts[course.id] || { modules: 0, lessons: 0 };
          return <article className="library-card" key={course.id}>
            <div className="library-card-top"><span className="library-symbol">✳</span><span className="library-level">{course.level || "MLS"}</span></div>
            <span className="library-discipline">{course.discipline}</span>
            <h3>{course.title}</h3>
            <p>{course.description || "A structured course designed to build understanding through clear explanations and guided learning."}</p>
            <div className="library-card-meta"><span>{courseCount.modules} modules</span><span>{courseCount.lessons} published lessons</span></div>
            {course.status !== "published" && <span className="library-draft">COMING SOON · UNDER DEVELOPMENT</span>}
            {course.status === "published" ? <Link className="library-open" href={"/courses/" + course.slug}>Explore course <span>↗</span></Link> : <span className="library-unavailable">Course content is being developed and academically reviewed</span>}
          </article>;
        })}</div> : <div className="library-empty"><span>✳</span><h3>{courses.length === 0 ? "The global library is being prepared" : "No courses match your search"}</h3><p>{courses.length === 0 ? "Our academic team is developing and reviewing the first collection of MLS courses. New learning content will appear here once it is ready for learners." : "Try another search term or adjust the subject and level filters."}</p>{(query || discipline !== "All subjects" || level !== "All levels") && <button onClick={() => { setQuery(""); setDiscipline("All subjects"); setLevel("All levels"); }}>Clear filters</button>}</div>}
      </section>
      <footer className="library-footer"><span>© 2026 LabBridge Learn</span><span>Learn. Practise. Advance.</span></footer>
    </main>
  );
}
