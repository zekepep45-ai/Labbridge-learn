"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { getMessages, type SupportedLocale } from "@/lib/i18n";

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
type Country = { code: string; name: string; default_language_code: string };

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
  const [language, setLanguage] = useState<SupportedLocale>("en");
  const [countryCode, setCountryCode] = useState("GH");
  const [countries, setCountries] = useState<Country[]>([]);
  const [planCode, setPlanCode] = useState("free");
  const preferenceChoice = useRef({ language: "en" as SupportedLocale, countryCode: "GH" });
  const t = getMessages(language);

  async function loadLearningSpace(currentUser: User) {
    const [{ data: profileData }, { data: courseData }, { data: enrollmentData }, { data: progressData }, { data: preferenceData }, { data: countryData }, { data: subscriptionData }] = await Promise.all([
      supabase.from("profiles").select("full_name, student_number").eq("id", currentUser.id).maybeSingle(),
      supabase.from("courses").select("id, title, slug, description, discipline, level, cover_image_url").eq("status", "published").order("created_at", { ascending: false }),
      supabase.from("enrollments").select("course_id").eq("user_id", currentUser.id),
      supabase.from("learning_progress").select("id, completion_percent").eq("user_id", currentUser.id),
      supabase.from("user_preferences").select("preferred_language,country_code").eq("user_id", currentUser.id).maybeSingle(),
      supabase.from("countries").select("code,name,default_language_code").eq("is_enabled", true).order("name"),
      supabase.from("user_subscriptions").select("plan_code").eq("user_id", currentUser.id).in("status", ["active", "trialing"]).maybeSingle()
    ]);

    if (profileData) setProfile(profileData);
    else {
      const name = (currentUser.user_metadata?.full_name as string | undefined) ?? "";
      const { data } = await supabase.from("profiles").upsert({ id: currentUser.id, full_name: name }, { onConflict: "id" }).select("full_name, student_number").maybeSingle();
      setProfile(data ?? { full_name: name, student_number: null });
    }
    if (preferenceData?.preferred_language) {
      const savedLanguage = preferenceData.preferred_language as SupportedLocale;
      const savedCountry = preferenceData.country_code || "GH";
      preferenceChoice.current = { language: savedLanguage, countryCode: savedCountry };
      setLanguage(savedLanguage); setCountryCode(savedCountry);
    } else {
      const choice = preferenceChoice.current;
      setLanguage(choice.language); setCountryCode(choice.countryCode);
      await supabase.from("user_preferences").upsert({ user_id: currentUser.id, preferred_language: choice.language, country_code: choice.countryCode }, { onConflict: "user_id" });
    }
    setCountries((countryData ?? []) as Country[]);
    let activePlan = subscriptionData?.plan_code as string | undefined;
    if (!activePlan) {
      const { data: newSubscription } = await supabase.from("user_subscriptions").insert({ user_id: currentUser.id, plan_code: "free", status: "active" }).select("plan_code").single();
      activePlan = newSubscription?.plan_code;
    }
    setPlanCode(activePlan || "free");
    setCourses(courseData ?? []);
    setEnrolled((enrollmentData ?? []).map((item) => item.course_id));
    setCompletedLessons((progressData ?? []).filter((item) => item.completion_percent >= 100).length);
  }

  useEffect(() => {
    let active = true;
    supabase.from("countries").select("code,name,default_language_code").eq("is_enabled", true).order("name").then(({ data }) => { if (active && data) setCountries(data as Country[]); });
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
        if (data.session) setMessage(t.welcomeMessage);
        else setMessage(t.accountCreated);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage(t.welcomeBackMessage);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  async function savePreferences(nextLanguage: SupportedLocale, nextCountry: string) {
    preferenceChoice.current = { language: nextLanguage, countryCode: nextCountry };
    setLanguage(nextLanguage);
    setCountryCode(nextCountry);
    if (!user) return;
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      preferred_language: nextLanguage,
      country_code: nextCountry
    }, { onConflict: "user_id" });
    if (error) setMessage("Your preference could not be saved: " + error.message);
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
    <main className="auth-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="auth-brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span><div className="auth-preferences"><label>{t.language}<select value={language} onChange={(e) => { const value = e.target.value as SupportedLocale; preferenceChoice.current.language = value; setLanguage(value); }}><option value="en">English</option><option value="fr">Français</option><option value="pt">Português</option><option value="ar">العربية</option><option value="sw">Kiswahili</option><option value="es">Español</option></select></label><label>{t.country}<select value={countryCode} onChange={(e) => { preferenceChoice.current.countryCode = e.target.value; setCountryCode(e.target.value); }}>{countries.length ? countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>) : <option value="GH">Ghana</option>}</select></label></div></div>
      <section className="auth-layout">
        <div className="auth-story">
          <div className="eyebrow"><span className="eyebrow-line" /> THE NEXT GENERATION OF MLS LEARNING</div>
          <h1>Learn with purpose.<br/><em>Grow with confidence.</em></h1>
          <p>A richer way to study Medical Laboratory Science — with trusted lessons, practical learning, visual explanations and a community built for your progress.</p>
          <div className="auth-pill-row"><span>✳ Global curriculum pathways</span><span>◉ Visual learning</span><span>⌁ Learn at your pace</span></div>
          <div className="auth-illustration"><div className="auth-orbit"/><div className="auth-orbit second"/><div className="auth-cell">✳</div><span className="float-tag tag-one">LEARN</span><span className="float-tag tag-two">PRACTISE</span><span className="float-tag tag-three">ADVANCE</span></div>
        </div>
        <div className="auth-card">
          <div className="eyebrow">{authMode === "signin" ? "YOUR LEARNING SPACE" : "START YOUR JOURNEY"}</div>
          <h2>{authMode === "signin" ? t.welcomeBack : t.createAccount}</h2>
          <p className="auth-subtitle">{authMode === "signin" ? t.continueLearning : t.joinCommunity}</p>
          <form onSubmit={handleAuth} className="auth-form">
            {authMode === "signup" && <label>{t.fullName}<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required autoComplete="name"/></label>}
            <label>{t.email}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label>
            <label>{t.password}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required autoComplete={authMode === "signin" ? "current-password" : "new-password"}/></label>
            <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : authMode === "signin" ? t.signInToLabBridge + " →" : t.createAccount + " →"}</button>
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
    <main className="app-shell" dir={language === "ar" ? "rtl" : "ltr"}>
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="LabBridge Learn home"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></a>
        <div className="workspace-label">LEARNING SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><span className="nav-icon">▦</span> {t.overview}</a>
          <a className="nav-item" href="#courses"><span className="nav-icon">▤</span> {t.myCourses}</a>
          <a className="nav-item" href="#resources"><span className="nav-icon">▧</span> {t.studyResources}</a>
          <a className="nav-item" href="#practice"><span className="nav-icon">◎</span> {t.practiceQuizzes}</a>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-symbol">✦</div><strong>Keep your momentum</strong><p>Small study sessions add up. Make today count.</p><a href="#courses">Explore learning ↗</a></div><div className="sidebar-footer"><span className="status-dot"/> Your learning space <span>{countries.find((item) => item.code === countryCode)?.name || "Global"}</span></div></div>
      </aside>
      <section className="main-area" id="overview">
        <header className="topbar"><div className="breadcrumb">LabBridge <span>/</span> <strong>Overview</strong></div><div className="top-actions"><label className="top-preference"><span>{t.language}</span><select value={language} onChange={(e) => void savePreferences(e.target.value as SupportedLocale, countryCode)}><option value="en">EN</option><option value="fr">FR</option><option value="pt">PT</option><option value="ar">AR</option><option value="sw">SW</option><option value="es">ES</option></select></label><label className="top-preference country-preference"><span>{t.country}</span><select value={countryCode} onChange={(e) => void savePreferences(language, e.target.value)}>{countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><span className="plan-pill">{planCode.toUpperCase()}</span><span className="welcome-label">{user.email}</span><div className="avatar">{displayName.split(" ").map((part) => part[0]).slice(0,2).join("").toUpperCase()}</div><button className="signout-button" onClick={signOut}>{t.signOut}</button></div></header>
        <div className="content">
          <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR MLS LEARNING JOURNEY</div><h1>{t.welcome}, {firstName}.<br/><em>{t.keepGrowing}</em></h1><p className="intro">{t.journeyIntro}</p></div><div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-cross">+</div><div className="art-core"><span>LAB</span><strong>✳</strong><span>LEARN</span></div><div className="art-dot dot-one"/><div className="art-dot dot-two"/><div className="art-dot dot-three"/></div></section>
          <section className="stats-grid" aria-label="Learning summary"><div className="stat-card"><span className="stat-icon green">▤</span><div><strong>{myCourses.length.toString().padStart(2,"0")}</strong><span>{t.coursesEnrolled}</span></div><small>LIVE</small></div><div className="stat-card"><span className="stat-icon violet">◷</span><div><strong>{completedLessons.toString().padStart(2,"0")}</strong><span>{t.lessonsCompleted}</span></div><small>PROGRESS</small></div><div className="stat-card"><span className="stat-icon amber">✧</span><div><strong>{courses.length.toString().padStart(2,"0")}</strong><span>{t.publishedCourses}</span></div><small>AVAILABLE</small></div></section>
          <section className="section-block" id="courses"><div className="section-heading"><div><div className="eyebrow">{t.nextStep}</div><h2>{myCourses.length ? t.yourPaths : t.explorePaths}</h2></div><span className="text-link">{courses.length} {t.coursesAvailable}</span></div>
            {courses.length === 0 ? <div className="empty-state"><span>✳</span><h3>{t.libraryPreparing}</h3><p>{t.libraryDescription}</p></div> : <div className="course-grid">{courses.map((course) => <article className="course-card" key={course.id}><div className="course-top"><span className="course-icon mint">✳</span><span className="course-code">{course.level || course.discipline}</span></div><h3>{course.title}</h3><p>{course.description || "Build your knowledge with guided lessons and practical learning resources."}</p><div className="course-meta"><span>{course.discipline}</span><strong>{enrolled.includes(course.id) ? "ENROLLED" : "READY TO START"}</strong></div><div className="progress-track"><span style={{width: enrolled.includes(course.id) ? "8%" : "0%"}}/></div>{enrolled.includes(course.id) ? <a className="course-link" href={"/courses/" + course.slug}>Open course <span>↗</span></a> : <button className="course-link" disabled={busy} onClick={() => enroll(course.id)}>Enrol in course <span>↗</span></button>}</article>)}</div>}
          </section>
          {message && <p className="dashboard-message" role="status">{message}</p>}
          <section className="lower-grid" id="resources"><div className="resource-panel"><div className="section-heading compact"><div><div className="eyebrow">YOUR LEARNING TOOLS</div><h2>{t.exploreExperience}</h2></div></div><div className="topic-list"><div className="topic-row"><span className="topic-number">01</span><span className="topic-copy"><strong>{t.visualLessons}</strong><small>{t.visualDescription}</small></span><span className="topic-arrow">→</span></div><div className="topic-row"><span className="topic-number">02</span><span className="topic-copy"><strong>{t.virtualLab}</strong><small>{t.virtualDescription}</small></span><span className="topic-arrow">→</span></div><div className="topic-row"><span className="topic-number">03</span><span className="topic-copy"><strong>{t.aiAssistant}</strong><small>{t.aiDescription}</small></span><span className="topic-arrow">→</span></div></div></div><aside className="quote-panel" id="practice"><div className="quote-mark">“</div><p>Every accurate result begins with a curious mind and a careful process.</p><div className="quote-rule"/><span>THE LABBRIDGE MINDSET</span><div className="quote-decoration">✳</div></aside></section>
          <footer className="page-footer"><span>© 2026 LabBridge Learn</span><span>Built for the next generation of laboratory professionals <b>✦</b></span></footer>
        </div>
      </section>
    </main>
  );
}
