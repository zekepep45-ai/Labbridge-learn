"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Review = {
  id: string; item_type: "course" | "module" | "lesson"; item_id: string;
  submitted_by: string; reviewer_id: string | null; status: "pending" | "approved" | "changes_requested" | "rejected";
  reviewer_comments: string | null; submitted_at: string; reviewed_at: string | null;
};
type ReviewItem = { id: string; title: string };

export default function AcademicReviewPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const { data, error } = await supabase.from("academic_content_reviews")
      .select("id,item_type,item_id,submitted_by,reviewer_id,status,reviewer_comments,submitted_at,reviewed_at")
      .order("submitted_at", { ascending: false });
    if (error) { setMessage("Could not load review queue: " + error.message); return; }
    const rows = (data ?? []) as Review[];
    setReviews(rows);
    const idsByType = {
      course: rows.filter((r) => r.item_type === "course").map((r) => r.item_id),
      module: rows.filter((r) => r.item_type === "module").map((r) => r.item_id),
      lesson: rows.filter((r) => r.item_type === "lesson").map((r) => r.item_id)
    };
    const [courseRows, moduleRows, lessonRows] = await Promise.all([
      idsByType.course.length ? supabase.from("courses").select("id,title").in("id", idsByType.course) : Promise.resolve({ data: [] }),
      idsByType.module.length ? supabase.from("course_modules").select("id,title").in("id", idsByType.module) : Promise.resolve({ data: [] }),
      idsByType.lesson.length ? supabase.from("lessons").select("id,title").in("id", idsByType.lesson) : Promise.resolve({ data: [] })
    ]);
    const next: Record<string, string> = {};
    for (const item of [...(courseRows.data ?? []), ...(moduleRows.data ?? []), ...(lessonRows.data ?? [])] as ReviewItem[]) next[item.id] = item.title;
    setTitles(next);
  }

  useEffect(() => {
    let active = true;
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setChecking(false); return; }
      const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id);
      if (!active) return;
      setUserId(auth.user.id);
      if (error) setMessage("Could not verify your academic role: " + error.message);
      const permitted = (roles ?? []).some((r) => ["admin", "academic_reviewer"].includes(r.role));
      setAllowed(permitted);
      if (permitted) await load();
      if (active) setChecking(false);
    }
    void init();
    return () => { active = false; };
  }, [supabase]);

  async function decide(review: Review, status: "approved" | "changes_requested" | "rejected") {
    const note = (comments[review.id] ?? "").trim();
    if (status !== "approved" && note.length < 10) {
      setMessage("Please provide at least 10 characters of feedback when requesting changes or rejecting content.");
      return;
    }
    setBusyId(review.id); setMessage("");
    const { error } = await supabase.from("academic_content_reviews").update({
      status, reviewer_id: userId, reviewer_comments: note || null, reviewed_at: new Date().toISOString()
    }).eq("id", review.id).eq("status", "pending");
    if (error) setMessage("Your decision was not saved: " + error.message);
    else { setMessage("Review decision saved."); await load(); }
    setBusyId("");
  }

  const visible = reviews.filter((r) => filter === "all" || r.status === "pending")
    .filter((r) => r.status !== "pending" || !r.reviewer_id || r.reviewer_id === userId);
  const pendingCount = reviews.filter((r) => r.status === "pending" && (!r.reviewer_id || r.reviewer_id === userId)).length;

  if (checking) return <main className="loading-screen"><div className="loading-mark">L<span>+</span></div><p>Opening the academic review centre…</p></main>;
  if (!allowed) return <main className="admin-page"><section className="admin-card academic-review-denied"><span className="admin-kicker">ACADEMIC QUALITY ASSURANCE</span><h1>Reviewer access required</h1><p>This workspace is reserved for authorised academic reviewers and administrators.</p><Link href="/">Return to learning dashboard →</Link></section></main>;

  return <main className="admin-page">
    <header className="admin-header"><Link href="/" className="brand"><span className="brand-mark">L<span>+</span></span><span className="brand-copy"><strong>LabBridge</strong><small>ACADEMIC REVIEW</small></span></Link><nav className="admin-header-links"><Link href="/admin">Content Studio →</Link><Link href="/">← Learning dashboard</Link></nav></header>
    <section className="admin-intro"><span className="admin-kicker">ACADEMIC QUALITY ASSURANCE</span><h1>Review with confidence.</h1><p>Evaluate submitted courses, modules and lessons for scientific accuracy, clarity, evidence and responsible clinical context before learners can access them.</p></section>
    <div className="admin-notice"><strong>Publication safeguard</strong><span>Approving a review does not automatically publish content. It records the academic decision and makes the content eligible for publication by an authorised content administrator.</span></div>
    <section className="academic-review-summary">
      <div><span>YOUR REVIEW QUEUE</span><strong>{pendingCount}</strong><small>Pending items available to review</small></div>
      <div><span>DECISIONS RECORDED</span><strong>{reviews.filter((r) => r.status !== "pending" && r.reviewer_id === userId).length}</strong><small>Reviewed by your account</small></div>
      <div><span>TOTAL SUBMISSIONS</span><strong>{reviews.length}</strong><small>Across the academic library</small></div>
    </section>
    <section className="admin-card academic-review-list">
      <div className="admin-card-head academic-review-head"><div><span>ACADEMIC REVIEW WORKFLOW</span><h2>Submission queue</h2></div><select value={filter} onChange={(e) => setFilter(e.target.value as "pending" | "all")}><option value="pending">Pending reviews</option><option value="all">All submissions</option></select></div>
      {message && <p className="admin-feedback" role="status">{message}</p>}
      {visible.length === 0 ? <div className="academic-review-empty"><span>✓</span><h3>You're all caught up</h3><p>There are no submissions in this view. New academic submissions will appear here.</p></div> :
        <div className="academic-review-items">{visible.map((review) => <article className="academic-review-item" key={review.id}>
          <div className="academic-review-item-top"><span className="academic-review-type">{review.item_type.toUpperCase()}</span><span className={"academic-review-status status-" + review.status}>{review.status.replace("_", " ")}</span></div>
          <h3>{titles[review.item_id] || "Content item " + review.item_id.slice(0, 8)}</h3>
          <p className="academic-review-meta">Submitted {new Date(review.submitted_at).toLocaleString()} · {review.reviewer_id ? "Assigned to a reviewer" : "Open to the review team"}</p>
          {review.reviewer_comments && <blockquote className="academic-review-comment">{review.reviewer_comments}</blockquote>}
          {review.status === "pending" && <div className="academic-review-actions">
            <label>Reviewer feedback<textarea rows={3} value={comments[review.id] ?? ""} onChange={(e) => setComments((current) => ({ ...current, [review.id]: e.target.value }))} placeholder="Record evidence-based feedback, corrections or approval notes…"/></label>
            <div><button disabled={busyId === review.id} onClick={() => void decide(review, "approved")}>Approve</button><button className="review-secondary" disabled={busyId === review.id} onClick={() => void decide(review, "changes_requested")}>Request changes</button><button className="review-danger" disabled={busyId === review.id} onClick={() => void decide(review, "rejected")}>Reject</button></div>
          </div>}
          {review.reviewed_at && <p className="academic-review-meta">Decision recorded {new Date(review.reviewed_at).toLocaleString()}</p>}
        </article>)}</div>}
    </section>
    <footer className="library-footer"><span>© 2026 LabBridge Learn</span><span>Academic quality before publication.</span></footer>
  </main>;
}
