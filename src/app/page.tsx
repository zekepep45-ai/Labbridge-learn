"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  discipline: string;
  level: string | null;
  cover_image_url: string | null;
};

type Profile = { full_name: string | null; student_number: string | null };

export default function Home() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadLearningSpace(currentUser: User) {
    const [{ data: profileData }, { data: courseData }, { data: enrollmentData }, { data: progressData }] = await Promise.all([
      supabase.from("profiles").select("full_name, student_number").eq("id", currentUser.id).maybeSingle(),
      supabase.from("courses").select("id, title, slug, description, discipline, level, cover_image_url").eq("status", "published").order("created_at", { ascending: false }),
      supabase.from("enrollments").select("course_id").eq("user_id", currentUser.id),
      supabase.from("learning_progress").select("id, completion_percent").eq("user_id", currentUser.id)
    ]);

    if (profileData) setProfile(profileData);
    else {
      const name = (currentUser.user_metadata?.full_name as string | undefined) ?? "";
      const { data } = await supabase.from("profiles").upsert({ id: currentUser.id, full_name: name }, { onConflict: "id" }).select("full_name, student_number").maybeSingle();
      setProfile(data ?? { full_name: name, student_number: null });
    }
    setCourses(courseData ?? []);
    setEnrolled((enrollmentData ?? []).map((item) => item.course_id));
    setCompletedLessons((progressData ?? []).filter((item) => item.completion_percent >= 100).length);
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      if (data.session?.user) await loadLearningSpace(data.session.user);
      if (active) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        setTimeout(() => { if (active) void loadLearningSpace(nextUser); }, 0);
      } else {
        setProfile(null); setCourses([]); setEnrolled([]); setCompletedLessons(0);
      }
      setLoading(false);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName.trim() } }
        });
        if (error) throw error;
        if (data.session) setMessage("Your account is ready. Welcome to LabBridge!");
        else setMessage("Account created. Check your email to confirm your address, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("Welcome back.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  async function enroll(courseId: string) {
    if (!user) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("enrollments").insert({ user_id: user.id, course_id: courseId });
    if (error && error.code !== "23505") setMessage(error.message);
    else { setEnrolled((current) => [...current, courseId]); setMessage("You're enrolled. Your learning journey starts now."); }
    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage("You have signed out.");
  }

  if (loading) return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Preparing your learning space…</p></main>;

  if (!user) return (
    <main className="auth-page">
      <div className="auth-brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></div>
      <section className="auth-layout">
        <div className="auth-story">
          <div className="eyebrow"><span className="eyebrow-line" /> THE NEXT GENERATION OF MLS LEARNING</div>
          <h1>Learn with purpose.<br/><em>Grow with confidence.</em></h1>
          <p>A richer way to study Medical Laboratory Science — with trusted lessons, practical learning, visual explanations and a community built for your progress.</p>
          <div className="auth-pill-row"><span>✳ Ghana-focused curriculum</span><span>◉ Visual learning</span><span>⌁ Learn at your pace</span></div>
          <div className="auth-illustration"><div className="auth-orbit"/><div className="auth-orbit second"/><div className="auth-cell">✳</div><span className="float-tag tag-one">LEARN</span><span className="float-tag tag-two">PRACTISE</span><span className="float-tag tag-three">ADVANCE</span></div>
        </div>
        <div className="auth-card">
          <div className="eyebrow">{authMode === "signin" ? "YOUR LEARNING SPACE" : "START YOUR JOURNEY"}</div>
          <h2>{authMode === "signin" ? "Welcome back" : "Create your account"}</h2>
          <p className="auth-subtitle">{authMode === "signin" ? "Sign in to continue learning." : "Join a growing community of laboratory science learners."}</p>
          <form onSubmit={handleAuth} className="auth-form">
            {authMode === "signup" && <label>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required autoComplete="name"/></label>}
            <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required autoComplete={authMode === "signin" ? "current-password" : "new-password"}/></label>
            <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : authMode === "signin" ? "Sign in to LabBridge →" : "Create account →"}</button>
          </form>
          {message && <p className="auth-message" role="status">{message}</p>}
          <p className="auth-switch">{authMode === "signin" ? "New to LabBridge?" : "Already have an account?"} <button onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setMessage(""); }}>{authMode === "signin" ? "Create an account" : "Sign in"}</button></p>
          <p className="auth-legal">By continuing, you agree to use LabBridge as an educational resource. It does not replace supervised clinical training.</p>
        </div>
      </section>
      <footer className="auth-footer">© 2026 LabBridge Learn · Learn. Practise. Advance.</footer>
    </main>
  );

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Learner";
  const firstName = displayName.split(" ")[0];
  const myCourses = courses.filter((course) => enrolled.includes(course.id));

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="LabBridge Learn home"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></a>
        <div className="workspace-label">LEARNING SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><span className="nav-icon">▦</span> Overview</a>
          <a className="nav-item" href="#courses"><span className="nav-icon">▤</span> My courses</a>
          <a className="nav-item" href="#resources"><span className="nav-icon">▧</span> Study resources</a>
          <a className="nav-item" href="#practice"><span className="nav-icon">◎</span> Practice & quizzes</a>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-symbol">✦</div><strong>Keep your momentum</strong><p>Small study sessions add up. Make today count.</p><a href="#courses">Explore learning ↗</a></div><div className="sidebar-footer"><span className="status-dot"/> Your learning space <span>Ghana</span></div></div>
      </aside>
      <section className="main-area" id="overview">
        <header className="topbar"><div className="breadcrumb">LabBridge <span>/</span> <strong>Overview</strong></div><div className="top-actions"><span className="welcome-label">{user.email}</span><div className="avatar">{displayName.split(" ").map((part) => part[0]).slice(0,2).join("").toUpperCase()}</div><button className="signout-button" onClick={signOut}>Sign out</button></div></header>
        <div className="content">
          <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR MLS LEARNING JOURNEY</div><h1>Welcome, {firstName}.<br/><em>Keep growing.</em></h1><p className="intro">Your personal space to strengthen Medical Laboratory Science knowledge, practise with purpose and build confidence one concept at a time.</p></div><div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-cross">+</div><div className="art-core"><span>LAB</span><strong>✳</strong><span>LEARN</span></div><div className="art-dot dot-one"/><div className="art-dot dot-two"/><div className="art-dot dot-three"/></div></section>
          <section className="stats-grid" aria-label="Learning summary"><div className="stat-card"><span className="stat-icon green">▤</span><div><strong>{myCourses.length.toString().padStart(2,"0")}</strong><span>Courses enrolled</span></div><small>LIVE</small></div><div className="stat-card"><span className="stat-icon violet">◷</span><div><strong>{completedLessons.toString().padStart(2,"0")}</strong><span>Lessons completed</span></div><small>PROGRESS</small></div><div className="stat-card"><span className="stat-icon amber">✧</span><div><strong>{courses.length.toString().padStart(2,"0")}</strong><span>Published courses</span></div><small>AVAILABLE</small></div></section>
          <section className="section-block" id="courses"><div className="section-heading"><div><div className="eyebrow">YOUR NEXT STEP</div><h2>{myCourses.length ? "Your learning paths" : "Explore learning paths"}</h2></div><span className="text-link">{courses.length} courses available</span></div>
            {courses.length === 0 ? <div className="empty-state"><span>✳</span><h3>Your learning library is being prepared</h3><p>New courses will appear here as soon as they are published by the LabBridge academic team.</p></div> : <div className="course-grid">{courses.map((course) => <article className="course-card" key={course.id}><div className="course-top"><span className="course-icon mint">✳</span><span className="course-code">{course.level || course.discipline}</span></div><h3>{course.title}</h3><p>{course.description || "Build your knowledge with guided lessons and practical learning resources."}</p><div className="course-meta"><span>{course.discipline}</span><strong>{enrolled.includes(course.id) ? "ENROLLED" : "READY TO START"}</strong></div><div className="progress-track"><span style={{width: enrolled.includes(course.id) ? "8%" : "0%"}}/></div>{enrolled.includes(course.id) ? <a className="course-link" href={"/courses/" + course.slug}>Open course <span>↗</span></a> : <button className="course-link" disabled={busy} onClick={() => enroll(course.id)}>Enrol in course <span>↗</span></button>}</article>)}</div>}
          </section>
          {message && <p className="dashboard-message" role="status">{message}</p>}
          <section className="lower-grid" id="resources"><div className="resource-panel"><div className="section-heading compact"><div><div className="eyebrow">YOUR LEARNING TOOLS</div><h2>Explore the LabBridge experience</h2></div></div><div className="topic-list"><div className="topic-row"><span className="topic-number">01</span><span className="topic-copy"><strong>Visual lessons & demonstrations</strong><small>Diagrams, animations and practical videos</small></span><span className="topic-arrow">→</span></div><div className="topic-row"><span className="topic-number">02</span><span className="topic-copy"><strong>Virtual laboratory</strong><small>Interactive case and microscopy practice</small></span><span className="topic-arrow">→</span></div><div className="topic-row"><span className="topic-number">03</span><span className="topic-copy"><strong>AI learning assistant</strong><small>Guided explanations with trusted sources</small></span><span className="topic-arrow">→</span></div></div></div><aside className="quote-panel" id="practice"><div className="quote-mark">“</div><p>Every accurate result begins with a curious mind and a careful process.</p><div className="quote-rule"/><span>THE LABBRIDGE MINDSET</span><div className="quote-decoration">✳</div></aside></section>
          <footer className="page-footer"><span>© 2026 LabBridge Learn</span><span>Built for the next generation of laboratory professionals <b>✦</b></span></footer>
        </div>
      </section>
    </main>
  );
}
