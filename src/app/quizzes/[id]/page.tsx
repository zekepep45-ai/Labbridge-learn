"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Option = { key: string; text: string };
type Quiz = { id: string; course_id: string; title: string; description: string | null; question_count: number; pass_mark: number; time_limit_minutes: number | null; max_attempts: number | null };
type Question = { id: string; stem: string; options: Option[]; difficulty: string };
type Feedback = { question_id: string; selected_option: string; correct_option: string; is_correct: boolean; explanation: string; reference_text: string | null };
type Result = { attempt_id: string; score: number; total_points: number; percentage: number; passed: boolean; pass_mark: number; feedback: Feedback[] };

export default function QuizPage() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { window.location.href = "/"; return; }
      const { data: assessment, error } = await supabase.from("assessments")
        .select("id,course_id,title,description,question_count,pass_mark,time_limit_minutes,max_attempts")
        .eq("id", params.id).eq("status", "published").maybeSingle();
      if (error || !assessment) {
        if (active) { setMessage("This assessment is not available. It may still be under academic review."); setLoading(false); }
        return;
      }
      const { data: links } = await supabase.from("assessment_question_links")
        .select("question_id,position").eq("assessment_id", assessment.id).order("position");
      const ids = (links ?? []).map((item) => item.question_id);
      const { data: questionRows } = ids.length
        ? await supabase.from("assessment_questions").select("id,stem,options,difficulty").in("id", ids).eq("status", "published")
        : { data: [] as Question[] };
      const questionMap = new Map((questionRows ?? []).map((item) => [item.id, item as Question]));
      const ordered = ids.map((id) => questionMap.get(id)).filter(Boolean) as Question[];
      const [{ data: history }, { data: course }] = await Promise.all([
        supabase.from("assessment_attempts").select("id").eq("assessment_id", assessment.id),
        supabase.from("courses").select("title").eq("id", assessment.course_id).maybeSingle()
      ]);
      if (!active) return;
      setQuiz({ ...assessment, title: assessment.title, description: (assessment.description || (course?.title ? "Practice assessment for " + course.title : assessment.description)) });
      if (assessment.time_limit_minutes) setDeadlineMs(Date.now() + assessment.time_limit_minutes * 60 * 1000);
      setQuestions(ordered);
      setAttempts(history?.length ?? 0);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [params.id, supabase]);

  useEffect(() => {
    if (!deadlineMs || result) return;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) setMessage("The suggested exam time has ended. Submit your answers when ready; unanswered questions must still be completed.");
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [deadlineMs, result]);

  async function submit() {
    if (!quiz || questions.some((question) => !answers[question.id])) {
      setMessage("Please answer every question before submitting.");
      return;
    }
    setBusy(true); setMessage("");
    const payload = questions.map((question) => ({ question_id: question.id, selected_option: answers[question.id] }));
    const { data, error } = await supabase.rpc("submit_assessment", { p_assessment_id: quiz.id, p_answers: payload });
    if (error) setMessage("We couldn't submit your assessment: " + error.message);
    else {
      setResult(data as Result);
      setAttempts((count) => count + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setBusy(false);
  }

  if (loading) return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Preparing your assessment…</p></main>;
  if (!quiz) return <main className="quiz-page"><header className="admin-header"><Link href="/library" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></Link><Link href="/library">← Academic Library</Link></header><div className="quiz-empty"><h1>Assessment unavailable</h1><p>{message}</p><Link href="/library">Return to Academic Library →</Link></div></main>;

  return <main className="quiz-page">
    <header className="admin-header"><Link href="/library" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></Link><Link href="/library">← Academic Library</Link></header>
    <section className="quiz-hero"><span className="admin-kicker">PRACTICE ASSESSMENT</span><h1>{quiz.title}</h1><p>{quiz.description}</p><div className="quiz-meta"><span>{questions.length} questions</span><span>Pass mark: {quiz.pass_mark}%</span><span>Attempt {attempts + 1}{quiz.max_attempts ? " of " + quiz.max_attempts : ""}</span>{quiz.time_limit_minutes && <span>{quiz.time_limit_minutes} minutes</span>}{remainingSeconds !== null && <span className={remainingSeconds <= 60 ? "quiz-timer urgent" : "quiz-timer"}>Time remaining: {String(Math.floor(remainingSeconds / 60)).padStart(2,"0")}:{String(remainingSeconds % 60).padStart(2,"0")}</span>}</div></section>
    {result ? <section className="quiz-result">
      <div className="quiz-score"><span>{result.passed ? "ASSESSMENT PASSED" : "KEEP PRACTISING"}</span><strong>{result.percentage}%</strong><small>{result.score} / {result.total_points} points · Pass mark {result.pass_mark}%</small></div>
      <h2>Review your answers</h2><p className="quiz-result-intro">Read the explanations and references to strengthen your understanding.</p>
      {questions.map((question,index) => {
        const feedback = result.feedback.find((item) => item.question_id === question.id);
        const correctText = question.options.find((option) => option.key === feedback?.correct_option)?.text;
        const selectedText = question.options.find((option) => option.key === feedback?.selected_option)?.text;
        return <article className="quiz-review-card" key={question.id}>
          <div className="quiz-review-top"><span>QUESTION {String(index+1).padStart(2,"0")}</span><strong className={feedback?.is_correct ? "correct" : "incorrect"}>{feedback?.is_correct ? "Correct" : "Incorrect"}</strong></div>
          <h3>{question.stem}</h3><p><b>Your answer:</b> {feedback?.selected_option}. {selectedText}</p>
          {!feedback?.is_correct && <p><b>Best answer:</b> {feedback?.correct_option}. {correctText}</p>}
          <div className="quiz-explanation"><b>Explanation</b><p>{feedback?.explanation}</p>{feedback?.reference_text && <small>Reference: {feedback.reference_text}</small>}</div>
        </article>;
      })}
      <div className="quiz-result-actions"><Link href="/library">Return to Academic Library →</Link>{(!quiz.max_attempts || attempts < quiz.max_attempts) && <button className="primary-button" onClick={() => { setResult(null); setAnswers({}); setMessage(""); }}>Try again</button>}</div>
    </section> : <section className="quiz-questions">
      <div className="quiz-instructions"><strong>Before you begin</strong><p>Select one best answer for each question. Your score and explanations will appear after submission. You can review your choices before submitting. The countdown is a study aid; it does not automatically submit your answers.</p></div>
      {questions.map((question,index) => <article className="quiz-question-card" key={question.id}>
        <div className="quiz-question-heading"><span>QUESTION {String(index+1).padStart(2,"0")} / {questions.length}</span><small>{question.difficulty}</small></div>
        <h2>{question.stem}</h2>
        <div className="quiz-options">{question.options.map((option) => <label className={"quiz-option " + (answers[question.id] === option.key ? "selected" : "")} key={option.key}>
          <input type="radio" name={question.id} value={option.key} checked={answers[question.id] === option.key} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.key }))}/>
          <span className="quiz-option-key">{option.key}</span><span>{option.text}</span>
        </label>)}</div>
      </article>)}
      {message && <p className="quiz-message" role="alert">{message}</p>}
      <div className="quiz-submit-row"><span>{Object.keys(answers).length} of {questions.length} answered</span><button className="primary-button" disabled={busy || questions.length === 0} onClick={submit}>{busy ? "Submitting…" : "Submit assessment →"}</button></div>
    </section>}
    <footer className="admin-footer">LabBridge Learn · Learn. Practise. Apply.</footer>
  </main>;
}
