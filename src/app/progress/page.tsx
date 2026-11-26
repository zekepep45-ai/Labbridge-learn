"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Attempt = { id: string; assessment_id: string; score: number; total_points: number; percentage: number; passed: boolean; status: string; started_at: string; submitted_at: string | null };
type Assessment = { id: string; title: string; course_id: string };
type Course = { id: string; title: string };
type Response = { attempt_id: string; question_id: string; is_correct: boolean };
type Question = { id: string; stem: string; tags: string[] | null };
type PracticalAttempt = { id: string; simulation_slug: string; score: number; correct_count: number; total_stations: number; completed_at: string };

export default function LearningProgressPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [assessments, setAssessments] = useState<Record<string, Assessment>>({});
  const [courses, setCourses] = useState<Record<string, Course>>({});
  const [topicStats, setTopicStats] = useState<{ topic: string; correct: number; total: number }[]>([]);
  const [practicalAttempts, setPracticalAttempts] = useState<PracticalAttempt[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { window.location.href = "/"; return; }
      const { data: attemptRows, error: attemptError } = await supabase
        .from("assessment_attempts")
        .select("id,assessment_id,score,total_points,percentage,passed,status,started_at,submitted_at")
        .eq("user_id", auth.user.id)
        .eq("status", "graded")
        .order("submitted_at", { ascending: false });
      if (attemptError) { if (active) { setError(attemptError.message); setLoading(false); } return; }
      const rows = (attemptRows ?? []) as Attempt[];
      const { data: practicalRows, error: practicalError } = await supabase
        .from("virtual_lab_attempts")
        .select("id,simulation_slug,score,correct_count,total_stations,completed_at")
        .eq("user_id", auth.user.id)
        .order("completed_at", { ascending: false });
      if (practicalError) { if (active) { setError(practicalError.message); setLoading(false); } return; }
      const assessmentIds = Array.from(new Set(rows.map((row) => row.assessment_id)));
      const { data: assessmentRows } = assessmentIds.length
        ? await supabase.from("assessments").select("id,title,course_id").in("id", assessmentIds)
        : { data: [] as Assessment[] };
      const assessmentMap = Object.fromEntries(((assessmentRows ?? []) as Assessment[]).map((row) => [row.id, row]));
      const courseIds = Array.from(new Set(((assessmentRows ?? []) as Assessment[]).map((row) => row.course_id)));
      const { data: courseRows } = courseIds.length
        ? await supabase.from("courses").select("id,title").in("id", courseIds)
        : { data: [] as Course[] };
      const courseMap = Object.fromEntries(((courseRows ?? []) as Course[]).map((row) => [row.id, row]));
      const attemptIds = rows.map((row) => row.id);
      const { data: responseRows } = attemptIds.length
        ? await supabase.from("assessment_responses").select("attempt_id,question_id,is_correct").in("attempt_id", attemptIds)
        : { data: [] as Response[] };
      const responses = (responseRows ?? []) as Response[];
      const questionIds = Array.from(new Set(responses.map((row) => row.question_id)));
      const { data: questionRows } = questionIds.length
        ? await supabase.from("assessment_questions").select("id,stem,tags").in("id", questionIds)
        : { data: [] as Question[] };
      const questionMap = new Map(((questionRows ?? []) as Question[]).map((row) => [row.id, row]));
      const topicMap = new Map<string, { correct: number; total: number }>();
      for (const response of responses) {
        const question = questionMap.get(response.question_id);
        const tags = question?.tags?.length ? question.tags : ["General MLS knowledge"];
        for (const tag of tags) {
          const current = topicMap.get(tag) ?? { correct: 0, total: 0 };
          current.total += 1;
          if (response.is_correct) current.correct += 1;
          topicMap.set(tag, current);
        }
      }
      if (!active) return;
      setAttempts(rows);
      setPracticalAttempts((practicalRows ?? []) as PracticalAttempt[]);
      setAssessments(assessmentMap);
      setCourses(courseMap);
      setTopicStats(Array.from(topicMap.entries()).map(([topic, value]) => ({ topic, ...value })).sort((a, b) => a.correct / a.total - b.correct / b.total));
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [supabase]);

  if (loading) return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Loading your learning progress…</p></main>;

  const average = attempts.length ? Math.round(attempts.reduce((sum, row) => sum + Number(row.percentage || 0), 0) / attempts.length) : 0;
  const passed = attempts.filter((row) => row.passed).length;
  const best = attempts.length ? Math.max(...attempts.map((row) => Number(row.percentage || 0))) : 0;
  const weakest = topicStats.filter((row) => row.total >= 2).slice(0, 3);
  const practicalAverage = practicalAttempts.length ? Math.round(practicalAttempts.reduce((sum, row) => sum + row.score, 0) / practicalAttempts.length) : 0;
  const practicalBest = practicalAttempts.length ? Math.max(...practicalAttempts.map(row => row.score)) : 0;
  const milestones = [
    { title: "First assessment", detail: "Complete your first graded assessment", earned: attempts.length >= 1, icon: "✎" },
    { title: "Assessment explorer", detail: "Complete five graded assessments", earned: attempts.length >= 5, icon: "◎" },
    { title: "Practical learner", detail: "Complete your first virtual lab", earned: practicalAttempts.length >= 1, icon: "⚗" },
    { title: "Lab regular", detail: "Complete five virtual lab simulations", earned: practicalAttempts.length >= 5, icon: "✳" },
    { title: "High achiever", detail: "Score 80% or higher in an assessment", earned: attempts.some(row => Number(row.percentage) >= 80), icon: "★" },
    { title: "Practical excellence", detail: "Score 80% or higher in a simulation", earned: practicalAttempts.some(row => row.score >= 80), icon: "🏅" }
  ];
  const earnedMilestones = milestones.filter(item => item.earned).length;

  return <main className="progress-page">
    <header className="admin-header">
      <Link href="/" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>LEARN</small></span></Link>
      <nav className="progress-nav"><Link href="/">← Dashboard</Link><Link href="/library">Academic Library</Link></nav>
    </header>
    <section className="progress-hero">
      <span className="admin-kicker">YOUR LEARNING ANALYTICS</span>
      <h1>Measure your progress.<br/><em>Strengthen your knowledge.</em></h1>
      <p>Review your assessment results, see where you are improving, and identify the topics that deserve another study session.</p>
    </section>
    {error && <p className="quiz-message">{error}</p>}
    <section className="progress-stat-grid">
      <article className="progress-stat"><span>COMPLETED ATTEMPTS</span><strong>{attempts.length}</strong><small>Graded assessments</small></article>
      <article className="progress-stat"><span>AVERAGE SCORE</span><strong>{average}%</strong><small>Across all completed attempts</small></article>
      <article className="progress-stat"><span>ASSESSMENTS PASSED</span><strong>{passed}</strong><small>{attempts.length ? Math.round(passed / attempts.length * 100) : 0}% pass rate</small></article>
      <article className="progress-stat"><span>PERSONAL BEST</span><strong>{best}%</strong><small>Highest assessment score</small></article>
    </section>
    <section className="progress-stat-grid progress-practical-stats">
      <article className="progress-stat"><span>PRACTICAL SESSIONS</span><strong>{practicalAttempts.length}</strong><small>Completed simulations</small></article>
      <article className="progress-stat"><span>PRACTICAL AVERAGE</span><strong>{practicalAverage}%</strong><small>Across completed simulations</small></article>
      <article className="progress-stat"><span>PRACTICAL BEST</span><strong>{practicalBest}%</strong><small>Highest simulation score</small></article>
      <article className="progress-stat"><span>ACHIEVEMENTS</span><strong>{earnedMilestones}/{milestones.length}</strong><small>Learning milestones earned</small></article>
    </section>
    <section className="progress-panel progress-achievements">
      <div className="section-heading compact"><div><div className="eyebrow">YOUR MILESTONES</div><h2>Achievements</h2></div><span className="progress-count">{earnedMilestones} of {milestones.length} earned</span></div>
      <div className="achievement-grid">{milestones.map(item=><article className={"achievement-card "+(item.earned?"earned":"locked")} key={item.title}><span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><b>{item.earned?"EARNED":"LOCKED"}</b></article>)}</div>
    </section>
    <section className="progress-content-grid">
      <div className="progress-panel">
        <div className="section-heading compact"><div><div className="eyebrow">ASSESSMENT HISTORY</div><h2>Your results</h2></div><span className="progress-count">{attempts.length} attempts</span></div>
        {attempts.length === 0 ? <div className="progress-empty"><span>◎</span><h3>Your learning record starts here</h3><p>Complete a published assessment to see your scores, results and learning trends in this space.</p><Link href="/library">Explore the Academic Library →</Link></div> :
          <div className="progress-history">{attempts.map((attempt) => {
            const assessment = assessments[attempt.assessment_id];
            const course = assessment ? courses[assessment.course_id] : null;
            return <article className="progress-history-row" key={attempt.id}>
              <div className="progress-history-icon">{attempt.passed ? "✓" : "↗"}</div>
              <div className="progress-history-main"><strong>{assessment?.title || "Assessment"}</strong><small>{course?.title || "Medical Laboratory Science"} · {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : "Submitted"}</small></div>
              <div className="progress-history-score"><strong>{Number(attempt.percentage).toFixed(0)}%</strong><span className={attempt.passed ? "passed" : "needs-work"}>{attempt.passed ? "PASSED" : "KEEP PRACTISING"}</span></div>
            </article>;
          })}</div>}
      </div>
      <aside className="progress-panel progress-topics">
        <div className="eyebrow">PERSONALISED STUDY FOCUS</div><h2>Topics to revisit</h2>
        <p className="progress-topic-intro">Based on your submitted answers. Topic insights become more useful as you complete more assessments.</p>
        {weakest.length ? weakest.map((topic) => <div className="topic-performance" key={topic.topic}><div><strong>{topic.topic}</strong><span>{topic.correct}/{topic.total} correct</span></div><div className="progress-track"><span style={{ width: Math.round(topic.correct / topic.total * 100) + "%" }}/></div></div>) : <div className="progress-empty compact-empty"><span>✳</span><p>Complete more questions with topic tags to unlock targeted study recommendations.</p></div>}
        <Link href="/library" className="progress-study-link">Continue studying →</Link>
      </aside>
    </section>
    <section className="progress-panel" style={{ marginTop: 24 }}>
      <div className="section-heading compact"><div><div className="eyebrow">VIRTUAL LABORATORY</div><h2>Your practical sessions</h2></div><span className="progress-count">{practicalAttempts.length} completed</span></div>
      {practicalAttempts.length === 0 ? <div className="progress-empty"><span>⚗</span><h3>No practical sessions yet</h3><p>Complete a virtual laboratory simulation to build your practical learning record.</p><Link href="/virtual-lab">Enter the Virtual Laboratory →</Link></div> :
        <div className="progress-history">{practicalAttempts.map((attempt) => <article className="progress-history-row" key={attempt.id}>
          <div className="progress-history-icon">⚗</div>
          <div className="progress-history-main"><strong>{({"haematology-cbc":"Haematology: CBC Interpretation","clinical-biochemistry":"Clinical Biochemistry","microbiology":"Medical Microbiology","parasitology":"Parasitology","specimen-reception":"Specimen Reception & Acceptance"} as Record<string,string>)[attempt.simulation_slug] || "Virtual Laboratory Simulation"}</strong><small>{attempt.correct_count} of {attempt.total_stations} stations correct · {new Date(attempt.completed_at).toLocaleDateString()}</small></div>
          <div className="progress-history-score"><strong>{attempt.score}%</strong><span className="passed">PRACTICE RESULT</span></div>
        </article>)}</div>}
      <Link href="/virtual-lab" className="progress-study-link">Practise another simulation →</Link>
    </section>
    <footer className="admin-footer">LabBridge Learn · Learn. Practise. Advance.</footer>
  </main>;
}
