"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { getMessages, type SupportedLocale } from "@/lib/i18n";
import LandingPage from "@/components/LandingPage";
import StudentDashboard from "@/components/StudentDashboard";

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
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "reset">("signin");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [courseProgress, setCourseProgress] = useState<Record<string, { percent: number; completed: number; total: number; nextLesson: string | null }>>({});
  const [overallProgress, setOverallProgress] = useState(0);
  const [recentActivity, setRecentActivity] = useState<{ title: string; courseTitle: string; lastAccessedAt: string; percent: number }[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [language, setLanguage] = useState<SupportedLocale>("en");
  const [countryCode, setCountryCode] = useState("GH");
  const [countries, setCountries] = useState<Country[]>([]);
  const [planCode, setPlanCode] = useState("free");
  const [canReviewAcademicContent, setCanReviewAcademicContent] = useState(false);
  const [canCreateAcademicContent, setCanCreateAcademicContent] = useState(false);
  const preferenceChoice = useRef({ language: "en" as SupportedLocale, countryCode: "GH" });
  const t = getMessages(language);

  async function loadLearningSpace(currentUser: User) {
    const [{ data: profileData }, { data: courseData }, { data: enrollmentData }, { data: progressData }, { data: preferenceData }, { data: countryData }, { data: subscriptionData }, { data: roleRows }, { data: moduleData }, { data: lessonData }] = await Promise.all([
      supabase.from("profiles").select("full_name, student_number").eq("id", currentUser.id).maybeSingle(),
      supabase.from("courses").select("id, title, slug, description, discipline, level, cover_image_url").eq("status", "published").order("created_at", { ascending: false }),
      supabase.from("enrollments").select("course_id").eq("user_id", currentUser.id),
      supabase.from("learning_progress").select("id, lesson_id, completion_percent, last_accessed_at").eq("user_id", currentUser.id),
      supabase.from("user_preferences").select("preferred_language,country_code").eq("user_id", currentUser.id).maybeSingle(),
      supabase.from("countries").select("code,name,default_language_code").eq("is_enabled", true).order("name"),
      supabase.from("user_subscriptions").select("plan_code").eq("user_id", currentUser.id).in("status", ["active", "trialing"]).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", currentUser.id),
      supabase.from("course_modules").select("id,course_id"),
      supabase.from("lessons").select("id,title,slug,module_id,estimated_minutes").eq("status", "published").order("position")
    ]);

    setCanReviewAcademicContent((roleRows ?? []).some((item) => ["admin", "academic_reviewer"].includes(item.role)));
    setCanCreateAcademicContent((roleRows ?? []).some((item) => ["admin", "content_editor", "lecturer"].includes(item.role)));
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
    const moduleCourse = new Map((moduleData ?? []).map((item) => [item.id, item.course_id]));
    const lessonCourse = new Map((lessonData ?? []).map((item) => [item.id, moduleCourse.get(item.module_id)]));
    const lessonById = new Map((lessonData ?? []).map((item) => [item.id, item]));
    const progressByLesson = new Map((progressData ?? []).map((item) => [item.lesson_id, item]));
    const nextCourseProgress: Record<string, { percent: number; completed: number; total: number; nextLesson: string | null }> = {};
    let totalLessonCount = 0;
    let totalPercent = 0;
    const enrolledIds = new Set((enrollmentData ?? []).map((item) => item.course_id));
    for (const course of (courseData ?? [])) {
      const courseLessons = (lessonData ?? []).filter((lesson) => moduleCourse.get(lesson.module_id) === course.id);
      const courseRows = courseLessons.map((lesson) => progressByLesson.get(lesson.id));
      const completed = courseRows.filter((item) => (item?.completion_percent ?? 0) >= 100).length;
      const percent = courseLessons.length ? Math.round(courseRows.reduce((sum, item) => sum + (item?.completion_percent ?? 0), 0) / courseLessons.length) : 0;
      const nextLesson = courseLessons.find((lesson) => (progressByLesson.get(lesson.id)?.completion_percent ?? 0) < 100)?.title ?? null;
      nextCourseProgress[course.id] = { percent, completed, total: courseLessons.length, nextLesson };
      if (enrolledIds.has(course.id)) {
        totalLessonCount += courseLessons.length;
        totalPercent += courseLessons.reduce((sum, lesson) => sum + (progressByLesson.get(lesson.id)?.completion_percent ?? 0), 0);
      }
    }
    setCourseProgress(nextCourseProgress);
    setCompletedLessons([...enrolledIds].reduce((sum, id) => sum + (nextCourseProgress[id]?.completed ?? 0), 0));
    setOverallProgress(totalLessonCount ? Math.round(totalPercent / totalLessonCount) : 0);
    const courseTitleById = new Map((courseData ?? []).map((course) => [course.id, course.title]));
    const activity = (progressData ?? []).filter((item) => item.last_accessed_at && lessonById.has(item.lesson_id)).sort((a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime()).slice(0, 4).map((item) => {
      const lesson = lessonById.get(item.lesson_id)!;
      const courseId = lessonCourse.get(item.lesson_id);
      return { title: lesson.title, courseTitle: courseTitleById.get(courseId || "") || "MLS learning", lastAccessedAt: item.last_accessed_at, percent: item.completion_percent };
    });
    setRecentActivity(activity);
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
        setProfile(null); setCourses([]); setEnrolled([]); setCompletedLessons(0); setCourseProgress({}); setOverallProgress(0); setRecentActivity([]);
      }
      setLoading(false);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (authMode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: window.location.origin + "/reset-password"
        });
        if (error) throw error;
        setMessage("If an account exists for this email, a password reset link has been sent. Check your inbox.");
      } else if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName.trim() } }
        });
        if (error) throw error;
        if (data.session) setMessage(t.welcomeMessage);
        else setMessage("Your account has been created. Check your email to confirm your address before signing in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
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
    <LandingPage
      language={language}
      languageControls={
        <div className="lb-language-controls">
          <label>{t.language}<select aria-label={t.language} value={language} onChange={(e) => { const value = e.target.value as SupportedLocale; preferenceChoice.current.language = value; setLanguage(value); }}><option value="en">EN</option><option value="fr">FR</option><option value="pt">PT</option><option value="ar">AR</option><option value="sw">SW</option><option value="es">ES</option></select></label>
          <label>{t.country}<select aria-label={t.country} value={countryCode} onChange={(e) => { preferenceChoice.current.countryCode = e.target.value; setCountryCode(e.target.value); }}>{countries.length ? countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>) : <option value="GH">Ghana</option>}</select></label>
        </div>
      }
    >
      <section className="auth-card lb-auth-card">
        <div className="eyebrow">{authMode === "signin" ? "YOUR LEARNING SPACE" : authMode === "signup" ? "START YOUR JOURNEY" : "ACCOUNT RECOVERY"}</div>
        <h2>{authMode === "signin" ? t.welcomeBack : authMode === "signup" ? t.createAccount : "Reset your password"}</h2>
        <p className="auth-subtitle">{authMode === "signin" ? t.continueLearning : authMode === "signup" ? t.joinCommunity : "Enter the email address linked to your account and we’ll send you a secure reset link."}</p>
        <form onSubmit={handleAuth} className="auth-form">
          {authMode === "signup" && <label>{t.fullName}<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required autoComplete="name" /></label>}
          <label>{t.email}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" /></label>
          {authMode !== "reset" && <label>{t.password}<span className="lb-password-field"><input type={passwordVisible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required autoComplete={authMode === "signin" ? "current-password" : "new-password"} /><button type="button" className="lb-password-toggle" onClick={() => setPasswordVisible((value) => !value)} aria-label={passwordVisible ? "Hide password" : "Show password"}>{passwordVisible ? "Hide" : "Show"}</button></span></label>}
          <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : authMode === "signin" ? t.signInToLabBridge + " →" : authMode === "signup" ? t.createAccount + " →" : "Send reset link →"}</button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        {authMode === "signin" && <button type="button" className="lb-forgot-link" onClick={() => { setAuthMode("reset"); setMessage(""); }}>Forgot your password?</button>}
        <p className="auth-switch">{authMode === "signin" ? "New to LabBridge?" : authMode === "signup" ? "Already have an account?" : "Remembered your password?"} <button type="button" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setMessage(""); }}>{authMode === "signin" ? "Create an account" : "Back to sign in"}</button></p>
        <p className="auth-legal">By continuing, you agree to use LabBridge as an educational resource. It does not replace supervised clinical training.</p>
      </section>
    </LandingPage>
  );

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Learner";
  const firstName = displayName.split(" ")[0];

  return <StudentDashboard
    firstName={firstName}
    email={user.email || ""}
    planCode={planCode}
    language={language}
    countryCode={countryCode}
    countries={countries}
    courses={courses}
    enrolled={enrolled}
    completedLessons={completedLessons}
    overallProgress={overallProgress}
    courseProgress={courseProgress}
    recentActivity={recentActivity}
    canCreateAcademicContent={canCreateAcademicContent}
    canReviewAcademicContent={canReviewAcademicContent}
    onLanguageChange={(value) => void savePreferences(value, countryCode)}
    onCountryChange={(value) => void savePreferences(language, value)}
    onSignOut={signOut}
  />;
}