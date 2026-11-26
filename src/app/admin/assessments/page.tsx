"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Course = { id: string; title: string; status: string };
type Assessment = { id: string; course_id: string; title: string; slug: string; question_count: number; pass_mark: number; status: string };
type Question = { id: string; stem: string; difficulty: string; status: string };

export default function AssessmentStudioPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [title, setTitle] = useState("Foundations of Medical Laboratory Science — Knowledge Check");
  const [slug, setSlug] = useState("foundations-knowledge-check");
  const [description, setDescription] = useState("A practice assessment covering the core concepts in this course.");
  const [questionCount, setQuestionCount] = useState("10");
  const [passMark, setPassMark] = useState("70");
  const [stem, setStem] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [reference, setReference] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const [{ data: courseRows }, { data: assessmentRows }] = await Promise.all([
      supabase.from("courses").select("id,title,status").order("title"),
      supabase.from("assessments").select("id,course_id,title,slug,question_count,pass_mark,status").order("created_at", { ascending: false })
    ]);
    setCourses((courseRows ?? []) as Course[]);
    setAssessments((assessmentRows ?? []) as Assessment[]);
    if (!selectedCourse && courseRows?.length) setSelectedCourse(courseRows[0].id);
    if (!selectedAssessment && assessmentRows?.length) setSelectedAssessment(assessmentRows[0].id);
  }

  async function loadQuestions(assessmentId: string) {
    if (!assessmentId) { setQuestions([]); return; }
    const { data: links } = await supabase.from("assessment_question_links").select("question_id,position").eq("assessment_id", assessmentId).order("position");
    const ids = (links ?? []).map((item) => item.question_id);
    if (!ids.length) { setQuestions([]); return; }
    const { data } = await supabase.from("assessment_questions").select("id,stem,difficulty,status").in("id", ids);
    const map = new Map((data ?? []).map((item) => [item.id, item]));
    setQuestions(ids.map((id) => map.get(id)).filter(Boolean) as Question[]);
  }

  useEffect(() => {
    let active = true;
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setChecking(false); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id);
      const canManage = (roles ?? []).some((item) => item.role === "admin" || item.role === "content_editor");
      if (active && canManage) { setAllowed(true); await load(); }
      if (active) setChecking(false);
    }
    void init();
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => { if (selectedAssessment) void loadQuestions(selectedAssessment); }, [selectedAssessment]);

  async function createAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourse) return;
    setBusy(true); setMessage("");
    const { data, error } = await supabase.from("assessments").insert({
      course_id: selectedCourse, title: title.trim(), slug: slug.trim().toLowerCase(),
      description: description.trim(), question_count: Number(questionCount), pass_mark: Number(passMark),
      assessment_type: "practice_quiz", status: "draft"
    }).select("id").single();
    if (error) setMessage("Assessment not saved: " + error.message);
    else {
      await load();
      if (data) setSelectedAssessment(data.id);
      setMessage("Draft assessment created. Add questions below.");
    }
    setBusy(false);
  }

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const assessment = assessments.find((item) => item.id === selectedAssessment);
    if (!assessment) return;
    const usableOptions = options.map((text, index) => ({ key: String.fromCharCode(65 + index), text: text.trim() })).filter((item) => item.text);
    if (usableOptions.length < 2 || !usableOptions.some((item) => item.key === answer)) {
      setMessage("Enter at least two options and choose a correct option that exists.");
      return;
    }
    setBusy(true); setMessage("");
    const { data, error } = await supabase.from("assessment_questions").insert({
      course_id: assessment.course_id, stem: stem.trim(), options: usableOptions,
      answer_key: answer, explanation: explanation.trim(), difficulty,
      reference_text: reference.trim(), status: "draft"
    }).select("id").single();
    if (error) setMessage("Question not saved: " + error.message);
    else if (data) {
      const { error: linkError } = await supabase.from("assessment_question_links").insert({
        assessment_id: assessment.id, question_id: data.id, position: questions.length + 1, points: 1
      });
      if (linkError) setMessage("Question created but could not be attached: " + linkError.message);
      else {
        setStem(""); setOptions(["", "", "", ""]); setAnswer("A"); setExplanation(""); setReference("");
        await loadQuestions(assessment.id);
        setMessage("Draft question added to the assessment.");
      }
    }
    setBusy(false);
  }

  async function publishAssessment() {
    const assessment = assessments.find((item) => item.id === selectedAssessment);
    if (!assessment || !reviewConfirmed) { setMessage("Confirm academic review before publishing."); return; }
    if (questions.length < assessment.question_count) {
      setMessage("Add at least " + assessment.question_count + " questions before publishing.");
      return;
    }
    setBusy(true); setMessage("");
    const ids = questions.map((item) => item.id);
    const questionResult = await supabase.from("assessment_questions").update({ status: "published" }).in("id", ids);
    if (questionResult.error) { setMessage("Could not publish questions: " + questionResult.error.message); setBusy(false); return; }
    const assessmentResult = await supabase.from("assessments").update({ status: "published" }).eq("id", assessment.id);
    if (assessmentResult.error) setMessage("Questions published but assessment publication failed: " + assessmentResult.error.message);
    else { setMessage("Assessment published. It will appear to learners when its course is published."); setReviewConfirmed(false); await load(); }
    setBusy(false);
  }

  if (checking) return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Checking assessment studio access…</p></main>;
  if (!allowed) return <main className="admin-page"><div className="admin-card"><h1>Access restricted</h1><p>Sign in with an authorised administrator or content-editor account.</p><Link href="/">Return to dashboard →</Link></div></main>;

  const activeAssessment = assessments.find((item) => item.id === selectedAssessment);
  return <main className="admin-page">
    <header className="admin-header"><Link href="/admin" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>ASSESSMENT STUDIO</small></span></Link><Link href="/admin">← Content Studio</Link></header>
    <section className="admin-intro"><span className="admin-kicker">ASSESSMENT AUTHORING WORKSPACE</span><h1>Build assessments that test understanding.</h1><p>Create single-best-answer questions, attach explanations and references, and publish only after academic review.</p></section>
    <div className="admin-notice"><strong>Academic review is required</strong><span>Check scientific accuracy, ensure one defensible best answer, verify every distractor and explanation, and confirm the reference before publishing. New questions and assessments remain drafts by default.</span></div>
    <div className="admin-grid">
      <section className="admin-card"><div className="admin-card-head"><span>01 / ASSESSMENT</span><h2>Create a quiz</h2></div><form className="admin-form" onSubmit={createAssessment}>
        <label>Course<select required value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}><option value="">Choose a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title} · {course.status}</option>)}</select></label>
        <label>Assessment title<input required value={title} onChange={(e) => setTitle(e.target.value)}/></label>
        <label>URL slug<input required value={slug} onChange={(e) => setSlug(e.target.value)}/></label>
        <label>Description<textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}/></label>
        <div className="admin-form-row"><label>Question count<input type="number" min="1" value={questionCount} onChange={(e) => setQuestionCount(e.target.value)}/></label><label>Pass mark (%)<input type="number" min="1" max="100" value={passMark} onChange={(e) => setPassMark(e.target.value)}/></label></div>
        <button className="primary-button" disabled={busy || !selectedCourse}>Save draft assessment →</button>
      </form></section>
      <section className="admin-card"><div className="admin-card-head"><span>02 / QUESTION BANK</span><h2>Add a question</h2></div><form className="admin-form" onSubmit={addQuestion}>
        <label>Assessment<select required value={selectedAssessment} onChange={(e) => setSelectedAssessment(e.target.value)}><option value="">Choose an assessment</option>{assessments.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.status}</option>)}</select></label>
        <label>Question stem<textarea required rows={3} value={stem} onChange={(e) => setStem(e.target.value)} placeholder="Write a clear, clinically accurate question."/></label>
        {options.map((value, index) => <label key={index}>Option {String.fromCharCode(65 + index)}<input value={value} onChange={(e) => setOptions((items) => items.map((item, i) => i === index ? e.target.value : item))} placeholder={"Enter option " + String.fromCharCode(65 + index)}/></label>)}
        <div className="admin-form-row"><label>Correct answer<select value={answer} onChange={(e) => setAnswer(e.target.value)}>{["A","B","C","D"].map((key) => <option key={key} value={key}>{key}</option>)}</select></label><label>Difficulty<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label></div>
        <label>Explanation<textarea required rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Explain why the best answer is correct."/></label>
        <label>Reference<input required value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Guideline, textbook, standard or DOI"/></label>
        <button className="primary-button" disabled={busy || !selectedAssessment}>Add draft question →</button>
      </form></section>
      <section className="admin-card admin-card-wide"><div className="admin-card-head"><span>03 / REVIEW & PUBLISH</span><h2>Assessment readiness</h2></div>
        <div className="content-outline"><div><span>ASSESSMENT</span><strong>{activeAssessment?.title || "Choose an assessment"}</strong><small>{activeAssessment?.status.toUpperCase() || "NOT SELECTED"}</small></div><div className="outline-child"><span>QUESTION BANK</span><strong>{questions.length} of {activeAssessment?.question_count ?? 0} questions added</strong>{questions.map((item,index) => <p key={item.id}>{String(index+1).padStart(2,"0")} · {item.stem} <small>{item.status.toUpperCase()} · {item.difficulty}</small></p>)}</div></div>
        <div className="publish-check" style={{marginTop:16}}><p>Publishing makes this quiz available to learners once its parent course is published. Verify the question, answer, explanation and reference for every item.</p><label className="review-check"><input type="checkbox" checked={reviewConfirmed} onChange={(e) => setReviewConfirmed(e.target.checked)}/> I confirm that every question has completed academic review.</label><button className="primary-button" disabled={busy || !activeAssessment || activeAssessment.status === "published" || !reviewConfirmed} onClick={publishAssessment}>Publish assessment ↗</button></div>
      </section>
    </div>
    {message && <p className="admin-feedback" role="status">{message}</p>}
    <footer className="admin-footer">LabBridge Learn · Assessment Studio</footer>
  </main>;
}
